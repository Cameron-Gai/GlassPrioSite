/**
 * Resolve the ServiceTitan business unit for a booking/job.
 *
 * The GlassReports zone map only tells us the service **market** (Seattle /
 * Tacoma) for a ZIP. The market → business-unit mapping lives here, in the
 * intake tool, because the intake already knows the customer type (residential
 * vs commercial) and whether the work is interior/architectural glass.
 *
 * Configure via SERVICETITAN_BUSINESS_UNIT_IDS (JSON), e.g.:
 *   {"Seattle":{"residential":1000051,"commercial":1000050,"interior":8126430},
 *    "Tacoma":{"residential":1959908,"commercial":1959780,"interior":8126811}}
 */
import { env } from '$env/dynamic/private';

export type CustomerType = 'Residential' | 'Commercial';
type BusinessUnitKind = 'residential' | 'commercial' | 'interior';

export interface MarketBusinessUnits {
  residential: number | null;
  commercial: number | null;
  interior: number | null;
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
        out[market] = { residential: num(o.residential), commercial: num(o.commercial), interior: num(o.interior) };
      }
    }
    return out;
  } catch {
    return null;
  }
}

/**
 * Which BU kind a job routes to: interior/architectural-glass work (shower,
 * mirror) goes to the interior BU regardless of customer type; everything else
 * splits commercial vs residential by the customer type.
 */
export function businessUnitKind(customerType: CustomerType, interior: boolean): BusinessUnitKind {
  if (interior) return 'interior';
  return customerType === 'Commercial' ? 'commercial' : 'residential';
}

/** Resolve the BU id for a market + customer type + interior flag, or null when unmapped. */
export function resolveBusinessUnitId(market: string, customerType: CustomerType, interior: boolean): number | null {
  const map = getBusinessUnitMap();
  if (!map || !market) return null;
  const m = map[market];
  if (!m) return null;
  return m[businessUnitKind(customerType, interior)] ?? null;
}
