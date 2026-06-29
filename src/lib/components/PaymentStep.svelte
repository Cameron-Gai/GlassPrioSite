<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import type { Stripe, StripeElements } from '@stripe/stripe-js';
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { IntakeState } from '$lib/stores/intakeStore';

  export let state: IntakeState;

  type Phase = 'loading' | 'info' | 'card' | 'submitting';
  let phase: Phase = 'loading';
  let amount = 0;
  let currency = 'usd';
  let zoneName: string | null = null;
  let infoText = '';
  let payError = '';

  let stripe: Stripe | null = null;
  let elements: StripeElements | null = null;
  let cardNode: HTMLDivElement;
  /** The PaymentIntent id we created server-side — used as the authoritative id
   *  regardless of what confirmPayment echoes back. */
  let createdIntentId = '';

  const zip = state.address.zip.trim();
  const jobTypeName = state.selectedJobType?.name ?? '';
  const money = (n: number) => `$${n.toLocaleString()}`;

  function nonPaymentMessage(flag: string, amt: number): string {
    if (flag === 'unserviced-or-unknown') {
      return 'We could not match your ZIP to a service area. You can still submit — our office will confirm coverage and any fee when scheduling.';
    }
    if (flag === 'payment-not-configured' || amt > 0) {
      return `An on-site consultation charge of ${money(amt)} applies for your area. Our office will collect it when scheduling.`;
    }
    // We couldn't actually resolve the charge (fee service unreachable / not
    // configured / setup failed) — don't tell the customer there's no fee, since
    // there may be one. Only fall through to the affirmative "no charge" line
    // when the fee service authoritatively returned a serviced $0 (flag 'none').
    if (flag === 'fee-service-unreachable' || flag === 'not-configured' || flag === 'fee-setup-failed') {
      return 'We could not confirm the on-site consultation charge for your area right now. You can still submit — our office will confirm any charge when scheduling.';
    }
    return 'No on-site consultation charge applies for this service.';
  }

  async function init() {
    phase = 'loading';
    payError = '';
    intakeStore.resetPayment();
    try {
      const res = await fetch('/api/payment/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, jobTypeName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load the fee');

      amount = Number(data.amount) || 0;
      currency = data.currency || 'usd';
      zoneName = data.zoneName ?? null;
      const flag = data.flag ?? 'none';

      intakeStore.setFeeQuote({
        serviced: data.serviced === true || data.paymentRequired === true,
        osc: amount,
        currency,
        zoneName,
        flag,
        paymentRequired: data.paymentRequired === true
      });

      if (!data.paymentRequired) {
        infoText = nonPaymentMessage(flag, amount);
        phase = 'info';
        return;
      }

      createdIntentId = data.paymentIntentId ?? '';
      stripe = await loadStripe(data.publishableKey);
      if (!stripe) throw new Error('Could not load the payment form');
      elements = stripe.elements({ clientSecret: data.clientSecret, appearance: { theme: 'stripe' } });
      const paymentElement = elements.create('payment');
      phase = 'card';
      await tick();
      paymentElement.mount(cardNode);
    } catch (err) {
      // Degrade soft — a payment-setup problem must never block a real lead.
      console.error('[PaymentStep] setup failed', err);
      intakeStore.setFeeQuote({ serviced: false, osc: amount, currency, zoneName, flag: 'fee-setup-failed', paymentRequired: false });
      infoText =
        'We could not set up online payment right now. You can still submit — our office will confirm any on-site consultation charge when scheduling.';
      phase = 'info';
    }
  }

  async function payAndSubmit() {
    if (!stripe || !elements) return;
    phase = 'submitting';
    payError = '';
    const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
    console.log('[PaymentStep] confirmPayment →', { error: error?.message, status: paymentIntent?.status, id: paymentIntent?.id });
    if (error) {
      payError = error.message ?? 'Payment failed. Please check your card details.';
      phase = 'card';
      return;
    }
    if (!paymentIntent || (paymentIntent.status !== 'requires_capture' && paymentIntent.status !== 'succeeded')) {
      payError = 'Your card was not authorized. Please try again.';
      phase = 'card';
      return;
    }
    // Use the id we created server-side as the source of truth (falls back to
    // confirmPayment's echo).
    intakeStore.setPaymentAuthorized(paymentIntent.id || createdIntentId);
    const ok = await intakeStore.submit();
    if (!ok) {
      // The server releases the authorization hold when booking fails, so re-arm
      // with a fresh authorization for another attempt.
      payError = state.submitError || 'We could not submit your request. Please try again.';
      await init();
    }
    // On success the wizard advances to the confirmation step and this unmounts.
  }

  onMount(() => {
    init();
  });
</script>

<section class="checkout" aria-live="polite">
  <h3>On-site consultation charge</h3>

  {#if phase === 'loading'}
    <p class="muted">Checking the charge for your area…</p>
  {:else if phase === 'info'}
    <p class="muted">{infoText}</p>
  {:else}
    <p class="amount-line">
      Due now: <strong>{money(amount)}</strong>
      {#if zoneName}<span class="muted"> · {zoneName}</span>{/if}
    </p>
    <p class="muted small">
      We authorize a {money(amount)} hold on your card now; it's charged when your request is submitted.
      If we can't book your request, the hold is released.
    </p>

    <div class="card-field" bind:this={cardNode}></div>

    {#if payError}<p class="pay-error">{payError}</p>{/if}

    <button type="button" class="primary pay-btn" on:click={payAndSubmit} disabled={phase === 'submitting'}>
      {phase === 'submitting' ? 'Processing…' : `Pay ${money(amount)} & submit request`}
    </button>
  {/if}
</section>

<style>
  .checkout {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem 1.1rem;
    display: grid;
    gap: 0.6rem;
  }

  h3 {
    margin: 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    font-weight: 700;
  }

  .amount-line {
    margin: 0;
    font-size: 1.05rem;
  }
  .amount-line strong {
    font-size: 1.2rem;
  }

  .muted {
    color: var(--color-muted);
    margin: 0;
  }
  .small {
    font-size: 0.82rem;
    line-height: 1.45;
  }

  .card-field {
    margin-top: 0.2rem;
  }

  .pay-error {
    color: var(--color-emergency);
    margin: 0;
    font-size: 0.9rem;
  }

  .pay-btn {
    margin-top: 0.3rem;
    padding: 0.85rem 1.3rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    background: var(--color-primary);
    color: #fff;
    width: 100%;
  }
  .pay-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  .pay-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }
</style>
