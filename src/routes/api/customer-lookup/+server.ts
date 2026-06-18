import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceTitanConfig, findReturningCustomer } from '$lib/server/servicetitan';
import { rateLimit } from '$lib/server/rateLimit';

/**
 * Step 1 of returning-customer autofill: confirm a two-factor (phone + email)
 * match exists and return ONLY the first name, so the form can greet the
 * customer. No address or other PII is returned here — that waits for an
 * explicit opt-in via /api/customer-prefill.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const limit = rateLimit(`lookup:${getClientAddress()}`, 10, 60_000);
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
    return json({ matched: !!match, firstName: match?.firstName ?? null });
  } catch (error) {
    console.error('[api/customer-lookup] error', error);
    return json({ matched: false });
  }
};
