<script lang="ts">
  import JobTypeBanner from './JobTypeBanner.svelte';
  import PaymentStep from './PaymentStep.svelte';
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
        <dt>Window floor(s)</dt>
        <dd>{state.issueDetails.windowAccess.floors || '—'}</dd>
      </div>
      <div>
        <dt>Access blocked</dt>
        <dd>
          {#if state.issueDetails.windowAccess.blocked === 'yes'}
            Yes — {state.issueDetails.windowAccess.blockedNotes || 'details not noted'}
          {:else if state.issueDetails.windowAccess.blocked === 'unsure'}
            Unsure
          {:else}
            No
          {/if}
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

  <section class="block">
    <h3>Property & access</h3>
    <dl>
      <div><dt>Property type</dt><dd>{state.propertyType || '—'}</dd></div>
      {#if state.propertyType === 'Business' && state.propertyDetails.businessName}
        <div><dt>Business</dt><dd>{state.propertyDetails.businessName}</dd></div>
      {/if}
      {#if state.propertyType === 'Multi-family' && state.propertyDetails.complexName}
        <div><dt>Community</dt><dd>{state.propertyDetails.complexName}</dd></div>
      {/if}
      {#if state.propertyDetails.role}
        <div><dt>Your role</dt><dd>{state.propertyDetails.role}</dd></div>
      {/if}
      <div><dt>Gate code</dt><dd>{state.specialInstructions.gateCode || '—'}</dd></div>
      <div>
        <dt>Dog on site</dt>
        <dd>{state.specialInstructions.hasDog ? 'Yes' : 'No'}</dd>
      </div>
      <div><dt>Parking</dt><dd>{state.specialInstructions.parkingNotes || '—'}</dd></div>
      <div><dt>Preferred window</dt><dd>{state.specialInstructions.preferredWindow || '—'}</dd></div>
      {#if state.onSiteContact.differs}
        <div class="full">
          <dt>On-site contact</dt>
          <dd>{state.onSiteContact.name || '—'}{state.onSiteContact.phone ? ` · ${state.onSiteContact.phone}` : ''}</dd>
        </div>
      {/if}
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
      <div class="thumbs">
        {#each state.issueDetails.photos as photo (photo.name)}
          <img class="thumb" src={photo.dataUrl} alt={photo.name} title={photo.name} />
        {/each}
      </div>
    {/if}
  </section>

  <PaymentStep {state} />
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

  .thumbs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .thumb {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--color-border);
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
