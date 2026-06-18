import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceTitanConfig, findReturningCustomer } from '$lib/server/servicetitan';
import { rateLimit } from '$lib/server/rateLimit';

/**
 * Step 2 of returning-customer autofill: the customer has tapped "Use my info
 * on file", so we re-run the two-factor match and return the prefill (name +
 * address). Re-validating here means the address is only ever sent after an
 * explicit opt-in, and only when phone + email still match.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const limit = rateLimit(`prefill:${getClientAddress()}`, 10, 60_000);
  if (!limit.allowed) {
    return json({ matched: false }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }

  const config = getServiceTitanConfig();
  if (!config) return json({ matched: false });

  let body: { phone?: string; email?: string };
  try {
    body = (await request.json()) as { phone?: string; email?: string };
  } catch {
    return json({ matched: false });
  }
  if (!body.phone || !body.email) return json({ matched: false });

  try {
    const match = await findReturningCustomer(config, body.phone, body.email);
    if (!match) return json({ matched: false });
    return json({
      matched: true,
      prefill: {
        firstName: match.firstName,
        lastName: match.lastName,
        address: match.address
      }
    });
  } catch (error) {
    console.error('[api/customer-prefill] error', error);
    return json({ matched: false });
  }
};
