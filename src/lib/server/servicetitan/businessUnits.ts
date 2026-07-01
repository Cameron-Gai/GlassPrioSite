/**
 * Resolve the ServiceTitan business unit for a booking/job.
 *
 * The GlassReports zone map only tells us the service **market** (Seattle /
 * Tacoma) for a ZIP. The market → business-unit mapping lives here, in the
 * intake tool, because the intake already knows the customer type (residential
 * vs commercial) and whether the work is interior/architectural glass.
 *
 * Configure via SERVICETITAN_BUSINESS_UNIT_IDS (JSON), e.g.:
 *   {"Seattle":{"residential":1000051,"commercial":1000050,"interior":8126430,"remote":8126500},
 *    "Tacoma":{"residential":1959908,"commercial":1959780,"interior":8126811,"remote":8126900}}
 *
 * `remote` is the market's "Remote Consultation and Sales Department" BU: a
 * customer who opts into a virtual consultation routes there (by the ZIP's
 * market) regardless of customer type or interior/architectural work.
 */
import { env } from '$env/dynamic/private';

export type CustomerType = 'Residential' | 'Commercial';
type BusinessUnitKind = 'residential' | 'commercial' | 'interior' | 'remote';

export interface MarketBusinessUnits {
  residential: number | null;
  commercial: number | null;
  interior: number | null;
  remote: number | null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Parsed market → business-unit map from SERVICETITAN_BUSINESS_UNIT_IDS, or null. */
export function getBusinessUnitMap(): Record<string, MarketBusinessUnits> | null {
  const raw = env.SERVICETITAN_BUSINESS_UNIT_IDS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, MarketBusinessUnits> = {};
    for (const [market, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (v && typeof v === 'object') {
        const o = v as Record<string, unknown>;
        out[market] = { residential: num(o.residential), commercial: num(o.commercial), interior: num(o.interior), remote: num(o.remote) };
      }
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Which BU kind a job routes to. Precedence:
 *   1. remote consultation → the market's Remote Consultation & Sales BU
 *      (regardless of customer type / interior work),
 *   2. interior/architectural-glass work (shower, mirror) → the interior BU,
 *   3. everything else splits commercial vs residential by the customer type.
 */
export function businessUnitKind(customerType: CustomerType, interior: boolean, remoteConsult = false): BusinessUnitKind {
  if (remoteConsult) return 'remote';
  if (interior) return 'interior';
  return customerType === 'Commercial' ? 'commercial' : 'residential';
}

/** Resolve the BU id for a market + customer type + interior/remote flags, or null when unmapped. */
export function resolveBusinessUnitId(
  market: string,
  customerType: CustomerType,
  interior: boolean,
  remoteConsult = false
): number | null {
  const map = getBusinessUnitMap();
  if (!map || !market) return null;
  const m = map[market];
  if (!m) return null;
  return m[businessUnitKind(customerType, interior, remoteConsult)] ?? null;
}
