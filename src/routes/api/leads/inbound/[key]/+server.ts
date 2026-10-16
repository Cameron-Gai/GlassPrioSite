import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { findInboundLead } from '$lib/server/inboundLeads';
import { rateLimit } from '$lib/server/rateLimit';

/**
 * GET /api/leads/inbound/:key — /book polls this for the contact details the
 * partner's landing page pushed (see $lib/server/inboundLeads). 404 until the
 * Zapier push lands. Only the visitor holds the key (it's on their own URL),
 * and short keys never match, so this can't be walked for contact info.
 */
export const GET: RequestHandler = async ({ params, getClientAddress }) => {
  // /book polls every few seconds for a couple of minutes — well under this.
  const limit = rateLimit(`inbound-lead:${getClientAddress()}`, 40, 60_000);
  if (!limit.allowed) {
    return json({ found: false }, { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } });
  }
  const lead = findInboundLead(params.key);
  if (!lead) return json({ found: false }, { status: 404, headers: { 'cache-control': 'no-store' } });
  return json(
    {
      found: true,
      lead: { firstName: lead.firstName, lastName: lead.lastName, phone: lead.phone, email: lead.email, zip: lead.zip }
    },
    { headers: { 'cache-control': 'no-store' } }
  );
};
