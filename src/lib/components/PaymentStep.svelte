<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import type { Stripe, StripeElements } from '@stripe/stripe-js';
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { IntakeState } from '$lib/stores/intakeStore';
  import PhotoUploadMock from './PhotoUploadMock.svelte';

  export let state: IntakeState;

  type Phase = 'loading' | 'info' | 'card' | 'submitting';
  let phase: Phase = 'loading';
  let amount = 0;
  let taxAmount = 0;
  let currency = 'usd';
  let zoneName: string | null = null;
  let infoText = '';
  let payError = '';
  /** Remote-consultation opt-in: waive the on-site charge, require a photo. */
  let showRemote = false;
  let remoteError = '';
  /** Pay-later panel: needs an explicit texting consent (the text IS the
   *  collection channel) and lets the customer point the link at a different
   *  number than their contact phone. */
  let showPayLater = false;
  let payPhone = '';
  let payConsent = false;
  let payLaterError = '';
  const PHONE_OK = /^[0-9+\-\s().]{7,}$/;

  function togglePayLater() {
    showPayLater = !showPayLater;
    if (showPayLater && !payPhone.trim()) {
      // Autofill from the contact phone; the customer can overwrite it.
      payPhone = state.payLaterPhone || state.customer.phone;
    }
  }
  /** Operator-facing diagnostic. Only rendered when the server reports
   *  debug mode (PAYMENT_DEBUG=true), so customers never see internals. */
  let diagnostic = '';
  let debugMode = false;

  let stripe: Stripe | null = null;
  let elements: StripeElements | null = null;
  let cardNode: HTMLDivElement;
  /** The PaymentIntent id we created server-side — used as the authoritative id
   *  regardless of what confirmPayment echoes back. */
  let createdIntentId = '';

  const zip = state.address.zip.trim();
  const jobTypeName = state.selectedJobType?.name ?? '';
  const money = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

  function nonPaymentMessage(flag: string, amt: number): string {
    if (flag === 'unserviced-or-unknown') {
      return 'We could not match your ZIP to a service area. You can still submit — our office will confirm coverage and any fee when scheduling.';
    }
    if (flag === 'payment-not-configured' || flag === 'payment-unavailable' || amt > 0) {
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
        // Street + city let the server quote sales tax for the exact address
        // (ZIP-only falls back to the ZIP's default jurisdiction); email + name
        // let Stripe group the payment under a Customer and send a receipt.
        body: JSON.stringify({
          zip,
          jobTypeName,
          street: state.address.street,
          city: state.address.city,
          email: state.customer.email,
          name: `${state.customer.firstName} ${state.customer.lastName}`.trim()
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not load the fee');

      amount = Number(data.amount) || 0;
      taxAmount = Number(data.taxAmount) || 0;
      currency = data.currency || 'usd';
      zoneName = data.zoneName ?? null;
      const flag = data.flag ?? 'none';
      debugMode = data.debug === true;

      // Operator diagnostics: the server attaches a stable `code` for any
      // collect-later outcome, plus a verbose `reason` only when PAYMENT_DEBUG is
      // on. Always log it to the console; surface it in-UI only when sent.
      if (data.code) {
        console.warn(`[PaymentStep] online payment not collected [${data.code}]${data.reason ? ': ' + data.reason : ''}`);
      }
      diagnostic = data.reason ? `Payment setup (${data.code}): ${data.reason}` : '';

      intakeStore.setFeeQuote({
        serviced: data.serviced === true || data.paymentRequired === true,
        // The fee quote keeps the BASE on-site charge (zone map's number);
        // `amount` shown to the customer is base + sales tax.
        osc: Number(data.baseAmount) || amount,
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
      // (Server-side Stripe failures already degrade to a 200 collect-later
      // response; this catch handles client-side Stripe.js / network failures.)
      console.error('[PaymentStep] online payment setup failed', err);
      intakeStore.setFeeQuote({ serviced: amount > 0, osc: amount, currency, zoneName, flag: 'payment-unavailable', paymentRequired: false });
      // If we already know the charge, show it (better than a vague apology);
      // otherwise fall back to the generic confirm-at-scheduling line.
      infoText =
        amount > 0
          ? `An on-site consultation charge of ${money(amount)} applies for your area. Our office will collect it when scheduling.`
          : 'We could not confirm the on-site consultation charge right now. You can still submit — our office will confirm any charge when scheduling.';
      diagnostic = `Payment setup failed in the browser: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`[PaymentStep] ${diagnostic}`);
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

  /** "Pay later by text": submit unpaid. GlassReports texts the OSC payment link
   *  once the office converts the booking to a scheduled job. We never confirm the
   *  card here, so no hold is placed; the created intent simply expires unused.
   *  Requires the texting consent — without it there's no way to collect. */
  async function payLaterAndSubmit() {
    if (!payConsent) {
      payLaterError =
        'Please check the consent box first — texting is how we collect this charge, so we need your OK.';
      return;
    }
    if (!PHONE_OK.test(payPhone.trim())) {
      payLaterError = 'Enter a valid mobile number for the payment link.';
      return;
    }
    payLaterError = '';
    phase = 'submitting';
    payError = '';
    intakeStore.setPayLaterInfo({ phone: payPhone.trim(), consent: true });
    intakeStore.setPayLater(true);
    const ok = await intakeStore.submit();
    if (!ok) {
      intakeStore.setPayLater(false);
      payError = state.submitError || 'We could not submit your request. Please try again.';
      phase = 'card';
    }
    // On success the wizard advances to the confirmation step and this unmounts.
  }

  /** Remote consultation: waive the on-site charge (until we roll a truck) and
   *  submit unpaid. A photo is required, so we gate on it here. */
  async function remoteAndSubmit() {
    if (state.issueDetails.photos.length === 0) {
      remoteError = 'Please add at least one photo so we can start the remote consultation.';
      return;
    }
    remoteError = '';
    phase = 'submitting';
    payError = '';
    intakeStore.setRemoteConsult(true);
    const ok = await intakeStore.submit();
    if (!ok) {
      intakeStore.setRemoteConsult(false);
      payError = state.submitError || 'We could not submit your request. Please try again.';
      phase = 'card';
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
    {#if debugMode && diagnostic}
      <p class="diagnostic" role="note">⚠️ {diagnostic}</p>
    {/if}
  {:else}
    <p class="amount-line">
      Due now: <strong>{money(amount)}</strong>{#if taxAmount > 0}<span class="tax-note"> (includes {money(taxAmount)} sales tax)</span>{/if}
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

    <div class="later-row">
      <button
        type="button"
        class="later-btn"
        aria-expanded={showPayLater}
        on:click={togglePayLater}
        disabled={phase === 'submitting'}
      >
        Pay later — text me the link
      </button>
      {#if showPayLater}
        <p class="muted small later-note">
          We'll submit your request now and text a secure payment link once your appointment is
          scheduled. The {money(amount)} is collected before we arrive.
        </p>
        <div class="pay-phone">
          <label for="payPhone">Text the payment link to</label>
          <input
            id="payPhone"
            type="tel"
            inputmode="tel"
            autocomplete="tel"
            placeholder="(206) 555-1234"
            bind:value={payPhone}
            disabled={phase === 'submitting'}
          />
        </div>
        <label class="consent">
          <input type="checkbox" bind:checked={payConsent} disabled={phase === 'submitting'} />
          <span>
            I agree to receive a text with a secure payment link at this number.
            <strong>This is how the {money(amount)} charge is collected, so pay-later needs this
            consent.</strong> Message and data rates may apply.
          </span>
        </label>
        {#if payLaterError}<p class="pay-error">{payLaterError}</p>{/if}
        <button
          type="button"
          class="remote-submit"
          on:click={payLaterAndSubmit}
          disabled={phase === 'submitting' || !payConsent}
        >
          Submit request — text me the payment link
        </button>
      {/if}
    </div>

    <div class="remote-row">
      <button
        type="button"
        class="later-btn"
        aria-expanded={showRemote}
        on:click={() => (showRemote = !showRemote)}
        disabled={phase === 'submitting'}
      >
        Prefer a remote consultation? Skip the {money(amount)} visit charge
      </button>
      {#if showRemote}
        <p class="muted small later-note">
          We'll review your photos first and only charge the {money(amount)} if we need to send a
          technician on-site. At least one photo is required.
        </p>
        <PhotoUploadMock photos={state.issueDetails.photos} />
        {#if remoteError}<p class="pay-error">{remoteError}</p>{/if}
        <button
          type="button"
          class="remote-submit"
          on:click={remoteAndSubmit}
          disabled={phase === 'submitting'}
        >
          Submit for remote consultation — no charge now
        </button>
      {/if}
    </div>
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
  .tax-note {
    font-size: 0.85em;
    color: var(--ink-3, #6b7280);
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

  /* Operator-only (PAYMENT_DEBUG): a precise, monospaced reason for why online
     collection didn't happen. Gated server-side so customers never see it. */
  .diagnostic {
    margin: 0.4rem 0 0;
    padding: 0.5rem 0.65rem;
    background: #fff7ed;
    border: 1px solid #fed7aa;
    border-radius: var(--radius-md);
    color: #9a3412;
    font-size: 0.8rem;
    font-family: var(--font-mono, ui-monospace, monospace);
    line-height: 1.4;
    word-break: break-word;
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

  .pay-btn:active:not(:disabled) {
    transform: scale(0.99);
  }
  .pay-btn:disabled {
    opacity: 0.7;
    cursor: default;
  }

  .later-row {
    display: grid;
    gap: 0.3rem;
    margin-top: 0.4rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--color-border);
  }

  .pay-phone {
    display: grid;
    gap: 0.25rem;
    margin-top: 0.3rem;
    max-width: 280px;
  }

  .pay-phone label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
  }

  .consent {
    display: flex;
    gap: 0.55rem;
    align-items: flex-start;
    margin-top: 0.45rem;
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--color-text);
  }

  .consent input {
    width: auto;
    margin: 0.15rem 0 0;
    flex-shrink: 0;
  }

  .later-btn {
    justify-self: start;
    background: transparent;
    color: var(--color-primary);
    font-weight: 600;
    padding: 0.4rem 0;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .later-btn:disabled {
    opacity: 0.6;
    cursor: default;
  }

  .later-note {
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .remote-row {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.4rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--color-border);
  }

  .remote-submit {
    justify-self: start;
    margin-top: 0.2rem;
    padding: 0.7rem 1.1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    background: var(--color-surface-tint, var(--color-primary-soft));
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }

  .remote-submit:hover:not(:disabled) {
    background: var(--color-primary-soft);
  }

  .remote-submit:disabled {
    opacity: 0.6;
    cursor: default;
  }
</style>
