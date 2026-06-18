<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { PropertyType } from '$lib/types/intake';

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

<div class="tiles">
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
  .tiles {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .tile {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0.85rem 0.95rem;
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

  .dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid var(--color-border-strong);
    flex-shrink: 0;
  }

  .tile.active .dot {
    border-color: var(--color-primary);
    background: var(--color-primary);
  }

  @media (max-width: 520px) {
    .tiles {
      grid-template-columns: 1fr;
    }
  }
</style>
