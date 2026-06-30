/**
 * Register a "Pay later" OSC with GlassReports so its collection pipeline can text
 * the Stripe payment link once the booking converts to a scheduled job.
 *
 * Server-to-server (shared-secret), and strictly BEST-EFFORT: the booking has
 * already been created when this runs, so a failure here must never surface to
 * the customer — the booking summary already carries the PAY LATER note as a
 * manual fallback. Mirrors the zoneFee.ts client (same base URL + token).
 */
import { env } from '$env/dynamic/private';

export interface DeferredOscRegistration {
  /** The booking's externalId (our idempotency key) — how the watcher finds the job. */
  externalId: string;
  bookingId: number | string;
  amount: number;
  currency: string;
  zip: string;
  jobTypeId: string | null;
  jobTypeName: string;
  customerName: string;
  phone: string;
}

function baseUrl(): string | null {
  const u = env.GLASSREPORTS_BASE_URL?.trim();
  return u ? u.replace(/\/+$/, '') : null;
}

/** Fire the registration. Returns true on a 2xx, false on any failure (never throws). */
export async function registerDeferredOsc(reg: DeferredOscRegistration): Promise<boolean> {
  const url = baseUrl();
  const token = env.ZONE_MAP_QUOTE_TOKEN?.trim();
  if (!url || !token) {
    console.warn('[osc-register] GlassReports base URL or token not configured — skipping pay-later registration');
    return false;
  }
  try {
    const r = await fetch(`${url}/api/osc/register-deferred`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-zone-map-token': token },
      body: JSON.stringify({ ...reg, bookingId: String(reg.bookingId) }),
    });
    if (!r.ok) {
      console.error(`[osc-register] GlassReports rejected pay-later registration (${r.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[osc-register] failed to reach GlassReports for pay-later registration', err);
    return false;
  }
}
