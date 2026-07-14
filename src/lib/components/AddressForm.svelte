<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { AddressInfo } from '$lib/types/intake';

  export let value: AddressInfo;
  export let showErrors = false;

  function update<K extends keyof AddressInfo>(field: K, raw: string) {
    intakeStore.updateAddress({ [field]: raw } as Partial<AddressInfo>);
  }

  $: errors = {
    street: !value.street.trim(),
    city: !value.city.trim(),
    state: !value.state.trim(),
    zip: !/^\d{5}(-\d{4})?$/.test(value.zip.trim())
  };
</script>

<div class="grid">
  <div>
    <label for="street">Street address</label>
    <input
      id="street"
      type="text"
      autocomplete="street-address"
      value={value.street}
      on:input={(event) => update('street', event.currentTarget.value)}
    />
    {#if showErrors && errors.street}<p class="error">Required</p>{/if}
  </div>
  <div class="row two">
    <div>
      <label for="city">City</label>
      <input
        id="city"
        type="text"
        autocomplete="address-level2"
        value={value.city}
        on:input={(event) => update('city', event.currentTarget.value)}
      />
      {#if showErrors && errors.city}<p class="error">Required</p>{/if}
    </div>
    <div>
      <label for="state">State</label>
      <input
        id="state"
        type="text"
        maxlength="2"
        autocomplete="address-level1"
        placeholder="WA"
        value={value.state}
        on:input={(event) => update('state', event.currentTarget.value.toUpperCase())}
      />
      {#if showErrors && errors.state}<p class="error">Required</p>{/if}
    </div>
  </div>
  <div>
    <label for="zip">ZIP code</label>
    <input
      id="zip"
      type="text"
      inputmode="numeric"
      autocomplete="postal-code"
      placeholder="98101"
      value={value.zip}
      on:input={(event) => update('zip', event.currentTarget.value)}
    />
    {#if showErrors && errors.zip}<p class="error">Enter a 5-digit ZIP</p>{/if}
  </div>
</div>

<style>
  .grid {
    display: grid;
    gap: 0.9rem;
  }
  .row.two {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: 2fr 1fr;
  }
  .error {
    color: var(--color-emergency);
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
  }
</style>
