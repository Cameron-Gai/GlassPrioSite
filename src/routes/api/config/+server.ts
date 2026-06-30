import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStripeMode } from '$lib/server/payments/stripe';

/**
 * Client config flags. `testMode` is true whenever Stripe is NOT in live mode
 * (STRIPE_MODE=test or unset) — the intake wizard uses it to surface the
 * test-preset panel. Flipping STRIPE_MODE=live at launch hides it automatically.
 */
export const GET: RequestHandler = async () => {
  return json({ testMode: getStripeMode() !== 'live' });
};
