<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { loadStripe } from '@stripe/stripe-js';
  import type { Stripe, StripeElements } from '@stripe/stripe-js';
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { IntakeState } from '$lib/stores/intakeStore';
  import { formatUsPhoneInput } from '$lib/utils/phone';
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
  /** The three peer ways to handle the charge: card now, texted link later,
   *  or a remote consultation that waives the visit charge entirely. */
  type PayChoice = 'now' | 'later' | 'remote';
  let payChoice: PayChoice = 'now';
  /** False when GlassReports' OSC collection pipeline is off — the pay-by-text
   *  promise can't be made because nothing would send the link. */
  let payLaterAvailable = true;
  let remoteError = '';
  /** Pay-later needs an explicit texting consent (the text IS the collection
   *  channel) and lets the customer point the link at a different number. */
  let payPhone = '';
  let payConsent = false;
  let payLaterError = '';
  const PHONE_OK = /^[0-9+\-\s().]{7,}$/;

  // Autofill the pay-by-text number from the contact phone on first open.
  $: if (payChoice === 'later' && !payPhone.trim()) {
    payPhone = state.payLaterPhone || state.customer.phone;
  }

  function onPayPhoneInput(event: Event & { currentTarget: HTMLInputElement }) {
    const formatted = formatUsPhoneInput(payPhone, event.currentTarget.value);
    event.currentTarget.value = formatted;
    payPhone = formatted;
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

  // Facility maintenance companies pay nothing upfront (mirrors the phone
  // channel): the job bills against their work order, so no Stripe intent is
  // ever created — we only fetch the charge amount to state it.
  const isFacilityMaintenance = state.propertyType === 'Facility maintenance';

  async function initFacilityMaintenance() {
    phase = 'loading';
    intakeStore.resetPayment();
    let osc = 0;
    let fmZone: string | null = null;
    let serviced = false;
    let flag = 'fee-service-unreachable';
    try {
      const res = await fetch(
        `/api/quote?zip=${encodeURIComponent(zip)}&jobTypeName=${encodeURIComponent(jobTypeName)}`
      );
      if (res.ok) {
        const data = await res.json();
        osc = Number(data.osc) || 0;
        fmZone = data.zoneName ?? null;
        serviced = data.serviced === true;
        flag = data.flag ?? 'none';
      }
    } catch {
      // Fall through — the office confirms the amount with the work order.
    }
    intakeStore.setFeeQuote({ serviced, osc, currency: 'usd', zoneName: fmZone, flag, paymentRequired: false });
    const wo = state.propertyDetails.workOrderNumber.trim();
    const woNote = wo
      ? `work order ${wo}`
      : "your work order — we'll confirm the number with you";
    if (serviced && osc > 0) {
      infoText = `No payment is needed now. The ${money(osc)} on-site consultation charge for your area (plus sales tax) bills against ${woNote}. Nothing is collected upfront.`;
    } else if (serviced && flag === 'none') {
      infoText = `No on-site consultation charge applies for this service — and as a facility maintenance company, nothing is collected upfront.`;
    } else {
      infoText = `No upfront payment for facility maintenance companies. Any consultation charge for your area bills against ${woNote}; our office will confirm the amount.`;
    }
    phase = 'info';
  }

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
    if (isFacilityMaintenance) {
      await initFacilityMaintenance();
      return;
    }
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
      payLaterAvailable = data.payLaterAvailable !== false;
      if (!payLaterAvailable && payChoice === 'later') payChoice = 'now';

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
      On-site charge: <strong>{money(amount)}</strong>{#if taxAmount > 0}<span class="tax-note"> (includes {money(taxAmount)} sales tax)</span>{/if}
      {#if zoneName}<span class="muted"> · {zoneName}</span>{/if}
    </p>

    <!-- The three ways to handle the charge, presented as peers — the remote
         option is a real choice, not fine print. -->
    <div class="choices" role="radiogroup" aria-label="How would you like to handle the charge?">
      <button
        type="button"
        role="radio"
        aria-checked={payChoice === 'now'}
        class="choice"
        class:active={payChoice === 'now'}
        on:click={() => (payChoice = 'now')}
        disabled={phase === 'submitting'}
      >
        <span class="choice-title">Pay now</span>
        <span class="choice-sub">Done in 30 seconds — nothing to chase later.</span>
      </button>
      {#if payLaterAvailable}
        <button
          type="button"
          role="radio"
          aria-checked={payChoice === 'later'}
          class="choice"
          class:active={payChoice === 'later'}
          on:click={() => (payChoice = 'later')}
          disabled={phase === 'submitting'}
        >
          <span class="choice-title">Text me a payment link</span>
          <span class="choice-sub">A secure link arrives once your appointment is scheduled.</span>
        </button>
      {/if}
      <button
        type="button"
        role="radio"
        aria-checked={payChoice === 'remote'}
        class="choice"
        class:active={payChoice === 'remote'}
        on:click={() => (payChoice = 'remote')}
        disabled={phase === 'submitting'}
      >
        <span class="choice-title">Remote consultation first</span>
        <span class="choice-sub">No charge unless we send a technician on-site. Needs a photo.</span>
      </button>
    </div>

    <!-- Pay now: stays in the DOM even when hidden — the Stripe element is
         mounted here and must not be destroyed by switching options. -->
    <div class="panel" class:hidden={payChoice !== 'now'}>
      <p class="muted small">
        We authorize a {money(amount)} hold on your card now; it's charged when your request is
        submitted. If we can't book your request, the hold is released.
      </p>
      <div class="card-field" bind:this={cardNode}></div>
      {#if payError && payChoice === 'now'}<p class="pay-error">{payError}</p>{/if}
      <button type="button" class="primary pay-btn" on:click={payAndSubmit} disabled={phase === 'submitting'}>
        {phase === 'submitting' ? 'Processing…' : `Pay ${money(amount)} & submit request`}
      </button>
    </div>

    {#if payChoice === 'later'}
      <div class="panel">
        <p class="muted small">
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
            value={payPhone}
            on:input={onPayPhoneInput}
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
        {#if payError}<p class="pay-error">{payError}</p>{/if}
        <button
          type="button"
          class="panel-submit"
          on:click={payLaterAndSubmit}
          disabled={phase === 'submitting' || !payConsent}
        >
          {phase === 'submitting' ? 'Submitting…' : 'Submit request — text me the payment link'}
        </button>
      </div>
    {/if}

    {#if payChoice === 'remote'}
      <div class="panel">
        <p class="muted small">
          We'll review your photos first and only charge the {money(amount)} if we need to send a
          technician on-site. At least one photo is required.
        </p>
        <PhotoUploadMock photos={state.issueDetails.photos} />
        {#if remoteError}<p class="pay-error">{remoteError}</p>{/if}
        {#if payError}<p class="pay-error">{payError}</p>{/if}
        <button
          type="button"
          class="panel-submit"
          on:click={remoteAndSubmit}
          disabled={phase === 'submitting'}
        >
          {phase === 'submitting' ? 'Submitting…' : 'Submit for remote consultation — no charge now'}
        </button>
      </div>
    {/if}
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

  /* Peer payment-choice cards. */
  .choices {
    display: grid;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }

  .choice {
    display: grid;
    gap: 0.15rem;
    text-align: left;
    padding: 0.7rem 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .choice:hover:not(:disabled) {
    border-color: var(--color-primary);
  }

  .choice:active:not(:disabled) {
    transform: scale(0.99);
  }

  .choice.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    box-shadow: var(--shadow-sm);
  }

  .choice-title {
    font-weight: 700;
    font-size: 0.94rem;
    color: var(--color-text);
  }

  .choice.active .choice-title {
    color: var(--color-primary);
  }

  .choice-sub {
    font-size: 0.82rem;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .panel {
    display: grid;
    gap: 0.6rem;
    margin-top: 0.3rem;
    padding-top: 0.7rem;
    border-top: 1px solid var(--color-border);
  }

  .panel.hidden {
    display: none;
  }

  .panel-submit {
    justify-self: start;
    margin-top: 0.2rem;
    padding: 0.7rem 1.1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    background: var(--color-surface-tint, var(--color-primary-soft));
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
    transition: background 0.15s ease, transform 0.1s ease;
  }

  .panel-submit:hover:not(:disabled) {
    background: var(--color-primary-soft);
  }

  .panel-submit:active:not(:disabled) {
    transform: scale(0.99);
  }

  .panel-submit:disabled {
    opacity: 0.6;
    cursor: default;
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

</style>
