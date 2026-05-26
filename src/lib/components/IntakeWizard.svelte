<script lang="ts">
  import { intakeStore, currentTriageNode, type WizardStep } from '$lib/stores/intakeStore';
  import QuestionCard from './QuestionCard.svelte';
  import ProgressIndicator from './ProgressIndicator.svelte';
  import PropertyTypeForm from './PropertyTypeForm.svelte';
  import CustomerInfoForm from './CustomerInfoForm.svelte';
  import AddressForm from './AddressForm.svelte';
  import IssueDetailsForm from './IssueDetailsForm.svelte';
  import PhotoUploadMock from './PhotoUploadMock.svelte';
  import SchedulingPreferenceForm from './SchedulingPreferenceForm.svelte';
  import ReviewSubmission from './ReviewSubmission.svelte';
  import ConfirmationScreen from './ConfirmationScreen.svelte';
  import PriorityBadge from './PriorityBadge.svelte';

  const stepLabels: Record<WizardStep, string> = {
    triage: 'Tell us what you need',
    'property-type': 'Property type',
    customer: 'Your contact info',
    address: 'Service address',
    'issue-details': 'Issue details',
    photos: 'Photos (optional)',
    scheduling: 'When works best',
    review: 'Review & submit',
    confirmation: 'Done'
  };

  const stepOrder: WizardStep[] = [
    'triage',
    'property-type',
    'customer',
    'address',
    'issue-details',
    'photos',
    'scheduling',
    'review'
  ];

  let attemptedAdvance = false;

  function isStepValid(state: typeof $intakeStore): boolean {
    switch (state.step) {
      case 'property-type':
        return !!state.propertyType;
      case 'customer':
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
      case 'issue-details':
        return (
          state.issueDetails.description.trim().length >= 5 &&
          state.issueDetails.happenedAt.trim() !== ''
        );
      case 'photos':
        return true;
      case 'scheduling':
        return !!state.schedulingPreference;
      case 'review':
        return true;
      default:
        return true;
    }
  }

  function next() {
    if (!isStepValid($intakeStore)) {
      attemptedAdvance = true;
      return;
    }
    attemptedAdvance = false;
    intakeStore.advance();
  }

  function back() {
    attemptedAdvance = false;
    intakeStore.goBack();
  }

  async function submit() {
    await intakeStore.submit();
  }

  function reset() {
    intakeStore.reset();
    attemptedAdvance = false;
  }

  $: state = $intakeStore;
  $: node = $currentTriageNode;
  $: currentStepIndex = stepOrder.indexOf(state.step as WizardStep);
  $: totalSteps = stepOrder.length;
  $: showProgress = state.step !== 'confirmation';
  $: canGoBack =
    state.step !== 'confirmation' &&
    (state.step !== 'triage' || state.history.length > 0);
</script>

<div class="wizard">
  {#if showProgress}
    <ProgressIndicator
      stepLabel={stepLabels[state.step]}
      current={Math.max(1, currentStepIndex + 1)}
      total={totalSteps}
    />
  {/if}

  {#if state.selectedJobType && state.step !== 'triage' && state.step !== 'confirmation'}
    <div class="routed" class:emergency={state.isEmergency}>
      <div>
        <span class="label">Routed to</span>
        <strong>{state.selectedJobType.name}</strong>
      </div>
      <PriorityBadge priority={state.selectedJobType.priority} />
    </div>
  {/if}

  <div class="step-body">
    {#if state.step === 'triage' && node}
      <QuestionCard {node} onSelect={(option) => intakeStore.selectOption(option)} />
    {:else if state.step === 'property-type'}
      <h2>What type of property is this for?</h2>
      <PropertyTypeForm value={state.propertyType} />
      {#if attemptedAdvance && !isStepValid(state)}
        <p class="form-error">Select a property type to continue.</p>
      {/if}
    {:else if state.step === 'customer'}
      <h2>How can we reach you?</h2>
      <CustomerInfoForm value={state.customer} showErrors={attemptedAdvance} />
    {:else if state.step === 'address'}
      <h2>Where is the service needed?</h2>
      <AddressForm value={state.address} showErrors={attemptedAdvance} />
    {:else if state.step === 'issue-details'}
      <h2>Tell us about the issue</h2>
      <IssueDetailsForm value={state.issueDetails} showErrors={attemptedAdvance} />
    {:else if state.step === 'photos'}
      <h2>Add photos (optional)</h2>
      <PhotoUploadMock photos={state.uploadedPhotos} />
    {:else if state.step === 'scheduling'}
      <h2>When would you prefer to be contacted or seen?</h2>
      <SchedulingPreferenceForm value={state.schedulingPreference} />
      {#if attemptedAdvance && !isStepValid(state)}
        <p class="form-error">Pick a preferred window to continue.</p>
      {/if}
    {:else if state.step === 'review'}
      <h2>Review your request</h2>
      <ReviewSubmission {state} />
      {#if state.submitError}
        <p class="form-error">{state.submitError}</p>
      {/if}
    {:else if state.step === 'confirmation'}
      <ConfirmationScreen
        confirmationNumber={state.confirmationNumber ?? ''}
        jobName={state.selectedJobType?.name ?? ''}
        priority={state.selectedJobType?.priority ?? ''}
        duration={state.selectedJobType?.duration ?? ''}
        isEmergency={state.isEmergency}
        isDuringBusinessHours={state.isDuringBusinessHours}
        onReset={reset}
      />
    {/if}
  </div>

  {#if state.step !== 'triage' && state.step !== 'confirmation'}
    <div class="actions">
      <button type="button" class="ghost" on:click={back} disabled={!canGoBack}>Back</button>
      {#if state.step === 'review'}
        <button type="button" class="primary" on:click={submit} disabled={state.submitting}>
          {state.submitting ? 'Submitting…' : 'Submit request'}
        </button>
      {:else}
        <button type="button" class="primary" on:click={next}>Continue</button>
      {/if}
    </div>
  {:else if state.step === 'triage' && canGoBack}
    <div class="actions left">
      <button type="button" class="ghost" on:click={back}>Back</button>
    </div>
  {/if}
</div>

<style>
  .wizard {
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .routed {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
    background: #eef4fb;
    border: 1px solid #cfdef0;
    border-radius: var(--radius-md);
  }

  .routed.emergency {
    background: var(--color-emergency-bg);
    border-color: #f5c2bb;
  }

  .routed .label {
    display: block;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
  }

  .routed strong {
    color: var(--color-text);
    line-height: 1.25;
  }

  .step-body h2 {
    margin: 0 0 0.85rem;
    font-size: 1.4rem;
  }

  .form-error {
    color: var(--color-emergency);
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
  }

  .actions {
    display: flex;
    gap: 0.6rem;
    justify-content: space-between;
    margin-top: 0.25rem;
  }

  .actions.left {
    justify-content: flex-start;
  }

  .primary,
  .ghost {
    padding: 0.8rem 1.2rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    min-width: 110px;
  }

  .primary {
    background: var(--color-primary);
    color: #fff;
  }

  .primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
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
    .step-body h2 {
      font-size: 1.2rem;
    }
    .actions {
      flex-direction: column-reverse;
    }
    .primary,
    .ghost {
      width: 100%;
    }
  }
</style>
