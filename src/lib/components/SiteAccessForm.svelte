<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import { formatUsPhoneInput } from '$lib/utils/phone';
  import PhotoUploadMock from './PhotoUploadMock.svelte';
  import type { SpecialInstructions, UploadedPhoto } from '$lib/types/intake';

  export let special: SpecialInstructions;
  export let photos: UploadedPhoto[];
  export let photosRequired = false;
  export let showErrors = false;

  // The preferred arrival window used to live here; it moved to the scheduling
  // step where the customer now picks a concrete day + window together.

  function update<K extends keyof SpecialInstructions>(field: K, raw: SpecialInstructions[K]) {
    intakeStore.updateSpecialInstructions({ [field]: raw } as Partial<SpecialInstructions>);
  }

  $: onSite = $intakeStore.onSiteContact;

  $: errors = {
    photos: photosRequired && photos.length === 0
  };
</script>

<div class="grid">
  <section>
    <h3>Access & special instructions</h3>
    <div class="row two">
      <div>
        <label for="gateCode">Gate code (if any)</label>
        <input
          id="gateCode"
          type="text"
          autocomplete="off"
          value={special.gateCode}
          on:input={(event) => update('gateCode', event.currentTarget.value)}
        />
      </div>
      <div>
        <label for="parkingNotes">Parking notes</label>
        <input
          id="parkingNotes"
          type="text"
          placeholder="Driveway, street, loading zone..."
          value={special.parkingNotes}
          on:input={(event) => update('parkingNotes', event.currentTarget.value)}
        />
      </div>
    </div>
    <label class="check">
      <input
        type="checkbox"
        checked={special.hasDog}
        on:change={(event) => update('hasDog', event.currentTarget.checked)}
      />
      <span>There is a dog on the property</span>
    </label>
    <div>
      <label for="otherNotes">Anything else our team should know?</label>
      <textarea
        id="otherNotes"
        rows="2"
        placeholder="Tenant/landlord approval, hours of access, contact preference..."
        value={special.other}
        on:input={(event) => update('other', event.currentTarget.value)}
      ></textarea>
    </div>

    <label class="check">
      <input
        type="checkbox"
        checked={onSite.differs}
        on:change={(event) => intakeStore.updateOnSiteContact({ differs: event.currentTarget.checked })}
      />
      <span>Someone other than me will be on-site</span>
    </label>
    {#if onSite.differs}
      <div class="row two">
        <div>
          <label for="onSiteName">On-site contact name</label>
          <input
            id="onSiteName"
            type="text"
            autocomplete="off"
            placeholder="Full name"
            value={onSite.name}
            on:input={(event) => intakeStore.updateOnSiteContact({ name: event.currentTarget.value })}
          />
        </div>
        <div>
          <label for="onSitePhone">On-site contact phone</label>
          <input
            id="onSitePhone"
            type="tel"
            autocomplete="off"
            placeholder="(206) 555-5555"
            value={onSite.phone}
            on:input={(event) => {
              const formatted = formatUsPhoneInput(onSite.phone, event.currentTarget.value);
              event.currentTarget.value = formatted;
              intakeStore.updateOnSiteContact({ phone: formatted });
            }}
          />
        </div>
      </div>
    {/if}
  </section>

  <section>
    <h3>
      Photos
      {#if photosRequired}
        <span class="required">Required</span>
      {:else}
        <span class="optional">Optional</span>
      {/if}
    </h3>
    {#if photosRequired}
      <p class="hint">
        This service starts with a remote consultation, so a few clear photos are required to give
        you a rough estimate before any on-site visit.
      </p>
    {:else}
      <p class="hint">Photos help our team triage and quote faster.</p>
    {/if}
    <PhotoUploadMock {photos} />
    {#if showErrors && errors.photos}
      <p class="error">Please add at least one photo to continue.</p>
    {/if}
  </section>
</div>

<style>
  .grid {
    display: grid;
    gap: 1.4rem;
  }

  h3 {
    margin: 0 0 0.55rem;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .row.two {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.7rem;
  }

  .check {
    display: flex;
    gap: 0.55rem;
    font-weight: 500;
    color: var(--color-text);
    margin: 0.55rem 0;
  }

  .check input {
    width: auto;
    margin: 0;
  }

  textarea {
    resize: vertical;
    min-height: 70px;
  }

  .hint {
    margin: 0 0 0.65rem;
    color: var(--color-muted);
    font-size: 0.88rem;
  }

  .required {
    color: var(--color-emergency);
    font-size: 0.72rem;
    background: var(--color-emergency-bg);
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    letter-spacing: 0.04em;
  }

  .optional {
    color: var(--color-muted);
    font-size: 0.72rem;
    background: var(--color-bg);
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    letter-spacing: 0.04em;
  }

  .error {
    color: var(--color-emergency);
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
  }

  @media (max-width: 520px) {
    .row.two {
      grid-template-columns: 1fr;
    }
  }
</style>
