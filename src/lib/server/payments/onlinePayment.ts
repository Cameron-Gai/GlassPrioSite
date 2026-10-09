import { env } from '$env/dynamic/private';

/**
 * Whether the site collects the on-site charge from the customer at all —
 * "Pay now" by card AND "text me a link". OFF unless OSC_PAY_NOW is set to
 * on/true/1 (owner decision 2026-10-09: the office collects every on-site
 * charge for now). Off, the customer still sees the amount at review and
 * submits; the booking is flagged for the office to collect at scheduling —
 * the same path a Stripe outage already takes.
 */
export function onlinePaymentEnabled(): boolean {
  const v = env.OSC_PAY_NOW?.trim().toLowerCase();
  return v === 'on' || v === 'true' || v === '1' || v === 'yes';
}
