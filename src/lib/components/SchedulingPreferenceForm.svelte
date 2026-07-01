<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import { canUpgradeToPriority } from '$lib/triage/triageTree';
  import { getPublicJobType } from '$lib/data/jobTypes';
  import PriorityBadge from './PriorityBadge.svelte';
  import type { SchedulingPreference } from '$lib/types/intake';

  export let value: SchedulingPreference;

  // "As soon as possible / Today / Tomorrow" were removed on purpose — urgency is
  // funneled into the paid Priority option below rather than promised for free.
  const options: SchedulingPreference[] = ['This week', 'Next week', 'Flexible'];
  const priority = getPublicJobType('Priority Service (Business Hours)');

  $: state = $intakeStore;
  // Priority availability keys off the ORIGINAL job — choosing it swaps
  // selectedJobType to Priority Service, which is itself not upgradeable.
  $: canPriority = !state.isEmergency && canUpgradeToPriority(state.originalJobType ?? state.selectedJobType);
  $: priorityChosen = state.priorityUpgrade;

  // Priority is now the first timing option, not an add-on: picking it swaps in
  // Priority Service and clears any standard window; picking a window backs it out.
  function choosePriority() {
    intakeStore.acceptPriorityUpgrade();
    intakeStore.setSchedulingPreference('');
  }

  function selectWindow(option: SchedulingPreference) {
    if (priorityChosen) intakeStore.declinePriorityUpgrade();
    intakeStore.setSchedulingPreference(option);
  }
</script>

{#if state.isEmergency}
  <p class="emergency-note">
    This is an urgent request — there's no need to pick a window. A dispatcher will reach out right
    away to confirm and send a professional as fast as possible.
  </p>
{:else}
  <p class="note">
    This is a contact / visit preference — not final installation scheduling. Our team will confirm
    the appointment.
  </p>

  <div class="grid">
    {#if canPriority}
      <button
        type="button"
        class="tile priority"
        class:active={priorityChosen}
        on:click={choosePriority}
      >
        <span class="tile-head">
          <span class="tile-title">Priority Service</span>
          <PriorityBadge priority="Urgent" />
        </span>
        <span class="tile-desc">A professional on-site within 2 hours during business hours.</span>
        <span class="chips">
          <span class="chip price">{priority.pricing?.display ?? '$399'}</span>
          {#if priority.pricing?.rebate}
            <span class="chip rebate">{priority.pricing.rebate}</span>
          {/if}
        </span>
        {#if priorityChosen}
          <span class="tile-selected">✓ Selected — review the charge on the next step.</span>
        {/if}
      </button>
    {/if}

    {#each options as option (option)}
      <button
        type="button"
        class="tile"
        class:active={!priorityChosen && value === option}
        on:click={() => selectWindow(option)}
      >
        {option}
      </button>
    {/each}
  </div>
{/if}

<style>
  .note {
    margin: 0 0 0.85rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .emergency-note {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md);
    background: var(--color-emergency-bg);
    color: var(--color-emergency);
    font-weight: 600;
    line-height: 1.45;
  }

  .grid {
    display: grid;
    gap: 0.55rem;
  }

  .tile {
    padding: 0.85rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    font-weight: 600;
    color: var(--color-text);
    text-align: left;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .tile:hover {
    border-color: var(--color-primary);
  }

  .tile.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
  }

  /* Priority is a peer timing option, styled to stand out as the premium pick. */
  .tile.priority {
    display: grid;
    gap: 0.5rem;
    border: 1.5px solid var(--color-primary);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 80%);
  }

  .tile.priority.active {
    border-color: var(--color-accent);
    background: var(--color-accent-bg);
  }

  .tile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .tile-title {
    font-weight: 700;
    font-size: 1.02rem;
  }

  .tile-desc {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .chips {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .chip {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .chip.price {
    background: var(--color-primary);
    color: #fff;
  }

  .chip.rebate {
    background: var(--color-accent-bg);
    color: var(--color-accent);
  }

  .tile-selected {
    font-weight: 600;
    color: var(--color-accent);
    font-size: 0.9rem;
  }
</style>
