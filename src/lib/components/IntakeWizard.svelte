<script lang="ts">
  import { onMount } from 'svelte';
  import {
    intakeStore,
    currentTriageNode,
    currentPhaseIndex,
    type WizardStep,
    type IntakeState
  } from '$lib/stores/intakeStore';
  import { testPresets } from '$lib/data/testPresets';
  import QuestionCard from './QuestionCard.svelte';
  import PhaseStepper from './PhaseStepper.svelte';
  import JobTypeBanner from './JobTypeBanner.svelte';
  import PropertyTypeForm from './PropertyTypeForm.svelte';
  import IssueDetailsForm from './IssueDetailsForm.svelte';
  import SiteAccessForm from './SiteAccessForm.svelte';
  import CustomerInfoForm from './CustomerInfoForm.svelte';
  import AddressForm from './AddressForm.svelte';
  import SchedulingPreferenceForm from './SchedulingPreferenceForm.svelte';
  import ReviewSubmission from './ReviewSubmission.svelte';
  import ConfirmationScreen from './ConfirmationScreen.svelte';

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';

  const stepLabels: Record<WizardStep, string> = {
    triage: 'Tell us what you need',
    'property-type': 'Property type',
    issue: "What's going on",
    site: 'Property & access',
    address: 'Service address',
    contact: 'Your contact info',
    scheduling: 'Timing',
    review: 'Review & submit',
    confirmation: 'Done'
  };

  function photosRequiredFor(state: IntakeState): boolean {
    return state.selectedJobType?.requiresPhoto === true;
  }

  function isStepValid(state: IntakeState): boolean {
    switch (state.step) {
      case 'property-type':
        return !!state.propertyType;
      case 'issue':
        // All issue-step fields are optional by design.
        return true;
      case 'site':
        return !photosRequiredFor(state) || state.issueDetails.photos.length > 0;
      case 'address':
        return (
          state.address.street.trim() !== '' &&
          state.address.city.trim() !== '' &&
          state.address.state.trim() !== '' &&
          /^\d{5}(-\d{4})?$/.test(state.address.zip.trim())
        );
      case 'contact':
        return (
          state.customer.firstName.trim() !== '' &&
          state.customer.lastName.trim() !== '' &&
          /^[0-9+\-\s().]{7,}$/.test(state.customer.phone.trim()) &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customer.email.trim())
        );
      case 'scheduling':
        // Emergencies skip picking a window (dispatch is immediate). Choosing
        // Priority Service is a valid timing pick even though it sets no window.
        return state.isEmergency ? true : !!state.schedulingPreference || state.priorityUpgrade;
      default:
        return true;
    }
  }

  let attempted = false;

  // --- Returning-customer lookup gating on the contact step -----------------
  // The lookup runs in the background once we have 2+ identifying fields, and the
  // customer can't leave the contact step until it resolves (or we give up).
  let lookupTimer: ReturnType<typeof setTimeout> | null = null;
  let slowTimer: ReturnType<typeof setTimeout> | null = null;
  let allowSkipCheck = false;

  function scheduleLookup(s: IntakeState) {
    if (s.step !== 'contact') {
      if (lookupTimer) {
        clearTimeout(lookupTimer);
        lookupTimer = null;
      }
      return;
    }
    if (s.returning.status !== 'idle') return;
    if (!intakeStore.canRunReturningLookup(s)) return;
    if (lookupTimer) clearTimeout(lookupTimer);
    lookupTimer = setTimeout(() => {
      lookupTimer = null;
      intakeStore.lookupReturningCustomer();
    }, 600);
  }

  // Escape hatch: if ServiceTitan is slow/unreachable, let them continue rather
  // than strand them on a spinner.
  function trackSlow(status: string) {
    if (status === 'checking') {
      if (!slowTimer) slowTimer = setTimeout(() => (allowSkipCheck = true), 5000);
    } else {
      if (slowTimer) {
        clearTimeout(slowTimer);
        slowTimer = null;
      }
      allowSkipCheck = false;
    }
  }

  function next() {
    const s = $intakeStore;
    if (!isStepValid(s)) {
      attempted = true;
      return;
    }
    attempted = false;
    if (s.step === 'contact') {
      const st = s.returning.status;
      if (st === 'idle') {
        intakeStore.lookupReturningCustomer();
        return;
      }
      if (st === 'checking' && !allowSkipCheck) return;
      if (st === 'found') return; // must answer the inline prompt first
    }
    intakeStore.advance();
  }

  function back() {
    attempted = false;
    intakeStore.goBack();
  }

  async function submit() {
    await intakeStore.submit();
  }

  function reset() {
    intakeStore.reset();
    attempted = false;
  }

  function confirmReturning() {
    // Stay on the step so the "linked" confirmation is visible; Continue advances.
    intakeStore.applyReturningCustomer();
  }

  function denyReturning() {
    intakeStore.dismissReturningCustomer();
  }

  // Test-mode + ServiceTitan availability come from the server. `serviceReady`
  // defaults true so the form shows instantly; a "down" response replaces it with
  // the call-us screen (rare, so a brief flash beats delaying every page load).
  let testMode = false;
  let serviceReady = true;

  onMount(async () => {
    // Restore any saved draft, then start persisting.
    intakeStore.hydrate();
    try {
      const res = await fetch('/api/config');
      if (res.ok) {
        const cfg = await res.json();
        testMode = cfg.testMode === true;
        serviceReady = cfg.serviceTitanReady !== false;
      }
    } catch {
      // Best-effort; leave the form enabled.
    }
  });

  $: state = $intakeStore;
  $: node = $currentTriageNode;
  $: phaseIdx = $currentPhaseIndex;
  $: photosRequired = photosRequiredFor(state);
  $: scheduleLookup(state);
  $: trackSlow(state.returning.status);
  $: canGoBack =
    state.step !== 'confirmation' &&
    (state.step !== 'triage' || state.triageHistory.length > 0);
  $: showBanner =
    state.selectedJobType &&
    state.step !== 'triage' &&
    state.step !== 'review' &&
    state.step !== 'confirmation';
