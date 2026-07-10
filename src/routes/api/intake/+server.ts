import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IntakePayload } from '$lib/types/intake';
import {
  getServiceTitanConfig,
  ServiceTitanError,
  submitIntakeToServiceTitan,
  customerTypeForPropertyType,
  type BookingFeeContext
} from '$lib/server/servicetitan';
import { publicOrigin, savePhotos } from '$lib/server/photoStorage';
import { resolveFee } from '$lib/server/zoneFee';
import { resolveBusinessUnitId } from '$lib/server/servicetitan/businessUnits';
import { captureIntent, cancelIntent, getIntent } from '$lib/server/payments/stripe';
import { lookupWaSalesTax, taxAmountOn } from '$lib/server/waTax';
import { registerDeferredOsc } from '$lib/server/oscRegister';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validate(payload: IntakePayload): string | null {
  if (!payload || typeof payload !== 'object') return 'Missing payload';

  if (!payload.selectedJobType || !isNonEmptyString(payload.selectedJobType.name)) {
    return 'selectedJobType.name is required';
  }

  const { customer, address, issueDetails } = payload;

  if (
    !customer ||
    !isNonEmptyString(customer.firstName) ||
    !isNonEmptyString(customer.lastName) ||
    !isNonEmptyString(customer.phone) ||
    !isNonEmptyString(customer.email)
  ) {
    return 'customer fields are required';
  }

  if (
    !address ||
    !isNonEmptyString(address.street) ||
    !isNonEmptyString(address.city) ||
    !isNonEmptyString(address.state) ||
    !isNonEmptyString(address.zip)
  ) {
    return 'address fields are required';
  }

  // issueDetails must be present (photo storage + the ServiceTitan mapper read
  // its nested fields), but the individual fields are optional by design — the
  // intake form and the mapper both treat description/happenedAt as optional.
  if (!issueDetails || typeof issueDetails !== 'object') {
    return 'issueDetails is required';
  }

  return null;
}

function mockConfirmationNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GLASS-${random}`;
}

export const POST: RequestHandler = async ({ request, url }) => {
  let payload: IntakePayload;
  try {
    payload = (await request.json()) as IntakePayload;
  } catch {
    throw error(400, 'Invalid JSON payload');
  }

  const validationError = validate(payload);
  if (validationError) {
    return json({ success: false, error: validationError }, { status: 400 });
  }

  // Persist photos to local storage (Railway volume in prod) and build the
  // public URLs that go in the booking summary. Best-effort: a storage
  // failure should not block the booking itself.
  let photoUrls: string[] = [];
  try {
    const stored = await savePhotos(payload.issueDetails.photos, publicOrigin(url.origin));
    photoUrls = stored.map((photo) => photo.url);
  } catch (storageError) {
    console.error('[api/intake] photo storage failed — continuing without links', storageError);
  }

  // Resolve the on-site charge + the ZIP's market from the zone map (fails soft
  // to $0 + flag). The business unit is derived locally from the market +
  // customer type + whether it's interior/architectural-glass or a remote
  // consultation (which routes to the market's Remote Consultation & Sales BU).
  const customerType = customerTypeForPropertyType(payload.propertyType);
  const interior = payload.selectedJobType.category === 'shower-mirror';
  const fee = await resolveFee(payload.address.zip, payload.selectedJobType.name);
  const feeDue = fee.serviced && fee.osc > 0;
  // Customer opted into a remote consultation: the OSC is WAIVED until we roll a
  // truck, so nothing is collected online now and the booking notes say so.
  const remoteConsult = feeDue && payload.remoteConsult === true;
  const businessUnitId = resolveBusinessUnitId(fee.market, customerType, interior, remoteConsult);
  // Customer chose "Pay later" at the charge step: book unpaid and hand the OSC to
  // GlassReports, which texts a Stripe link once the booking converts to a job.
  // (Remote-consult takes precedence — there's no charge to defer.)
  const deferred = feeDue && !remoteConsult && payload.payLater === true;

  // Online collection is BEST-EFFORT and must never block a lead. If the customer
  // authorized a card hold at review, verify it (amount taken from the zone map —
  // server-authoritative, never the client) and capture it on booking. If they
  // didn't — online payment was unavailable/degraded at review — book anyway and
  // let the office collect the OSC at scheduling.
  let authorizedIntentId: string | null = null;
  /** Dollars actually authorized (base OSC + sales tax when quoted). */
  let authorizedTotal: number | null = null;
  const intentId = (payload.paymentIntentId ?? '').trim();
  if (feeDue && !remoteConsult && intentId) {
    let intent;
    try {
      intent = await getIntent(intentId);
    } catch (verifyError) {
      console.error('[api/intake] could not retrieve payment intent', verifyError);
      return json({ success: false, error: 'We could not verify your payment. Please try again.' }, { status: 502 });
    }
    // The intent was created for base OSC + WA sales tax (same DOR lookup, cached
    // so both calls see the same rate). Accept the tax-inclusive total, or the
    // bare base for intents created while the tax lookup was degraded.
    const tax = await lookupWaSalesTax({ street: payload.address.street, city: payload.address.city, zip: payload.address.zip });
    const expectedTotalCents = Math.round((fee.osc + taxAmountOn(fee.osc, tax)) * 100);
    const baseCents = Math.round(fee.osc * 100);
    const amountOk = intent.amount === expectedTotalCents || intent.amount === baseCents;
    if (intent.status !== 'requires_capture' || !amountOk || intent.currency !== fee.currency) {
      console.warn('[api/intake] payment intent mismatch', {
        status: intent.status,
        amount: intent.amount,
        expectedTotalCents,
        baseCents,
        currency: intent.currency
      });
      return json(
        { success: false, error: 'Your payment could not be confirmed. Please re-enter your card details.' },
        { status: 402 }
      );
    }
    authorizedIntentId = intentId;
    authorizedTotal = intent.amount / 100;
  } else if (feeDue && remoteConsult) {
    // OSC waived for a remote consultation — book unpaid; the charge only applies
    // if/when a truck is rolled after the virtual review.
    console.log('[api/intake] remote consultation — OSC waived; booking unpaid', {
      osc: fee.osc,
      zip: payload.address.zip
    });
  } else if (feeDue) {
    // OSC due but nothing was authorized online — book unpaid; the office collects
    // at scheduling. (Mirrors the "we'll collect when scheduling" message the
    // customer sees when Stripe is unavailable/degraded.)
    console.warn('[api/intake] OSC due but no paymentIntentId — booking unpaid; office collects at scheduling', {
      osc: fee.osc,
      zip: payload.address.zip
    });
  }

  const feeCtx: BookingFeeContext = {
    osc: fee.osc,
    serviced: fee.serviced,
    zoneId: fee.zoneId,
    zoneName: fee.zoneName,
    paid: authorizedIntentId !== null,
    paymentIntentId: authorizedIntentId,
    paidTotal: authorizedTotal,
    flag: fee.flag,
    businessUnitId,
    deferred,
    remoteConsult
  };

  const config = getServiceTitanConfig();

  // Create the booking (real or, when ServiceTitan isn't configured, a mock
  // confirmation so the wizard works end-to-end in dev). Capture the payment
  // only on success; release the authorization hold on failure so a customer is
  // never charged without a booking.
  let confirmation: { confirmationNumber: string; extra: Record<string, unknown> };
  let booked: { bookingId: number; externalId: string } | null = null;
  try {
    if (!config) {
      console.log('[api/intake] ServiceTitan not configured — returning mock confirmation', {
        jobType: payload.selectedJobType.name,
        osc: fee.osc,
        willCapture: authorizedIntentId !== null
      });
      confirmation = { confirmationNumber: mockConfirmationNumber(), extra: { mock: true, photoUrls } };
    } else {
      const result = await submitIntakeToServiceTitan(config, payload, photoUrls, feeCtx);
      console.log('[api/intake] ServiceTitan booking created', result);
      booked = result;
      confirmation = {
        confirmationNumber: `GLASS-${result.bookingId}`,
        extra: {
          serviceTitan: { environment: config.environment, bookingId: result.bookingId, externalId: result.externalId }
        }
      };
    }
  } catch (err) {
    if (authorizedIntentId) await cancelIntent(authorizedIntentId); // release the hold — no booking
    if (err instanceof ServiceTitanError) {
      // RFC 7807 problem-details surface (title + traceId + errors{} + ErrorCode).
      // traceId is what ServiceTitan support asks for when you open a ticket.
      console.error('[api/intake] ServiceTitan error', {
        message: err.message,
        status: err.status,
        title: err.problem.title,
        traceId: err.problem.traceId,
        errorCode: err.problem.errorCode,
        errors: err.problem.errors
      });
      return json(
        {
          success: false,
          error: 'Unable to submit your request to our scheduling system. Please call us directly.'
        },
        { status: 502 }
      );
    }
    console.error('[api/intake] unexpected error', err);
    throw error(500, 'Internal error submitting intake');
  }

  // Booking succeeded — capture the authorized charge.
  let captured = false;
  if (authorizedIntentId) {
    try {
      await captureIntent(authorizedIntentId);
      captured = true;
    } catch (captureError) {
      // Rare: booking exists but capture failed. Don't fail the customer — the
      // office can collect at scheduling; log loudly for follow-up.
      console.error('[api/intake] payment capture FAILED after booking was created', {
        paymentIntentId: authorizedIntentId,
        confirmation: confirmation.confirmationNumber,
        captureError
      });
    }
  }

  // Pay now: register the CAPTURED payment with GlassReports so its reconciler
  // links the eventual ServiceTitan job, aligns the invoice, and surfaces the
  // money on the Unapplied Stripe payments dashboard. Best-effort.
  if (captured && booked) {
    await registerDeferredOsc({
      externalId: booked.externalId,
      bookingId: booked.bookingId,
      amount: fee.osc,
      currency: fee.currency,
      zip: payload.address.zip,
      jobTypeId: fee.jobTypeId,
      jobTypeName: payload.selectedJobType.name,
      customerName: `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
      phone: payload.customer.phone,
      paid: true,
      chargedAmount: authorizedTotal,
      paymentRef: authorizedIntentId
    });
  }

  // Pay later: hand the deferred OSC to GlassReports so it texts the Stripe link
  // once this booking converts to a scheduled job. Best-effort — the booking is
  // already created, and the summary carries the PAY LATER note as a fallback.
  if (deferred && booked) {
    await registerDeferredOsc({
      externalId: booked.externalId,
      bookingId: booked.bookingId,
      amount: fee.osc,
      currency: fee.currency,
      zip: payload.address.zip,
      jobTypeId: fee.jobTypeId,
      jobTypeName: payload.selectedJobType.name,
      customerName: `${payload.customer.firstName} ${payload.customer.lastName}`.trim(),
      phone: payload.customer.phone
    });
  }

  return json({
    success: true,
    confirmationNumber: confirmation.confirmationNumber,
    ...confirmation.extra,
    ...(authorizedIntentId
      ? { paid: { amount: authorizedTotal ?? fee.osc, currency: fee.currency, paymentIntentId: authorizedIntentId } }
      : {})
  });
};
