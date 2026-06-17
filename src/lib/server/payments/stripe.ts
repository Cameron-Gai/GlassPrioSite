/**
 * Stripe payment helpers for the on-site-charge collection flow.
 *
 * We use **manual capture** (authorize at the review step, capture only once the
 * ServiceTitan booking is created) so a customer is never charged without a
 * booking — if booking fails we cancel the authorization and the hold is released.
 *
 * Disabled (returns null / not configured) when STRIPE_SECRET_KEY is unset, so
 * dev/unconfigured environments keep working with no payment step.
 */
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let cached: Stripe | null | undefined;

function getStripe(): Stripe | null {
  if (cached === undefined) {
    const key = env.STRIPE_SECRET_KEY?.trim();
    cached = key ? new Stripe(key) : null;
  }
  return cached;
}

export function isStripeConfigured(): boolean {
  return getStripe() !== null;
}

/** Publishable key handed to the browser to mount the Payment Element. */
export function getPublishableKey(): string | null {
  return env.STRIPE_PUBLISHABLE_KEY?.trim() || null;
}

export interface AuthorizationResult {
  id: string;
  clientSecret: string;
  amount: number; // cents
  currency: string;
}

/** Create a manual-capture PaymentIntent (an authorization hold) for the OSC. */
export async function createAuthorization(
  amountCents: number,
  currency: string,
  metadata: Record<string, string>,
): Promise<AuthorizationResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    capture_method: 'manual',
    automatic_payment_methods: { enabled: true },
    description: 'Glass Doctor on-site charge',
    metadata,
  });
  if (!intent.client_secret) throw new Error('Stripe did not return a client secret');
  return { id: intent.id, clientSecret: intent.client_secret, amount: intent.amount, currency: intent.currency };
}

export async function getIntent(id: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.paymentIntents.retrieve(id);
}

/** Capture an authorized intent (call once the booking is confirmed). */
export async function captureIntent(id: string): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  return stripe.paymentIntents.capture(id);
}

/** Release an authorization hold (best-effort) when the booking could not be created. */
export async function cancelIntent(id: string): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  try {
    await stripe.paymentIntents.cancel(id);
  } catch (error) {
    console.error('[stripe] failed to cancel authorization', id, error);
  }
}
