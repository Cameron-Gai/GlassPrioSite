<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { PropertyType, PropertyContactRole } from '$lib/types/intake';

  export let value: PropertyType;

  const options: PropertyType[] = ['Residential', 'Business', 'Multi-family', 'Other'];

  // Role options depend on the property type.
  const businessRoles: PropertyContactRole[] = ['Manager', 'Employee', 'Other'];
  const multiFamilyRoles: PropertyContactRole[] = ['Manager', 'Maintenance', 'Tenant'];

  $: details = $intakeStore.propertyDetails;

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

{#if value === 'Business'}
  <div class="detail fade-in">
    <div>
      <label for="businessName">Business name</label>
      <input
        id="businessName"
        type="text"
        placeholder="e.g. Maple Street Cafe"
        value={details.businessName}
        on:input={(event) => intakeStore.updatePropertyDetails({ businessName: event.currentTarget.value })}
      />
    </div>
    <div>
      <span class="pseudo-label">Are you the…</span>
      <div class="segmented" role="radiogroup" aria-label="Your role">
        {#each businessRoles as role (role)}
          <button
            type="button"
            role="radio"
            aria-checked={details.role === role}
            class:active={details.role === role}
            on:click={() => intakeStore.updatePropertyDetails({ role })}
          >
            {role}
          </button>
        {/each}
      </div>
    </div>
  </div>
{:else if value === 'Multi-family'}
  <div class="detail fade-in">
    <div>
      <label for="complexName">Apartment / community name</label>
      <input
        id="complexName"
        type="text"
        placeholder="e.g. Riverview Apartments"
        value={details.complexName}
        on:input={(event) => intakeStore.updatePropertyDetails({ complexName: event.currentTarget.value })}
      />
    </div>
    <div>
      <span class="pseudo-label">Are you the…</span>
      <div class="segmented" role="radiogroup" aria-label="Your role">
        {#each multiFamilyRoles as role (role)}
          <button
            type="button"
            role="radio"
            aria-checked={details.role === role}
            class:active={details.role === role}
            on:click={() => intakeStore.updatePropertyDetails({ role })}
          >
            {role}
          </button>
        {/each}
      </div>
    </div>
  </div>
{/if}

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

  .detail {
    margin-top: 0.9rem;
    display: grid;
    gap: 0.85rem;
    padding: 0.95rem 1.1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .pseudo-label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
    margin-bottom: 0.4rem;
  }

  .segmented {
    display: inline-flex;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 3px;
    width: fit-content;
    gap: 2px;
  }

  .segmented button {
    padding: 0.45rem 1.1rem;
    border-radius: 10px;
    font-weight: 600;
    color: var(--color-muted);
    transition: background 0.18s ease, color 0.18s ease;
  }

  .segmented button.active {
    background: var(--color-primary);
    color: #fff;
    box-shadow: var(--shadow-sm);
  }

  @media (max-width: 520px) {
    .tiles {
      grid-template-columns: 1fr;
    }
  }
</style>
