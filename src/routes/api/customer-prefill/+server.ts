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
 * Step 2 of returning-customer autofill: the customer has confirmed it's them, so
 * we re-run the two-factor match and return the name plus the ServiceTitan
 * customer/location ids used to link the booking to their existing record at
 * conversion. We deliberately do NOT return the stored service address — the
 * customer already entered the address on the previous step (which may be a new
 * location), and re-validating here means ids are only revealed after opt-in.
 */
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const limit = rateLimit(`prefill:${getClientAddress()}`, 10, 60_000);
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
    if (!match) return json({ matched: false });
    return json({
      matched: true,
      prefill: {
        firstName: match.firstName,
        lastName: match.lastName,
        customerId: match.customerId,
        locationId: match.locationId
      }
    });
  } catch (error) {
    console.error('[api/customer-prefill] error', error);
    return json({ matched: false });
  }
};
