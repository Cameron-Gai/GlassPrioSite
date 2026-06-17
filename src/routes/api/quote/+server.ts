import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveFee } from '$lib/server/zoneFee';
import { isStripeConfigured } from '$lib/server/payments/stripe';

/**
 * GET /api/quote?zip=&jobTypeName= — the on-site charge for the customer's ZIP +
 * selected job type, used by the review step to show the fee and decide whether
 * to collect payment. Returns paymentRequired=false unless there's a real
 * (>0) charge for a serviced ZIP AND Stripe is configured to collect it.
 */
export const GET: RequestHandler = async ({ url }) => {
  const zip = url.searchParams.get('zip')?.trim() ?? '';
  const jobTypeName = url.searchParams.get('jobTypeName')?.trim() ?? '';
  if (!zip || !jobTypeName) {
    return json({ error: 'zip and jobTypeName are required' }, { status: 400 });
  }
  const fee = await resolveFee(zip, jobTypeName);
  const paymentRequired = fee.serviced && fee.osc > 0 && isStripeConfigured();
  return json({
    serviced: fee.serviced,
    osc: fee.osc,
    currency: fee.currency,
    zoneName: fee.zoneName,
    flag: fee.flag,
    paymentRequired,
  });
};
