/**
 * Resolve the on-site charge (OSC) for a ZIP + job type from the GlassReports
 * Zone & Charge map. GlassPrioSite has no database, so it calls GlassReports'
 * server-to-server quote endpoint (shared-secret).
 *
 * Fails SOFT: any misconfiguration or outage returns a not-serviced/$0 quote
 * with a flag so a fee problem never blocks a real lead — the booking still
 * goes through and the office reviews/collects the charge at conversion.
 */
import { env } from '$env/dynamic/private';
import { resolveJobTypeId } from './servicetitan/jobTypeMap';
import { getServiceTitanConfig } from './servicetitan/config';

export type FeeFlag =
  | 'none'
  | 'unserviced-or-unknown'
  | 'fee-service-unreachable'
  | 'not-configured';

export interface FeeQuote {
  /** True only when the ZIP is in a serviced zone with a resolved charge. */
  serviced: boolean;
  /** Dollar amount to charge (0 when not serviced / unknown / unconfigured). */
  osc: number;
  currency: string; // 'usd'
  zoneId: string | null;
  zoneName: string | null;
  /** The ServiceTitan job-type id the OSC resolved against, when known. */
  jobTypeId: string | null;
  /** Service market for the ZIP (e.g. 'Seattle'), or '' when not set — drives BU routing. */
  market: string;
  flag: FeeFlag;
  /** False when GlassReports' OSC collection pipeline is off — pay-by-text must
   *  not be offered (nothing would ever send the link). */
  payLaterAvailable: boolean;
}

function baseUrl(): string | null {
  const u = env.GLASSREPORTS_BASE_URL?.trim();
  return u ? u.replace(/\/+$/, '') : null;
}

export function isFeeServiceConfigured(): boolean {
  return !!baseUrl() && !!env.ZONE_MAP_QUOTE_TOKEN?.trim();
}

export async function resolveFee(zip: string, jobTypeName: string): Promise<FeeQuote> {
  const soft = (flag: FeeFlag): FeeQuote => ({
    serviced: false, osc: 0, currency: 'usd', zoneId: null, zoneName: null, jobTypeId: null, market: '', flag,
    payLaterAvailable: true,
  });

  const url = baseUrl();
  const token = env.ZONE_MAP_QUOTE_TOKEN?.trim();
  if (!url || !token) return soft('not-configured');

  // Map our intake job-type *name* → the ServiceTitan job-type id the zone map
  // is keyed by. A missing mapping is fine: we still pass the name so the quote
  // can match by name, and otherwise fall back to the zone default.
  const stConfig = getServiceTitanConfig();
  const idResolution = resolveJobTypeId(jobTypeName, stConfig?.jobTypeIdOverrides ?? null);
  const jobTypeId = idResolution.id !== null ? String(idResolution.id) : '';

  const qs = new URLSearchParams({ zip, jobTypeName });
  if (jobTypeId) qs.set('jobTypeId', jobTypeId);

  try {
    const r = await fetch(`${url}/api/zone-map/quote?${qs.toString()}`, {
      headers: { 'x-zone-map-token': token, accept: 'application/json' },
    });
    if (!r.ok) return soft('fee-service-unreachable');
    const q = (await r.json()) as Partial<FeeQuote> & { osc?: number; market?: string; oscTextingEnabled?: boolean };
    const serviced = q.serviced === true;
    const osc = Number(q.osc) || 0;
    return {
      serviced,
      osc: serviced ? Math.max(0, Math.round(osc)) : 0,
      currency: typeof q.currency === 'string' ? q.currency : 'usd',
      zoneId: q.zoneId ?? null,
      zoneName: q.zoneName ?? null,
      jobTypeId: q.jobTypeId ?? (jobTypeId || null),
      market: typeof q.market === 'string' ? q.market : '',
      flag: serviced ? 'none' : 'unserviced-or-unknown',
      // GlassReports' OSC collection pipeline controls pay-by-text on every
      // channel; absent field (older GlassReports) keeps the option available.
      payLaterAvailable: q.oscTextingEnabled !== false,
    };
  } catch {
    return soft('fee-service-unreachable');
  }
}
