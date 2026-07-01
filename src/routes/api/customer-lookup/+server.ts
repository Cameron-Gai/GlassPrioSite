import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getServiceTitanConfig, findReturningCustomer, type ReturningLookupInput } from '$lib/server/servicetitan';
import { rateLimit } from '$lib/server/rateLimit';

/** Coerce a request body into the returning-lookup input shape (all fields optional). */
function parseInput(body: unknown): ReturningLookupInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const addr = (b.address ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    phone: str(b.phone),
    email: str(b.email),
    firstName: str(b.firstName),
    lastName: str(b.lastName),
    address: { street: str(addr.street), city: str(addr.city), state: str(addr.state), zip: str(addr.zip) }
  };
}

/**
 * Step 1 of returning-customer autofill: confirm a two-factor (any 2 of phone /
 * email / name / address) match exists and return ONLY the first name, so the
 * form can greet the customer. No address, customer id, or other linkage data is
 * returned here — that waits for an explicit opt-in via /api/customer-prefill.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const limit = rateLimit(`lookup:${getClientAddress()}`, 10, 60_000);
  if (!limit.allowed) {
    return json({ matched: false }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }

  const config = getServiceTitanConfig();
  if (!config) return json({ matched: false });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ matched: false });
  }

  try {
    const match = await findReturningCustomer(config, parseInput(body));
    return json({ matched: !!match, firstName: match?.firstName ?? null });
  } catch (error) {
    console.error('[api/customer-lookup] error', error);
    return json({ matched: false });
  }
};
