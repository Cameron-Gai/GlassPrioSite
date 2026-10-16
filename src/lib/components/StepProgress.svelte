<script lang="ts">
  /**
   * Where the customer is in the form (design picked 2026-10-16, both sites).
   * Computers get five named steps; phones get a bold bar with "Step 2 of 5 ·
   * Details". This replaces the earlier no-progress-meter rule — Jim asked for
   * a bold bar, and ServiceTitan's own scheduler names its steps the same way.
   *
   * The wizard has more screens than this shows: property type, issue and
   * access all count as "Details". Emergencies skip timing, so their last
   * step reads "Dispatch" and fills in at review.
   */
  import { stepsFor, type IntakeState, type WizardStep } from '$lib/stores/intakeStore';

  export let state: IntakeState;

  const NAMES = ['Service', 'Details', 'Address', 'Contact', 'Time'];
  const GROUP: Record<WizardStep, number> = {
    triage: 0,
    'property-type': 1,
    issue: 1,
    site: 1,
    address: 2,
    contact: 3,
    scheduling: 4,
    review: 5,
    confirmation: 6
  };

  $: idx = GROUP[state.step];
  $: names = state.isEmergency ? ['Service', 'Details', 'Address', 'Contact', 'Dispatch'] : NAMES;
  $: total = state.isEmergency ? 4 : 5;
  // Share of the form done: whole screens through stepsFor(), plus a nudge
  // per triage answer since triage is several questions on one step.
  $: pct = progressPct(state);
  $: phoneLabel = state.step === 'review' ? 'Review' : names[Math.min(idx, 4)];
  $: phoneStep = Math.min(idx + 1, total);

  function progressPct(s: IntakeState): number {
    const steps: WizardStep[] = stepsFor(s).filter((st) => st !== 'confirmation');
    const at = Math.max(0, steps.indexOf(s.step));
    const within = s.step === 'triage' ? Math.min(s.triageHistory.length, 2) / 3 : 0;
    return Math.max(6, Math.round(((at + within) / steps.length) * 100));
  }
</script>

{#if state.step !== 'confirmation'}
  <ol class="sp-desk" aria-label="Progress">
    {#each names as name, i}
      {@const skippedDone = state.isEmergency && i === 4 && idx >= 5}
      <li
        class:done={i < idx || skippedDone}
        class:on={i === idx}
        aria-current={i === idx ? 'step' : undefined}
      >
        {name}
      </li>
    {/each}
  </ol>

  <div class="sp-phone">
    <div class="sp-meta">
      <span>Step {phoneStep} of {total} · {phoneLabel}</span>
      <span>About 2 minutes</span>
    </div>
    <div
      class="sp-bar"
      role="progressbar"
      aria-label="Form progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={pct}
    >
      <i style="width: {pct}%"></i>
    </div>
  </div>
{/if}

<style>
  .sp-desk {
    display: none;
    list-style: none;
    margin: 0;
    padding: 0;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.4rem;
  }

  .sp-desk li {
    display: grid;
    gap: 0.4rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-muted);
  }

  .sp-desk li::before {
    content: '';
    height: 6px;
    border-radius: 4px;
    background: var(--color-primary-soft);
  }

  .sp-desk li.done::before {
    background: var(--color-primary);
  }

  .sp-desk li.on {
    color: var(--color-text-strong);
  }

  .sp-desk li.on::before {
    background: linear-gradient(90deg, var(--color-primary) 50%, var(--color-primary-soft-strong) 50%);
  }

  .sp-phone {
    display: grid;
    gap: 0.4rem;
  }

  .sp-meta {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--color-muted);
  }

  .sp-bar {
    height: 11px;
    border-radius: 999px;
    background: var(--color-primary-soft);
    overflow: hidden;
  }

  .sp-bar i {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: var(--color-primary-gradient);
    transition: width 0.35s ease;
  }

  @media (prefers-reduced-motion: reduce) {
    .sp-bar i {
      transition: none;
    }
  }

  @media (min-width: 960px) {
    .sp-desk {
      display: grid;
    }

    .sp-phone {
      display: none;
    }
  }
</style>
