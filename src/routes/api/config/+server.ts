import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripeMode } from '$lib/server/payments/stripe';
import { isServiceTitanReady } from '$lib/server/servicetitan';

/**
 * Client config flags.
 *  - `testMode`: true whenever Stripe is NOT in live mode (surfaces the test-preset
 *    panel; flipping STRIPE_MODE=live at launch hides it).
 *  - `serviceTitanReady`: false when ServiceTitan is configured but unreachable, so
 *    the wizard replaces the form with a "call us" screen instead of taking a lead
 *    it can't book. (Cached ~60s server-side; true when ST isn't configured.)
 */
export const GET: RequestHandler = async () => {
  const serviceTitanReady = await isServiceTitanReady();
  return json({ testMode: getStripeMode() !== 'live', serviceTitanReady });
};
