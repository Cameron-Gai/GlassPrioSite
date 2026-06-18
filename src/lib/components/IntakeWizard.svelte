<script lang="ts">
  import {
    intakeStore,
    currentTriageNode,
    currentPhaseIndex,
    type WizardStep
  } from '$lib/stores/intakeStore';
  import QuestionCard from './QuestionCard.svelte';
  import PhaseStepper from './PhaseStepper.svelte';
  import JobTypeBanner from './JobTypeBanner.svelte';
  import PriorityUpgradeAsk from './PriorityUpgradeAsk.svelte';
  import PropertyTypeForm from './PropertyTypeForm.svelte';
  import IssueDetailsForm from './IssueDetailsForm.svelte';
  import SiteAccessForm from './SiteAccessForm.svelte';
  import CustomerInfoForm from './CustomerInfoForm.svelte';
  import AddressForm from './AddressForm.svelte';
  import SchedulingPreferenceForm from './SchedulingPreferenceForm.svelte';
  import ReviewSubmission from './ReviewSubmission.svelte';
  import ConfirmationScreen from './ConfirmationScreen.svelte';

  const stepLabels: Record<WizardStep, string> = {
    triage: 'Tell us what you need',
    'property-type': 'Property type',
    'priority-upgrade': 'Choose your timing',
    issue: "What's going on",
    site: 'Property & access',
    contact: 'Your contact info',
    address: 'Service address',
    scheduling: 'When works best',
    review: 'Review & submit',
    confirmation: 'Done'
  };

  function isStepValid(state: typeof $intakeStore): boolean {
    switch (state.step) {
      case 'property-type':
        return !!state.propertyType;
      case 'issue':
        // All issue-step fields are optional by design — a nudge encourages
        // detail, but nothing here blocks the customer from continuing.
        return true;
      case 'site': {
        const photosRequired = state.selectedJobType?.consultationFormat === 'virtual';
        return !photosRequired || state.issueDetails.photos.length > 0;
      }
      case 'contact':
        return (
          state.customer.firstName.trim() !== '' &&
          state.customer.lastName.trim() !== '' &&
          /^[0-9+\-\s().]{7,}$/.test(state.customer.phone.trim()) &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.customer.email.trim())
        );
      case 'address':
        return (
          state.address.street.trim() !== '' &&
          state.address.city.trim() !== '' &&
          state.address.state.trim() !== '' &&
          /^\d{5}(-\d{4})?$/.test(state.address.zip.trim())
        );
      case 'scheduling':
        return !!state.schedulingPreference;
      default:
        return true;
    }
  }

  let attempted = false;

  function next() {
    if (!isStepValid($intakeStore)) {
      attempted = true;
      return;
    }
    attempted = false;
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

  $: state = $intakeStore;
  $: node = $currentTriageNode;
  $: phaseIdx = $currentPhaseIndex;
  $: photosRequired = state.selectedJobType?.consultationFormat === 'virtual';
  $: canGoBack =
    state.step !== 'confirmation' &&
    (state.step !== 'triage' || state.triageHistory.length > 0);
  $: showBanner =
    state.selectedJobType &&
    state.step !== 'triage' &&
    state.step !== 'priority-upgrade' &&
    state.step !== 'review' &&
    state.step !== 'confirmation';
</script>

<div class="wizard">
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
    {:else if state.step === 'priority-upgrade'}
      <PriorityUpgradeAsk />
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
    {:else if state.step === 'contact'}
      <header class="screen-head">
        <h2>How can we reach you?</h2>
      </header>
      <CustomerInfoForm value={state.customer} showErrors={attempted} />
    {:else if state.step === 'address'}
      <header class="screen-head">
        <h2>Where is the service needed?</h2>
      </header>
      <AddressForm value={state.address} showErrors={attempted} />
    {:else if state.step === 'scheduling'}
      <header class="screen-head">
        <h2>When would you prefer to be contacted or seen?</h2>
      </header>
      <SchedulingPreferenceForm value={state.schedulingPreference} />
      {#if attempted && !isStepValid(state)}
        <p class="form-error">Pick a preferred window to continue.</p>
      {/if}
    {:else if state.step === 'review'}
      <header class="screen-head">
        <h2>Review your request</h2>
        <p>Double-check everything below, then submit.</p>
      </header>
      <ReviewSubmission {state} />
      {#if state.submitError && !state.feeQuote?.paymentRequired}
        <p class="form-error">{state.submitError}</p>
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
    {@const showContinue = !['triage', 'priority-upgrade', 'review'].includes(state.step)}
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
          <button type="button" class="primary" on:click={next}>Continue</button>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .wizard {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
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
