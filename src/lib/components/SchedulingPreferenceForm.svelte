<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import { canUpgradeToPriority } from '$lib/triage/triageTree';
  import { getPublicJobType } from '$lib/data/jobTypes';
  import PriorityBadge from './PriorityBadge.svelte';
  import type { SchedulingPreference } from '$lib/types/intake';

  export let value: SchedulingPreference;

  // "As soon as possible / Today / Tomorrow" were removed on purpose — urgency is
  // funneled into the paid Priority upgrade below rather than promised for free.
  const options: SchedulingPreference[] = ['This week', 'Next week', 'Flexible'];
  const priority = getPublicJobType('Priority Service (Business Hours)');

  function select(option: SchedulingPreference) {
    intakeStore.setSchedulingPreference(option);
  }

  $: state = $intakeStore;
  // Upsell visibility keys off the ORIGINAL job — accepting swaps selectedJobType
  // to Priority Service, which is itself not upgradeable.
  $: canUpgrade = !state.isEmergency && canUpgradeToPriority(state.originalJobType ?? state.selectedJobType);
  $: upgraded = state.priorityUpgrade;

  function accept() {
    intakeStore.acceptPriorityUpgrade();
  }
  function undo() {
    intakeStore.declinePriorityUpgrade();
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
    {#each options as option (option)}
      <button
        type="button"
        class="tile"
        class:active={value === option}
        on:click={() => select(option)}
      >
        {option}
      </button>
    {/each}
  </div>

  {#if canUpgrade}
    <div class="upsell" class:accepted={upgraded}>
      <div class="upsell-head">
        <span class="upsell-title">Need it sooner?</span>
        <PriorityBadge priority="Urgent" />
      </div>
      <p class="upsell-body">
        Upgrade to <strong>Priority Service</strong> — a professional on-site within 2 hours during
        business hours.
      </p>
      <div class="chips">
        <span class="chip price">{priority.pricing?.display ?? '$399'}</span>
        {#if priority.pricing?.rebate}
          <span class="chip rebate">{priority.pricing.rebate}</span>
        {/if}
      </div>
      {#if upgraded}
        <p class="accepted-line">✓ Priority Service added. You can review the charge on the next step.</p>
        <button type="button" class="link-btn" on:click={undo}>Remove priority upgrade</button>
      {:else}
        <button type="button" class="accept-btn" on:click={accept}>Add Priority Service</button>
      {/if}
    </div>
  {/if}
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

  .upsell {
    margin-top: 1rem;
    display: grid;
    gap: 0.5rem;
    padding: 0.95rem 1.05rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-primary);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 80%);
    box-shadow: var(--shadow-sm);
  }

  .upsell.accepted {
    border-color: var(--color-accent);
    background: var(--color-accent-bg);
  }

  .upsell-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .upsell-title {
    font-weight: 700;
    font-size: 1.02rem;
  }

  .upsell-body {
    margin: 0;
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

  .accept-btn {
    justify-self: start;
    padding: 0.6rem 1.1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    background: var(--color-primary);
    color: #fff;
  }

  .accept-btn:hover {
    background: var(--color-primary-hover);
  }

  .accepted-line {
    margin: 0;
    font-weight: 600;
    color: var(--color-accent);
    font-size: 0.9rem;
  }

  .link-btn {
    justify-self: start;
    color: var(--color-muted);
    font-size: 0.85rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .link-btn:hover {
    color: var(--color-primary);
  }
</style>
