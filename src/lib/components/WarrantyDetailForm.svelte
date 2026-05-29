<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { WarrantyInfo } from '$lib/types/intake';

  export let value: WarrantyInfo;
  export let showErrors = false;

  function update<K extends keyof WarrantyInfo>(field: K, raw: WarrantyInfo[K]) {
    intakeStore.updateWarranty({ [field]: raw } as Partial<WarrantyInfo>);
  }

  $: errors = {
    relatedJob: !value.relatedJob.trim()
  };
</script>

<div class="grid">
  <div>
    <label for="relatedJob">Which previous job is this about?</label>
    <input
      id="relatedJob"
      type="text"
      placeholder="e.g. Shower glass install at this address, last year"
      value={value.relatedJob}
      on:input={(event) => update('relatedJob', event.currentTarget.value)}
    />
    {#if showErrors && errors.relatedJob}<p class="error">Please describe the previous job</p>{/if}
  </div>
  <div>
    <label for="originalDate">When was the original work done?</label>
    <input
      id="originalDate"
      type="text"
      placeholder="Month/year, or 'about 6 months ago'"
      value={value.originalDate}
      on:input={(event) => update('originalDate', event.currentTarget.value)}
    />
  </div>
</div>

<style>
  .grid {
    display: grid;
    gap: 0.9rem;
  }
  .error {
    color: var(--color-emergency);
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
  }
</style>
