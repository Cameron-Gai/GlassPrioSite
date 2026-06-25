<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { SchedulingPreference } from '$lib/types/intake';

  export let value: SchedulingPreference;

  const options: SchedulingPreference[] = [
    'As soon as possible',
    'Today',
    'Tomorrow',
    'This week',
    'Next week',
    'Flexible'
  ];

  function select(option: SchedulingPreference) {
    intakeStore.setSchedulingPreference(option);
  }
</script>

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

<style>
  .note {
    margin: 0 0 0.85rem;
    font-size: 0.9rem;
    color: var(--color-muted);
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
</style>
