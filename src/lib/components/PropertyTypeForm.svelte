<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import {
    PROPERTY_TYPE_LABELS,
    type PropertyType,
    type PropertyContactRole
  } from '$lib/types/intake';

  export let value: PropertyType;

  const options: Exclude<PropertyType, ''>[] = [
    'Residential',
    'Business',
    'Multi-family',
    'Facility maintenance',
    'Other'
  ];

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
      <span>{PROPERTY_TYPE_LABELS[option]}</span>
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
{:else if value === 'Facility maintenance'}
  <!-- Mirrors the GoSameDay phone script's facility-maintenance questions
       (business served, FM company, work order) — minus the after-hours
       fee/NTE framing, which doesn't apply to web intake. -->
  <div class="detail fade-in">
    <div>
      <label for="fmBusinessName">Business you're servicing</label>
      <input
        id="fmBusinessName"
        type="text"
        placeholder="e.g. Maple Street Cafe"
        value={details.businessName}
        on:input={(event) => intakeStore.updatePropertyDetails({ businessName: event.currentTarget.value })}
      />
    </div>
    <div>
      <label for="facilityCompany">Facility maintenance company</label>
      <input
        id="facilityCompany"
        type="text"
        placeholder="Your company's name"
        value={details.facilityCompany}
        on:input={(event) => intakeStore.updatePropertyDetails({ facilityCompany: event.currentTarget.value })}
      />
    </div>
    <div>
      <label for="workOrderNumber">Work order number <span class="optional-tag">optional</span></label>
      <input
        id="workOrderNumber"
        type="text"
        autocomplete="off"
        placeholder="Leave blank if you don't have one yet"
        value={details.workOrderNumber}
        on:input={(event) => intakeStore.updatePropertyDetails({ workOrderNumber: event.currentTarget.value })}
      />
      <p class="field-hint">No work order yet? No problem — we'll confirm it with you before any billing.</p>
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
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .tile:hover {
    border-color: var(--color-primary);
  }

  .tile:active {
    transform: scale(0.98);
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

  .optional-tag {
    font-weight: 500;
    font-size: 0.74rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-left: 0.25rem;
  }

  .field-hint {
    margin: 0.35rem 0 0;
    font-size: 0.84rem;
    color: var(--color-muted);
    line-height: 1.4;
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
