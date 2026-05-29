<script lang="ts">
  import JobTypeBanner from './JobTypeBanner.svelte';
  import type { IntakeState } from '$lib/stores/intakeStore';

  export let state: IntakeState;
</script>

<div class="review fade-in">
  {#if state.selectedJobType}
    <JobTypeBanner
      job={state.selectedJobType}
      isEmergency={state.isEmergency}
      isDuringBusinessHours={state.isDuringBusinessHours}
      priorityUpgrade={state.priorityUpgrade}
    />
  {/if}

  <section class="block">
    <h3>What's going on</h3>
    <dl>
      <div><dt>Location</dt><dd>{state.issueDetails.serviceLocation || '—'}</dd></div>
      <div><dt>When</dt><dd>{state.issueDetails.happenedAt || '—'}</dd></div>
      <div class="full">
        <dt>Description</dt>
        <dd class="multiline">{state.issueDetails.description || '—'}</dd>
      </div>
      <div>
        <dt>Ladder</dt>
        <dd>
          {state.issueDetails.ladder.required
            ? `Yes — ${state.issueDetails.ladder.story || 'height not noted'}`
            : 'Not required'}
        </dd>
      </div>
      <div>
        <dt>Site</dt>
        <dd>
          {state.issueDetails.isSecure ? 'Secure' : 'Not secure'}
          {state.issueDetails.hasBrokenGlass ? ' · Broken glass on site' : ''}
          {state.issueDetails.hasWaterOrWeatherEntry ? ' · Weather entering' : ''}
        </dd>
      </div>
    </dl>
  </section>

  {#if state.warranty}
    <section class="block">
      <h3>Warranty context</h3>
      <dl>
        <div><dt>Previous job</dt><dd>{state.warranty.relatedJob || '—'}</dd></div>
        <div><dt>Original work</dt><dd>{state.warranty.originalDate || '—'}</dd></div>
      </dl>
    </section>
  {/if}

  <section class="block">
    <h3>Property & access</h3>
    <dl>
      <div><dt>Property type</dt><dd>{state.propertyType || '—'}</dd></div>
      <div><dt>Gate code</dt><dd>{state.specialInstructions.gateCode || '—'}</dd></div>
      <div>
        <dt>Dog on site</dt>
        <dd>{state.specialInstructions.hasDog ? 'Yes' : 'No'}</dd>
      </div>
      <div><dt>Parking</dt><dd>{state.specialInstructions.parkingNotes || '—'}</dd></div>
      <div><dt>Preferred window</dt><dd>{state.specialInstructions.preferredWindow || '—'}</dd></div>
      {#if state.specialInstructions.other}
        <div class="full"><dt>Notes</dt><dd class="multiline">{state.specialInstructions.other}</dd></div>
      {/if}
    </dl>
  </section>

  <section class="block">
    <h3>Contact</h3>
    <p>
      {state.customer.firstName} {state.customer.lastName}<br />
      {state.customer.phone}<br />
      {state.customer.email}
    </p>
  </section>

  <section class="block">
    <h3>Service address</h3>
    <p>
      {state.address.street}<br />
      {state.address.city}, {state.address.state} {state.address.zip}
    </p>
  </section>

  <section class="block">
    <h3>Preferred window</h3>
    <p>{state.schedulingPreference || '—'}</p>
  </section>

  <section class="block">
    <h3>Photos</h3>
    {#if state.issueDetails.photos.length === 0}
      <p class="muted">No photos uploaded.</p>
    {:else}
      <ul class="photos">
        {#each state.issueDetails.photos as photo (photo)}
          <li>{photo}</li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  .review {
    display: grid;
    gap: 0.85rem;
  }

  .block {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.95rem 1rem;
  }

  h3 {
    margin: 0 0 0.6rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    font-weight: 700;
  }

  dl {
    display: grid;
    gap: 0.45rem;
    margin: 0;
  }

  dl div {
    display: grid;
    grid-template-columns: 1fr 1.6fr;
    gap: 0.5rem;
    align-items: start;
  }

  dl div.full {
    grid-template-columns: 1fr;
  }

  dt {
    color: var(--color-muted);
    font-size: 0.88rem;
  }

  dd {
    margin: 0;
    font-weight: 500;
  }

  .multiline {
    white-space: pre-wrap;
  }

  .muted {
    color: var(--color-muted);
    margin: 0;
  }

  .photos {
    margin: 0;
    padding-left: 1.1rem;
  }

  @media (max-width: 520px) {
    dl div {
      grid-template-columns: 1fr;
    }
    dt {
      font-weight: 600;
    }
  }
</style>
