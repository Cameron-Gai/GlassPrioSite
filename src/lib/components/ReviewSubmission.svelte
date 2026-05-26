<script lang="ts">
  import PriorityBadge from './PriorityBadge.svelte';
  import type { IntakeState } from '$lib/stores/intakeStore';

  export let state: IntakeState;
</script>

<div class="review">
  <section class="block">
    <h3>Service summary</h3>
    <dl>
      <div>
        <dt>Selected service</dt>
        <dd>{state.selectedJobType?.name ?? '—'}</dd>
      </div>
      <div>
        <dt>Priority</dt>
        <dd>
          <PriorityBadge priority={state.selectedJobType?.priority ?? ''} />
        </dd>
      </div>
      <div>
        <dt>Estimated duration</dt>
        <dd>{state.selectedJobType?.duration ?? '—'}</dd>
      </div>
      {#if state.isEmergency}
        <div>
          <dt>Business hours</dt>
          <dd>
            {state.isDuringBusinessHours
              ? 'Currently within business hours'
              : 'Currently outside business hours'}
          </dd>
        </div>
      {/if}
    </dl>
  </section>

  <section class="block">
    <h3>Issue</h3>
    <p class="multiline">{state.issueDetails.description || '—'}</p>
    <ul class="facts">
      <li><strong>When:</strong> {state.issueDetails.happenedAt || '—'}</li>
      <li><strong>Property type:</strong> {state.propertyType || '—'}</li>
      <li>
        <strong>Opening secure:</strong> {state.issueDetails.isSecure ? 'Yes' : 'No'}
      </li>
      <li>
        <strong>Broken glass on site:</strong> {state.issueDetails.hasBrokenGlass ? 'Yes' : 'No'}
      </li>
      <li>
        <strong>Water / weather entry:</strong>
        {state.issueDetails.hasWaterOrWeatherEntry ? 'Yes' : 'No'}
      </li>
    </ul>
  </section>

  <section class="block">
    <h3>Contact</h3>
    <p>
      {state.customer.firstName}
      {state.customer.lastName}<br />
      {state.customer.phone}<br />
      {state.customer.email}
    </p>
  </section>

  <section class="block">
    <h3>Service address</h3>
    <p>
      {state.address.street}<br />
      {state.address.city}, {state.address.state}
      {state.address.zip}
    </p>
  </section>

  <section class="block">
    <h3>Preferred window</h3>
    <p>{state.schedulingPreference || '—'}</p>
  </section>

  <section class="block">
    <h3>Photos</h3>
    {#if state.uploadedPhotos.length === 0}
      <p class="muted">No photos uploaded.</p>
    {:else}
      <ul class="photos">
        {#each state.uploadedPhotos as photo (photo)}
          <li>{photo}</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .review {
    display: grid;
    gap: 1rem;
  }

  .block {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.9rem 1rem;
  }

  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  dl {
    display: grid;
    gap: 0.45rem;
    margin: 0;
  }

  dl div {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 0.5rem;
    align-items: center;
  }

  dt {
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  dd {
    margin: 0;
    font-weight: 600;
  }

  .multiline {
    white-space: pre-wrap;
    margin: 0 0 0.5rem;
  }

  .facts {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.3rem;
    color: var(--color-text);
    font-size: 0.95rem;
  }

  .photos {
    margin: 0;
    padding-left: 1.1rem;
  }

  .muted {
    color: var(--color-muted);
    margin: 0;
  }

  @media (max-width: 520px) {
    dl div {
      grid-template-columns: 1fr;
    }
  }
</style>
