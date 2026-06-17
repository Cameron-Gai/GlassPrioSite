import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveFee } from '$lib/server/zoneFee';
import { createAuthorization, getPublishableKey, isStripeConfigured } from '$lib/server/payments/stripe';

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
  let body: { zip?: string; jobTypeName?: string };
  try {
    body = (await request.json()) as { zip?: string; jobTypeName?: string };
  } catch {
    throw error(400, 'Invalid JSON payload');
  }
  const zip = (body.zip ?? '').trim();
  const jobTypeName = (body.jobTypeName ?? '').trim();
  if (!zip || !jobTypeName) {
    return json({ error: 'zip and jobTypeName are required' }, { status: 400 });
  }

  const fee = await resolveFee(zip, jobTypeName);

  if (!(fee.serviced && fee.osc > 0)) {
    return json({ paymentRequired: false, amount: fee.osc, currency: fee.currency, serviced: fee.serviced, flag: fee.flag });
  }
  if (!isStripeConfigured()) {
    // Fee is due but online collection isn't configured — the booking still
    // proceeds and the office collects at conversion.
    return json({ paymentRequired: false, amount: fee.osc, currency: fee.currency, serviced: true, flag: 'payment-not-configured' });
  }

  const publishableKey = getPublishableKey();
  if (!publishableKey) {
    return json({ error: 'Stripe publishable key is not configured' }, { status: 500 });
  }

  try {
    const auth = await createAuthorization(fee.osc * 100, fee.currency, {
      zip,
      jobTypeName,
      zoneId: fee.zoneId ?? '',
      jobTypeId: fee.jobTypeId ?? '',
      osc: String(fee.osc),
    });
    return json({
      paymentRequired: true,
      amount: fee.osc,
      currency: fee.currency,
      zoneName: fee.zoneName,
      clientSecret: auth.clientSecret,
      paymentIntentId: auth.id,
      publishableKey,
    });
  } catch (err) {
    console.error('[api/payment/intent] failed to create authorization', err);
    return json({ error: 'Could not start payment. Please try again.' }, { status: 502 });
  }
};
