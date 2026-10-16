import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { parseInboundLead, saveInboundLead, MIN_KEY_LENGTH } from '$lib/server/inboundLeads';

/**
 * POST /api/leads/inbound — Zapier webhook for a partner's landing-page form
 * (Mancini Digital first). See $lib/server/inboundLeads for the whole flow.
 *
 * Auth: the shared secret INBOUND_LEAD_TOKEN, sent as the `x-lead-token`
 * header (Zapier's Webhooks "Headers" field) or a `token` query parameter.
 * With no token configured the endpoint is off (503) rather than open.
 *
 * Body: JSON only — set the Zap's Payload Type to "json". (A form-encoded
 * post from another site is refused by SvelteKit's CSRF check before it ever
 * reaches this handler, and Zapier sends forms by default.) Needs a match key — `lid`
 * (the partner's lead id, also put on the /book redirect) and/or `gclid` —
 * plus whatever contact fields the form has: first_name, last_name (or name),
 * phone, email, zip.
 */
function tokenOk(provided: string | null): boolean {
  const expected = env.INBOUND_LEAD_TOKEN?.trim();
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export const POST: RequestHandler = async ({ request, url }) => {
  if (!env.INBOUND_LEAD_TOKEN?.trim()) {
    return json({ ok: false, error: 'Inbound leads are not configured' }, { status: 503 });
  }
  if (!tokenOk(request.headers.get('x-lead-token') ?? url.searchParams.get('token'))) {
    return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await readBody(request);
  if (!body) return json({ ok: false, error: 'Send a JSON object (Zapier: Payload Type "json")' }, { status: 400 });

  const { keys, lead } = parseInboundLead(body);
  if (!lead.firstName && !lead.phone && !lead.email) {
    return json({ ok: false, error: 'No contact fields found (first_name, phone, email)' }, { status: 400 });
  }
  const saved = saveInboundLead(keys, lead);
  if (!saved) {
    return json(
      { ok: false, error: `Needs a match key: lid (at least ${MIN_KEY_LENGTH} characters) or gclid` },
      { status: 400 }
    );
  }
  return json({ ok: true, keys: saved });
};