</script>

{#if !serviceReady}
  <div class="down">
    <span class="down-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    </span>
    <h2>Online booking is briefly unavailable</h2>
    <p>Our scheduling system isn't reachable right now. Please give us a call and we'll get you taken care of right away.</p>
    <a class="call-btn" href={SUPPORT_PHONE_HREF}>Call {SUPPORT_PHONE}</a>
  </div>
{:else}
<div class="wizard">
  {#if testMode && state.step === 'triage'}
    <div class="test-presets">
      <p class="tp-title">🧪 Test mode — quick presets</p>
      <p class="tp-sub">
        Prefills a complete intake and jumps to review so you can submit a real booking to
        ServiceTitan. Charged presets use Stripe test card <code>4242 4242 4242 4242</code> (any future
        expiry / CVC). Hidden automatically when <code>STRIPE_MODE=live</code>.
      </p>
      <div class="tp-grid">
        {#each testPresets as preset (preset.id)}
          <button type="button" class="tp-btn" on:click={() => intakeStore.loadPreset(preset)}>
            <span class="tp-label">{preset.label}</span>
            <span class="tp-blurb">{preset.blurb}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  {#if state.step !== 'confirmation'}
    <div class="head">
      <PhaseStepper currentIndex={phaseIdx} />
      <p class="step-label">{stepLabels[state.step]}</p>
    </div>
  {/if}

  {#if showBanner && state.selectedJobType}
    <JobTypeBanner
      job={state.selectedJobType}
      isEmergency={state.isEmergency}
      isDuringBusinessHours={state.isDuringBusinessHours}
      priorityUpgrade={state.priorityUpgrade}
    />
  {/if}

  <div class="step-body">
    {#if state.step === 'triage' && node}
      <QuestionCard {node} onSelect={(option) => intakeStore.selectOption(option)} />
    {:else if state.step === 'property-type'}
      <header class="screen-head">
        <h2>What type of property is this for?</h2>
        <p>This helps us send the right team and pricing.</p>
      </header>
      <PropertyTypeForm value={state.propertyType} />
      {#if attempted && !isStepValid(state)}
        <p class="form-error">Please pick a property type to continue.</p>
      {/if}
    {:else if state.step === 'issue'}
      <header class="screen-head">
        <h2>Tell us what's going on</h2>
        <p>Be as specific as you can — it helps us route the right person.</p>
      </header>
      <IssueDetailsForm value={state.issueDetails} job={state.selectedJobType} />
    {:else if state.step === 'site'}
      <header class="screen-head">
        <h2>Access &amp; photos</h2>
        <p>This helps our team get to you and triage faster.</p>
      </header>
      <SiteAccessForm
        special={state.specialInstructions}
        photos={state.issueDetails.photos}
        {photosRequired}
        showErrors={attempted}
      />
    {:else if state.step === 'address'}
      <header class="screen-head">
        <h2>Where is the service needed?</h2>
      </header>
      <AddressForm value={state.address} showErrors={attempted} />
    {:else if state.step === 'contact'}
      <header class="screen-head">
        <h2>How can we reach you?</h2>
      </header>
      <CustomerInfoForm value={state.customer} showErrors={attempted} />

      {#if state.returning.status === 'checking'}
        <p class="rc-line checking" aria-live="polite">
          <span class="rc-spinner" aria-hidden="true"></span>
          Checking for your account…
          {#if allowSkipCheck}
            <button type="button" class="rc-skip" on:click={() => intakeStore.advance()}>Continue without waiting</button>
          {/if}
        </p>
      {:else if state.returning.status === 'found'}
        <div class="rc-prompt fade-in" aria-live="polite">
          <p class="rc-q">
            {#if state.returning.firstName}
              Welcome back, <strong>{state.returning.firstName}</strong>! Is this your account?
            {:else}
              We found an account matching your details. Is this you?
            {/if}
          </p>
          <p class="rc-sub">We'll link this request to your file and fill in anything you left blank.</p>
          <div class="rc-actions">
            <button type="button" class="rc-yes" on:click={confirmReturning}>Yes, that's me</button>
            <button type="button" class="rc-no" on:click={denyReturning}>No, I'm new here</button>
          </div>
        </div>
      {:else if state.returning.status === 'applied'}
        <p class="rc-line applied" aria-live="polite">
          ✓ Linked to your account{#if state.returning.firstName}, {state.returning.firstName}{/if} — we filled in any blanks. Double-check it's right, then continue.
        </p>
      {/if}
    {:else if state.step === 'scheduling'}
      <header class="screen-head">
        <h2>When would you prefer to be contacted or seen?</h2>
      </header>
      <SchedulingPreferenceForm value={state.schedulingPreference} />
      {#if attempted && !isStepValid(state)}
        <p class="form-error">Pick a timing option to continue.</p>
      {/if}
    {:else if state.step === 'review'}
      <header class="screen-head">
        <h2>Review your request</h2>
        <p>Double-check everything below, then submit.</p>
      </header>
      <ReviewSubmission {state} />
      {#if state.submitError && !state.feeQuote?.paymentRequired}
        <p class="form-error">
          {state.submitError}
          <br />
          You can also call us at <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a>.
        </p>
      {/if}
    {:else if state.step === 'confirmation'}
      <ConfirmationScreen {state} onReset={reset} />
    {/if}
  </div>

  {#if state.step !== 'confirmation'}
    {@const atReview = state.step === 'review'}
    {@const feeResolved = state.feeQuote !== null}
    {@const feeDue = state.feeQuote?.paymentRequired === true}
    <!-- When a fee is due the PaymentStep owns the "Pay & submit" button; the
         wizard only shows its own Submit for free/no-charge requests. -->
    {@const showWizardSubmit = atReview && feeResolved && !feeDue}
    {@const showFeeLoading = atReview && !feeResolved}
    {@const showContinue = !['triage', 'review'].includes(state.step)}
    {@const contactChecking =
      state.step === 'contact' && state.returning.status === 'checking' && !allowSkipCheck}
    {@const contactFound = state.step === 'contact' && state.returning.status === 'found'}
    {@const showActions = canGoBack || showWizardSubmit || showContinue || showFeeLoading}
    {#if showActions}
      <div class="actions" class:back-only={canGoBack && !showWizardSubmit && !showContinue && !showFeeLoading}>
        {#if canGoBack}
          <button type="button" class="ghost" on:click={back}>Back</button>
        {/if}
        {#if showWizardSubmit}
          <button type="button" class="primary" on:click={submit} disabled={state.submitting}>
            {state.submitting ? 'Submitting…' : 'Submit request'}
          </button>
        {:else if showFeeLoading}
          <button type="button" class="primary" disabled>Checking your area…</button>
        {:else if showContinue}
          <button
            type="button"
            class="primary"
            on:click={next}
            disabled={contactChecking || contactFound}
          >
            {contactChecking ? 'Checking your account…' : 'Continue'}
          </button>
        {/if}
      </div>
    {/if}
  {/if}
</div>
{/if}

<style>
  .wizard {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  /* ServiceTitan-down fallback — the whole form is replaced with a call-us card. */
  .down {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 0.6rem;
    padding: 1.5rem 1rem;
  }

  .down-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .down h2 {
    margin: 0;
    font-size: 1.35rem;
  }

  .down p {
    margin: 0;
    color: var(--color-muted);
    max-width: 420px;
  }

  .call-btn {
    margin-top: 0.4rem;
    display: inline-block;
    background: var(--color-primary);
    color: #fff;
    font-weight: 700;
    padding: 0.85rem 1.5rem;
    border-radius: var(--radius-md);
    text-decoration: none;
  }

  .call-btn:hover {
    background: var(--color-primary-hover);
  }

  /* Test-mode preset panel — dashed, high-contrast so it's obviously a dev tool. */
  .test-presets {
    border: 1.5px dashed #c026a3;
    background: #fdf4ff;
    border-radius: var(--radius-md);
    padding: 0.85rem 0.95rem;
    display: grid;
    gap: 0.5rem;
  }

  .tp-title {
    margin: 0;
    font-weight: 700;
    font-size: 0.9rem;
    color: #86198f;
  }

  .tp-sub {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.45;
    color: #6b2768;
  }

  .tp-sub code {
    background: #f5d0fe;
    border-radius: 4px;
    padding: 0.05rem 0.3rem;
    font-size: 0.92em;
  }

  .tp-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 0.5rem;
    margin-top: 0.15rem;
  }

  .tp-btn {
    display: grid;
    gap: 0.2rem;
    text-align: left;
    padding: 0.6rem 0.7rem;
    border: 1px solid #e9a5e3;
    border-radius: var(--radius-sm);
    background: #fff;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .tp-btn:hover {
    border-color: #c026a3;
    background: #fdf4ff;
  }

  .tp-label {
    font-weight: 600;
    font-size: 0.86rem;
    color: var(--color-text-strong, #1a1a2e);
  }

  .tp-blurb {
    font-size: 0.76rem;
    line-height: 1.35;
    color: var(--color-muted);
  }

  .head {
    display: grid;
    gap: 0.4rem;
  }

  .step-label {
    margin: 0;
    color: var(--color-text);
    font-weight: 600;
    font-size: 0.95rem;
  }

  .screen-head {
    display: grid;
    gap: 0.25rem;
    margin-bottom: 0.85rem;
  }

  .screen-head h2 {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.25;
  }

  .screen-head p {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .form-error {
    color: var(--color-emergency);
    margin: 0.6rem 0 0;
    font-size: 0.9rem;
  }

  .form-error a {
    color: var(--color-primary);
  }

  /* Returning-customer inline UI (folded into the contact step). */
  .rc-line {
    margin: 0.85rem 0 0;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .rc-line.checking {
    color: var(--color-muted);
  }

  .rc-line.applied {
    color: var(--color-accent);
    font-weight: 600;
  }

  .rc-spinner {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--color-primary-soft);
    border-top-color: var(--color-primary);
    animation: rc-spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes rc-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .rc-skip {
    color: var(--color-muted);
    font-size: 0.85rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .rc-skip:hover {
    color: var(--color-primary);
  }

  .rc-prompt {
    margin-top: 0.9rem;
    padding: 0.9rem 1rem;
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-md);
    background: var(--color-primary-soft);
    display: grid;
    gap: 0.35rem;
  }

  .rc-q {
    margin: 0;
    font-size: 1.02rem;
    font-weight: 600;
  }

  .rc-sub {
    margin: 0;
    font-size: 0.86rem;
    color: var(--color-muted);
  }

  .rc-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.35rem;
  }

  .rc-yes,
  .rc-no {
    padding: 0.6rem 1.1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
  }

  .rc-yes {
    background: var(--color-primary);
    color: #fff;
  }

  .rc-yes:hover {
    background: var(--color-primary-hover);
  }

  .rc-no {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-border);
  }

  .rc-no:hover {
    border-color: var(--color-primary);
  }

  .actions {
    display: flex;
    gap: 0.6rem;
    justify-content: space-between;
    margin-top: 0.4rem;
  }

  .actions.back-only {
    justify-content: flex-start;
  }

  .primary,
  .ghost {
    padding: 0.85rem 1.3rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    min-width: 120px;
    transition: background 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
  }

  .primary {
    background: var(--color-primary);
    color: #fff;
  }

  .primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .primary:disabled {
    opacity: 0.75;
    cursor: default;
  }

  .ghost {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-border);
  }

  .ghost:hover:not(:disabled) {
    border-color: var(--color-primary);
  }

  @media (max-width: 520px) {
    .screen-head h2 {
      font-size: 1.2rem;
    }
    .actions {
      flex-direction: column-reverse;
    }
    .actions.back-only {
      flex-direction: row;
    }
    .primary,
    .ghost {
      width: 100%;
    }
  }
</style>
