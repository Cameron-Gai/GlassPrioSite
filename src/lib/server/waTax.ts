/**
 * Washington sales-tax lookup via the state DOR's free address-rate API — the
 * same upstream source ServiceTitan's tax zones sync from (the tenant's tax
 * zone names are WA DOR location codes, e.g. "3403 - OLYMPIA"), so a rate
 * quoted here matches what ServiceTitan later puts on the invoice.
 *
 * IMPORTANT: pass the full street + city whenever available. A ZIP-only lookup
 * returns the ZIP's *default* jurisdiction (ResultCode 5), which can differ
 * from the address's real one (verified: 98501 ZIP-only → 8.4% unincorporated,
 * but 1010 Capitol Way S → 3403 OLYMPIA 10.0%).
 *
 * Strictly best-effort: null on any failure or implausible response — callers
 * fall back to charging the untaxed base rather than blocking a customer.
 */

const DOR_URL = 'https://webgis.dor.wa.gov/webapi/AddressRates.aspx';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // rates change at most quarterly
const LOOKUP_TIMEOUT_MS = 6_000;

export interface WaTaxLookup {
  /** Combined state+local rate as a fraction, e.g. 0.1 for 10%. */
  rate: number;
  /** WA DOR location code (matches ServiceTitan tax-zone naming), e.g. "3403". */
  locationCode: string | null;
  /** True when the rate came from the full address (0) vs the ZIP default (5). */
  addressPrecise: boolean;
}

const cache = new Map<string, { at: number; value: WaTaxLookup | null }>();

export async function lookupWaSalesTax(input: {
  street?: string | null;
  city?: string | null;
  zip: string;
}): Promise<WaTaxLookup | null> {
  const zip = input.zip?.trim() ?? '';
  if (!/^\d{5}$/.test(zip)) return null;
  const street = input.street?.trim() ?? '';
  const city = input.city?.trim() ?? '';

  const key = `${street}|${city}|${zip}`.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;

  let value: WaTaxLookup | null = null;
  try {
    const params = new URLSearchParams({ output: 'text', zip });
    if (street) params.set('addr', street);
    if (city) params.set('city', city);
    const res = await fetch(`${DOR_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS)
    });
    if (res.ok) {
      // e.g. "LocationCode=3403 Rate=.100 ResultCode=0"
      const text = (await res.text()).trim();
      const match = text.match(/LocationCode=(\S+)\s+Rate=([0-9.]+)\s+ResultCode=(\d+)/i);
      if (match) {
        const rate = Number(match[2]);
        const resultCode = Number(match[3]);
        // Sanity: WA combined rates live between 7% and ~11%; anything else is
        // a parse/API anomaly we refuse to charge customers by.
        if (Number.isFinite(rate) && rate >= 0.06 && rate <= 0.13) {
          value = { rate, locationCode: match[1] ?? null, addressPrecise: resultCode === 0 };
        }
      }
    }
  } catch (err) {
    console.warn('[waTax] DOR rate lookup failed — charging untaxed base amount', err instanceof Error ? err.message : err);
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Dollars of tax on `base` at the looked-up rate, rounded to cents. */
export function taxAmountOn(base: number, lookup: WaTaxLookup | null): number {
  if (!lookup || !(base > 0)) return 0;
  return Math.round(base * lookup.rate * 100) / 100;
}
