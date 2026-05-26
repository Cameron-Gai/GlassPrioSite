<script lang="ts">
  import type { PropertyType } from '$lib/types/intake';
  import { intakeStore } from '$lib/stores/intakeStore';

  export let value: PropertyType;

  const options: PropertyType[] = [
    'Residential',
    'Commercial',
    'New construction',
    'Property management / multifamily',
    'Other'
  ];

  function select(option: PropertyType) {
    intakeStore.setPropertyType(option);
  }
</script>

<div class="grid">
  {#each options as option (option)}
    <button
      type="button"
      class="tile"
      class:active={value === option}
      on:click={() => select(option)}
    >
      <span class="dot" aria-hidden="true"></span>
      <span>{option}</span>
    </button>
  {/each}
</div>

<style>
  .grid {
    display: grid;
    gap: 0.6rem;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 0.65rem;
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
    background: #e8f0f9;
  }

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--color-border);
    flex-shrink: 0;
  }

  .tile.active .dot {
    border-color: var(--color-primary);
    background: var(--color-primary);
  }
</style>
