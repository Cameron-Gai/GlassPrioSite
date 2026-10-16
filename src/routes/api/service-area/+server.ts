import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveFee } from '$lib/server/zoneFee';
import { rateLimit } from '$lib/server/rateLimit';

/**
 * GET /api/service-area?zip= — do we serve this ZIP? /book asks it first so an
 * out-of-area visitor learns that up front instead of after the whole form
 * (Mike Mancini's ask, 2026-10-09). The zone map decides service by ZIP alone,
 * so no job type is needed.
 *
 * `known: false` means the zone map couldn't be reached or isn't configured —
 * the page lets the visitor through rather than turn away a real lead.
 */
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const limit = rateLimit(`service-area:${getClientAddress()}`, 30, 60_000);
  if (!limit.allowed) return json({ known: false, serviced: true }, { status: 429 });

  const zip = url.searchParams.get('zip')?.trim() ?? '';
  if (!/^\d{5}$/.test(zip)) return json({ error: 'Enter a 5-digit ZIP' }, { status: 400 });

  const fee = await resolveFee(zip, '');
  const known = fee.flag === 'none' || fee.flag === 'unserviced-or-unknown';
  return json({ known, serviced: known ? fee.serviced : true });
};
