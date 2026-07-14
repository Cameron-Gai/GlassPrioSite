/**
 * Stripe payment helpers for the on-site-charge collection flow.
 *
 * We use **manual capture** (authorize at the review step, capture only once the
 * ServiceTitan booking is created) so a customer is never charged without a
 * booking — if booking fails we cancel the authorization and the hold is released.
 *
 * Disabled (returns null / not configured) when no secret key resolves, so
 * dev/unconfigured environments keep working with no payment step.
 *
 * TEST/LIVE TOGGLE: set `STRIPE_MODE=test` or `STRIPE_MODE=live` and store both
 * key sets once — `STRIPE_{SECRET,PUBLISHABLE}_KEY_TEST` and `…_LIVE`. Flip
 * STRIPE_MODE to switch; no need to swap key values. With STRIPE_MODE unset it
 * falls back to the generic `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY`
 * (legacy behavior). A key whose own mode contradicts STRIPE_MODE is refused, so
 * a live key is never used while in test mode (or vice-versa).
 */
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let cached: Stripe | null | undefined;

// Validate by PREFIX + a non-empty key body only — NOT by length. Stripe key
// length varies by account vintage (older accounts issue ~24-char bodies, newer
// ones ~99); a length heuristic falsely rejects valid older keys.
/** A usable Stripe secret key is a standard (sk_) or restricted (rk_) key, test or live. */
const SECRET_KEY_RE = /^(sk|rk)_(test|live)_[A-Za-z0-9]+$/;
/** Publishable keys handed to the browser are pk_test_/pk_live_. */
const PUBLISHABLE_KEY_RE = /^pk_(test|live)_[A-Za-z0-9]+$/;

export type StripeMode = 'test' | 'live';

/** The explicit toggle, or null when unset (= legacy generic-key behavior). */
export function getStripeMode(): StripeMode | null {
  const m = env.STRIPE_MODE?.trim().toLowerCase();
  if (m === 'test') return 'test';
  if (m === 'live') return 'live';
  return null;
}

/** A Stripe key's own mode, read from its `_test_` / `_live_` segment. */
function keyMode(key: string): StripeMode | null {
  if (key.includes('_test_')) return 'test';
  if (key.includes('_live_')) return 'live';
  return null;
}

/**
 * Resolve a Stripe key honoring the STRIPE_MODE toggle. When a mode is set, prefer
 * the scoped var (`<base>_TEST` / `<base>_LIVE`), else the generic `<base>` — but
 * refuse any key whose own mode contradicts STRIPE_MODE (prevents charging real
 * cards while you think you're in test). When no mode is set, use `<base>` as-is.
 */
function resolveStripeKey(base: 'STRIPE_SECRET_KEY' | 'STRIPE_PUBLISHABLE_KEY'): string | undefined {
  const generic = env[base]?.trim() || undefined;
  const mode = getStripeMode();
  if (!mode) return generic; // legacy: no toggle configured

  const scopedName = `${base}_${mode.toUpperCase()}`;
  const candidate = (env[scopedName]?.trim() || undefined) ?? generic;
  if (!candidate) {
    console.error(`[stripe] STRIPE_MODE=${mode} but neither ${scopedName} nor ${base} is set.`);
    return undefined;
  }
  if (keyMode(candidate) !== mode) {
    console.error(
      `[stripe] STRIPE_MODE=${mode} but the resolved ${base} is a ${keyMode(candidate) ?? 'unknown'}-mode key — refusing it so the wrong key can't be used. Set ${scopedName}.`
    );
    return undefined;
  }
  return candidate;
}

function getStripe(): Stripe | null {
  if (cached === undefined) {
    const key = resolveStripeKey('STRIPE_SECRET_KEY');
    if (key && !SECRET_KEY_RE.test(key)) {
      // A malformed key (e.g. a placeholder, or a publishable key pasted into the
      // secret slot) would otherwise be treated as "configured" and then blow up
      // at the first API call. Treat it as not-configured and say why, loudly.
      console.error(
        `[stripe] resolved secret key is malformed (got "${key.slice(0, 4)}…", expected sk_/rk_ + test/live). Treating Stripe as NOT configured.`
      );
    }
    cached = key && SECRET_KEY_RE.test(key) ? new Stripe(key) : null;
  }
  return cached;
}

export function isStripeConfigured(): boolean {
  return getStripe() !== null;
}

