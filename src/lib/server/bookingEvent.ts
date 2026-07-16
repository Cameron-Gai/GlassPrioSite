/**
 * Booking-event ping to GlassReports: after a successful ServiceTitan booking,
 * notify PanePulse so the office's per-intake-tool booking alerts fire (the
 * `intake_booking_customer` notification event, mutable in its settings).
 *
 * Server-to-server (same shared secret as the zone-map quote) and strictly
 * BEST-EFFORT: the booking already exists when this runs, so a failure here
 * must never surface to the customer. Mirrors oscRegister.ts.
 */
import { env } from '$env/dynamic/private';

export interface BookingEventPayload {
  confirmationNumber: string;
  bookingId: string | number | null;
  jobTypeName: string;
  customerName: string;
  phone: string;
  address: string;
  isEmergency: boolean;
  oscAmount: number | null;
  paymentNote: string;
}

function baseUrl(): string | null {
  const u = env.GLASSREPORTS_BASE_URL?.trim();
  return u ? u.replace(/\/+$/, '') : null;
}

/** Fire the ping. Returns true on a 2xx, false on any failure (never throws). */
export async function notifyBookingEvent(event: BookingEventPayload): Promise<boolean> {
  const url = baseUrl();
  const token = env.ZONE_MAP_QUOTE_TOKEN?.trim();
  if (!url || !token) return false;
  try {
    const r = await fetch(`${url}/api/intake/booking-event`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-zone-map-token': token },
      body: JSON.stringify(event),
    });
    return r.ok;
  } catch (err) {
    console.warn('[booking-event] could not notify GlassReports (booking unaffected)', err);
    return false;
  }
}
