import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';
import { resolveFee } from '$lib/server/zoneFee';
import { lookupWaSalesTax, taxAmountOn } from '$lib/server/waTax';
import { getJobType } from '$lib/data/jobTypes';
import { createAuthorization, findOrCreateCustomer, getPublishableKey, isStripeConfigured, classifyStripeError, getStripeMode } from '$lib/server/payments/stripe';

/** Operators flip PAYMENT_DEBUG=true (Railway var) to surface the precise failure
 *  reason in the API response + intake UI while diagnosing; off for customers. */
function paymentDebugEnabled(): boolean {
  const v = env.PAYMENT_DEBUG?.trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

/**
 * POST /api/payment/intent { zip, jobTypeName }
 *
 * Re-resolves the fee server-side (authoritative — the amount is never taken
 * from the client) and, when a charge is due and Stripe is configured, creates a
 * manual-capture PaymentIntent (an authorization hold) for it. Returns the
 * client secret + publishable key for the Stripe Payment Element. When no charge
 * is due (free job / unserviced ZIP / Stripe not configured) returns
 * paymentRequired:false so the wizard skips the card step.
 */
export const POST: RequestHandler = async ({ request }) => {
  let body: { zip?: string; jobTypeName?: string; street?: string; city?: string; email?: string; name?: string };
  try {
    body = (await request.json()) as { zip?: string; jobTypeName?: string; street?: string; city?: string; email?: string; name?: string };
  } catch {
    throw error(400, 'Invalid JSON payload');
  }
  const zip = (body.zip ?? '').trim();
  const jobTypeName = (body.jobTypeName ?? '').trim();
  if (!zip || !jobTypeName) {
    return json({ error: 'zip and jobTypeName are required' }, { status: 400 });
  }

  const fee = await resolveFee(zip, jobTypeName);
  const debug = paymentDebugEnabled();

  // Fee semantics from the shared catalog (per Jim 2026-07-16): some job types
  // carry a fixed service fee collected UPFRONT with the OSC (residential
  // hardware $350); others are billed AFTER the visit (commercial hardware
  // $145, net-30 accounts) and must not be collected at intake.
  let pricing: { upfrontFee?: number; billedAfter?: boolean } = {};
  try {
    pricing = getJobType(jobTypeName).pricing ?? {};
  } catch {
    // Unknown job type name — no fee semantics; OSC-only behavior.
  }
  if (pricing.billedAfter) {
    return json({
      paymentRequired: false,
      amount: fee.osc,
      currency: fee.currency,
      serviced: fee.serviced,
      flag: 'billed-after',
      payLaterAvailable: false
    });
  }
  const upfrontFee = fee.serviced && typeof pricing.upfrontFee === 'number' ? pricing.upfrontFee : 0;
  const chargeBase = fee.osc + upfrontFee;

  if (!(fee.serviced && chargeBase > 0)) {
    return json({ paymentRequired: false, amount: fee.osc, currency: fee.currency, serviced: fee.serviced, flag: fee.flag });
  }

  // Sales tax on the charge base (OSC + upfront service fee), from WA DOR by
  // service address (the same source ServiceTitan's tax zones sync from — the
  // invoice will show this rate). Best-effort: a failed lookup charges the
  // untaxed base rather than blocking.
  const tax = await lookupWaSalesTax({ street: body.street, city: body.city, zip });
  const taxAmount = taxAmountOn(chargeBase, tax);
  const total = Math.round((chargeBase + taxAmount) * 100) / 100;

  // A charge-due response that, for whatever reason, can't be collected online.
  // We never block the lead: the customer still sees the amount and submits, and
  // the office collects at scheduling. `code`/`reason` ride along for operators
  // (reason only when PAYMENT_DEBUG is on, so customers never see internals).
  const collectLater = (flag: string, code?: string, reason?: string) =>
    json({
      paymentRequired: false,
      amount: total,
      baseAmount: chargeBase,
      taxAmount,
      upfrontFee,
      currency: fee.currency,
      serviced: true,
      zoneName: fee.zoneName,
      flag,
      payLaterAvailable: fee.payLaterAvailable,
      debug,
      ...(code ? { code } : {}),
      ...(debug ? { stripeMode: getStripeMode() ?? 'legacy', reason } : {}),
    });
  if (!isStripeConfigured()) {
    // No (or malformed) Stripe secret key — online collection is off by design.
    return collectLater('payment-not-configured', 'stripe-not-configured', 'STRIPE_SECRET_KEY is unset or malformed on the server.');
  }

  const publishableKey = getPublishableKey();
  if (!publishableKey) {
    // Secret key works but the browser-side key is missing/malformed/truncated —
    // we can't mount the Payment Element, so collect later rather than dead-end.
    console.error('[api/payment/intent] STRIPE_PUBLISHABLE_KEY missing or malformed — collecting on-site charge at scheduling instead.');
    return collectLater('payment-unavailable', 'stripe-publishable-invalid', 'STRIPE_PUBLISHABLE_KEY is unset, malformed, or truncated (expected a full pk_live_/pk_test_ key).');
  }

  try {
    const customerEmail = (body.email ?? '').trim() || null;
    const customerName = (body.name ?? '').trim() || null;
    // Group payments per customer in Stripe when the key permits (best-effort).
    const customerId = await findOrCreateCustomer(customerEmail, customerName);
    const auth = await createAuthorization(
      Math.round(total * 100),
      fee.currency,
      {
        // `kind` is the reconciliation sweep's marker; booking refs are stamped
        // on after the ServiceTitan booking is created.
        kind: 'osc_intake_paynow',
        zip,
        jobTypeName,
        zoneId: fee.zoneId ?? '',
        jobTypeId: fee.jobTypeId ?? '',
        osc: String(fee.osc),
        upfrontFee: String(upfrontFee),
        taxAmount: String(taxAmount),
        taxLocationCode: tax?.locationCode ?? '',
        ...(customerName ? { customerName } : {}),
      },
      { customerId, receiptEmail: customerEmail },
    );
    return json({
      paymentRequired: true,
      amount: total,
      baseAmount: chargeBase,
      taxAmount,
      upfrontFee,
      currency: fee.currency,
      zoneName: fee.zoneName,
      clientSecret: auth.clientSecret,
      paymentIntentId: auth.id,
      publishableKey,
      payLaterAvailable: fee.payLaterAvailable,
      debug,
      ...(debug ? { stripeMode: getStripeMode() ?? 'legacy' } : {}),
    });
  } catch (err) {
    // Stripe rejected the authorization (bad key, missing permission, outage…).
    // Degrade to collect-later with a precise, logged diagnostic instead of a
    // 502 that leaves the customer staring at "couldn't set up online payment".
    const failure = classifyStripeError(err);
    console.error(`[api/payment/intent] Stripe authorization failed [${failure.code}]: ${failure.reason}`, err);
    return collectLater('payment-unavailable', failure.code, failure.reason);
  }
};