/** Publishable key handed to the browser to mount the Payment Element. Returns
 *  null when unset OR malformed, so a bad key degrades instead of failing in the
 *  browser with no server-side trace. Honors the STRIPE_MODE toggle. */
export function getPublishableKey(): string | null {
  const key = resolveStripeKey('STRIPE_PUBLISHABLE_KEY');
  if (!key) return null;
  if (!PUBLISHABLE_KEY_RE.test(key)) {
    console.error(`[stripe] resolved publishable key is malformed (got "${key.slice(0, 4)}…", expected pk_test_/pk_live_ + key body).`);
    return null;
  }
  return key;
}

export interface StripeFailure {
  /** Stable, operator-facing code (e.g. 'stripe-permission'). */
  code: string;
  /** One-line, actionable explanation for an operator. Never shown to customers. */
  reason: string;
}

/** Map a thrown Stripe error to a stable code + actionable operator hint. */
export function classifyStripeError(err: unknown): StripeFailure {
  const e = (err ?? {}) as { type?: string; message?: string };
  const message = e.message || 'Unknown Stripe error';
  switch (e.type) {
    case 'StripeAuthenticationError':
      return { code: 'stripe-auth', reason: 'Stripe rejected the API key (invalid, revoked, or wrong account). Check STRIPE_SECRET_KEY.' };
    case 'StripePermissionError':
      return { code: 'stripe-permission', reason: 'The Stripe key lacks PaymentIntents permission. Grant "PaymentIntents: Write" to the restricted (rk_) key, or use a standard sk_ secret key.' };
    case 'StripeConnectionError':
      return { code: 'stripe-connection', reason: 'Could not reach Stripe (network/outage). Transient — retry.' };
    case 'StripeRateLimitError':
      return { code: 'stripe-rate-limit', reason: 'Stripe rate-limited the request. Transient — retry shortly.' };
    case 'StripeInvalidRequestError':
      return { code: 'stripe-invalid-request', reason: `Stripe rejected the request: ${message}` };
    default:
      return { code: 'stripe-error', reason: message };
  }
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
  opts?: { customerId?: string | null; receiptEmail?: string | null },
): Promise<AuthorizationResult> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  const intent = await stripe.paymentIntents.create({
    amount: amountCents,
    currency,
    capture_method: 'manual',
    // Card/wallet only, no redirect-based methods — so the inline Payment
    // Element confirm needs no return_url and reliably resolves with the
    // PaymentIntent (instead of erroring out and leaving an uncaptured hold).
    automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
    description: 'Glass Doctor on-site consultation charge',
    metadata,
    // Grouping + receipts: customer requires the Customers permission on the
    // key (best-effort upstream); receipt_email makes Stripe email a receipt
    // when the hold is captured at booking.
    ...(opts?.customerId ? { customer: opts.customerId } : {}),
    ...(opts?.receiptEmail?.trim() ? { receipt_email: opts.receiptEmail.trim() } : {}),
  });
  if (!intent.client_secret) throw new Error('Stripe did not return a client secret');
  return { id: intent.id, clientSecret: intent.client_secret, amount: intent.amount, currency: intent.currency };
}

/**
 * Merge booking references onto a PaymentIntent's metadata (Stripe merges keys,
 * it doesn't replace the map) — done right after the ServiceTitan booking is
 * created so every Stripe payment links back to its booking from the dashboard.
 */
export async function updateIntentMetadata(id: string, metadata: Record<string, string>): Promise<void> {
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe is not configured');
  await stripe.paymentIntents.update(id, { metadata });
}

/**
 * Find (by exact email) or create a Stripe Customer so intake payments group
 * per customer in the dashboard. STRICTLY best-effort: the restricted keys lack
 * the Customers permission as of 2026-07-16 (probed) — returns null until
 * "Customers: Read + Write" is granted, and the intent is simply created
 * without a customer in the meantime.
 */
export async function findOrCreateCustomer(email: string | null | undefined, name?: string | null): Promise<string | null> {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const existing = await stripe.customers.list({ email: trimmed, limit: 1 });
    if (existing.data[0]) return existing.data[0].id;
    const created = await stripe.customers.create({
      email: trimmed,
      ...(name?.trim() ? { name: name.trim() } : {}),
    });
    return created.id;
  } catch {
    return null; // missing permission or transient failure — proceed without
  }
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
