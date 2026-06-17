import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IntakePayload } from '$lib/types/intake';
import {
  getServiceTitanConfig,
  ServiceTitanError,
  submitIntakeToServiceTitan,
  type BookingFeeContext
} from '$lib/server/servicetitan';
import { publicOrigin, savePhotos } from '$lib/server/photoStorage';
import { resolveFee } from '$lib/server/zoneFee';
import { captureIntent, cancelIntent, getIntent, isStripeConfigured } from '$lib/server/payments/stripe';

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

  if (
    !issueDetails ||
    !isNonEmptyString(issueDetails.description) ||
    !isNonEmptyString(issueDetails.happenedAt)
  ) {
    return 'issueDetails fields are required';
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

  // Resolve the on-site charge for this ZIP + job type (fails soft to $0 + flag).
  const fee = await resolveFee(payload.address.zip, payload.selectedJobType.name);
  const mustCollect = fee.serviced && fee.osc > 0 && isStripeConfigured();

  // Verify the Stripe authorization BEFORE booking. The amount is taken from the
  // zone map here (server-authoritative) — never from the client.
  let authorizedIntentId: string | null = null;
  if (mustCollect) {
    const intentId = (payload.paymentIntentId ?? '').trim();
    if (!intentId) {
      return json(
        { success: false, error: 'Payment is required for this service. Please complete payment and try again.' },
        { status: 402 }
      );
    }
    let intent;
    try {
      intent = await getIntent(intentId);
    } catch (verifyError) {
      console.error('[api/intake] could not retrieve payment intent', verifyError);
      return json({ success: false, error: 'We could not verify your payment. Please try again.' }, { status: 502 });
    }
    const expectedCents = fee.osc * 100;
    if (intent.status !== 'requires_capture' || intent.amount !== expectedCents || intent.currency !== fee.currency) {
      console.warn('[api/intake] payment intent mismatch', {
        status: intent.status,
        amount: intent.amount,
        expectedCents,
        currency: intent.currency
      });
      return json(
        { success: false, error: 'Your payment could not be confirmed. Please re-enter your card details.' },
        { status: 402 }
      );
    }
    authorizedIntentId = intentId;
  }

  const feeCtx: BookingFeeContext = {
    osc: fee.osc,
    serviced: fee.serviced,
    zoneId: fee.zoneId,
    zoneName: fee.zoneName,
    paid: authorizedIntentId !== null,
    paymentIntentId: authorizedIntentId,
    flag: fee.flag
  };

  const config = getServiceTitanConfig();

  // Create the booking (real or, when ServiceTitan isn't configured, a mock
  // confirmation so the wizard works end-to-end in dev). Capture the payment
  // only on success; release the authorization hold on failure so a customer is
  // never charged without a booking.
  let confirmation: { confirmationNumber: string; extra: Record<string, unknown> };
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
  if (authorizedIntentId) {
    try {
      await captureIntent(authorizedIntentId);
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

  return json({
    success: true,
    confirmationNumber: confirmation.confirmationNumber,
    ...confirmation.extra,
    ...(authorizedIntentId
      ? { paid: { amount: fee.osc, currency: fee.currency, paymentIntentId: authorizedIntentId } }
      : {})
  });
};
