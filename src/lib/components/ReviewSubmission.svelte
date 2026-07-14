<script lang="ts">
  import JobTypeBanner from './JobTypeBanner.svelte';
  import PaymentStep from './PaymentStep.svelte';
  import PhotoUploadMock from './PhotoUploadMock.svelte';
  import { intakeStore, type IntakeState, type WizardStep } from '$lib/stores/intakeStore';
  import { describeTiming } from '$lib/utils/timing';

  export let state: IntakeState;

  /** Jump to a step to fix something; the wizard brings them straight back here. */
  function edit(step: WizardStep) {
    intakeStore.beginEdit(step);
  }
</script>

<div class="review">
  {#if state.selectedJobType}
    <JobTypeBanner
      job={state.selectedJobType}
      isEmergency={state.isEmergency}
      isDuringBusinessHours={state.isDuringBusinessHours}
      priorityUpgrade={state.priorityUpgrade}
    />
  {/if}

  {#if !state.isEmergency}
  <section class="block">
    <h3>
      What's going on
      <button type="button" class="edit" on:click={() => edit('issue')}>Edit</button>
    </h3>
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
  {/if}

  <section class="block">
    <h3>
      Property &amp; access
      <button
        type="button"
        class="edit"
        on:click={() => edit(state.isEmergency ? 'property-type' : 'site')}
      >
        Edit
      </button>
    </h3>
    <dl>
      <div>
        <dt>Property type</dt>
        <dd>
          {state.propertyType || '—'}
          {#if !state.isEmergency}
            <button type="button" class="edit inline" on:click={() => edit('property-type')}>
              change
            </button>
          {/if}
        </dd>
      </div>
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
    <h3>
      Contact
      <button type="button" class="edit" on:click={() => edit('contact')}>Edit</button>
    </h3>
    <p>
      {state.customer.firstName} {state.customer.lastName}<br />
      {state.customer.phone}<br />
      {state.customer.email}
    </p>
  </section>

  <section class="block">
    <h3>
      Service address
      <button type="button" class="edit" on:click={() => edit('address')}>Edit</button>
    </h3>
    <p>
      {state.address.street}<br />
      {state.address.city}, {state.address.state} {state.address.zip}
    </p>
  </section>

  <section class="block">
    <h3>
      Requested timing
      {#if !state.isEmergency}
        <button type="button" class="edit" on:click={() => edit('scheduling')}>Edit</button>
      {/if}
    </h3>
    <p>{describeTiming(state)}</p>
    {#if !state.isEmergency && !state.priorityUpgrade}
      <p class="muted small">
        This is a request — our team will confirm, and we'll contact you if it doesn't work out.
      </p>
    {/if}
  </section>

  <section class="block">
    <h3>
      Photos
      {#if !state.isEmergency}
        <button type="button" class="edit" on:click={() => edit('site')}>Edit</button>
      {/if}
    </h3>
    {#if state.isEmergency}
      <!-- The emergency fast-track skips the photo step, so offer it here. -->
      <p class="muted small">Optional — a quick photo of the damage helps our crew come prepared.</p>
      <PhotoUploadMock photos={state.issueDetails.photos} />
    {:else if state.issueDetails.photos.length === 0}
      <p class="muted">No photos uploaded.</p>
    {:else}
      <div class="thumbs">
        {#each state.issueDetails.photos as photo (photo.id)}
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
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .edit {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: none;
    color: var(--color-primary);
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .edit:hover {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
  }

  .edit:active {
    transform: scale(0.95);
  }

  .edit.inline {
    margin-left: 0.4rem;
    font-size: 0.72rem;
    padding: 0.05rem 0.4rem;
    font-weight: 600;
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

  .small {
    font-size: 0.84rem;
    margin-top: 0.35rem;
    margin-bottom: 0.5rem;
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
