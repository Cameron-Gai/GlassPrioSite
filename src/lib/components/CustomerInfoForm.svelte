<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { CustomerInfo } from '$lib/types/intake';

  export let value: CustomerInfo;
  export let showErrors = false;

  function update<K extends keyof CustomerInfo>(field: K, raw: string) {
    intakeStore.updateCustomer({ [field]: raw } as Partial<CustomerInfo>);
  }

  $: errors = {
    firstName: !value.firstName.trim(),
    lastName: !value.lastName.trim(),
    phone: !/^[0-9+\-\s().]{7,}$/.test(value.phone.trim()),
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())
  };
  // The returning-customer lookup + "Is this you?" prompt and the applied
  // confirmation are rendered by the wizard on this same step (it owns the
  // background lookup and gating), so this form only handles the fields.
</script>

<div class="grid">
  <div class="row two">
    <div>
      <label for="firstName">First name</label>
      <input
        id="firstName"
        type="text"
        autocomplete="given-name"
        value={value.firstName}
        on:input={(event) => update('firstName', event.currentTarget.value)}
      />
      {#if showErrors && errors.firstName}<p class="error">Required</p>{/if}
    </div>
    <div>
      <label for="lastName">Last name</label>
      <input
        id="lastName"
        type="text"
        autocomplete="family-name"
        value={value.lastName}
        on:input={(event) => update('lastName', event.currentTarget.value)}
      />
      {#if showErrors && errors.lastName}<p class="error">Required</p>{/if}
    </div>
  </div>
  <div>
    <label for="phone">Phone number</label>
    <input
      id="phone"
      type="tel"
      inputmode="tel"
      autocomplete="tel"
      placeholder="(555) 555-1234"
      value={value.phone}
      on:input={(event) => update('phone', event.currentTarget.value)}
    />
    {#if showErrors && errors.phone}<p class="error">Enter a valid phone number</p>{/if}
  </div>
  <div>
    <label for="email">Email</label>
    <input
      id="email"
      type="email"
      inputmode="email"
      autocomplete="email"
      placeholder="you@example.com"
      value={value.email}
      on:input={(event) => update('email', event.currentTarget.value)}
    />
    {#if showErrors && errors.email}<p class="error">Enter a valid email</p>{/if}
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
    grid-template-columns: 1fr 1fr;
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
