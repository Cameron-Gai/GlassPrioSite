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

  // Returning-customer autofill: once phone + email are both valid, debounce a
  // quiet lookup. The store handles the request, staleness, and PII gating.
  $: returning = $intakeStore.returning;
  let debounce: ReturnType<typeof setTimeout> | undefined;

  $: if (!errors.phone && !errors.email && returning.status === 'idle') {
    clearTimeout(debounce);
    debounce = setTimeout(() => intakeStore.lookupReturningCustomer(), 600);
  }
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

  {#if returning.status === 'found'}
    <div class="returning fade-in">
      <p class="welcome">
        Welcome back{returning.firstName ? `, ${returning.firstName}` : ''}! We found your details on
        file. Want us to fill them in?
      </p>
      <div class="returning-actions">
        <button type="button" class="use" on:click={() => intakeStore.applyReturningCustomer()}>
          Yes, use my info
        </button>
        <button type="button" class="dismiss" on:click={() => intakeStore.dismissReturningCustomer()}>
          No thanks
        </button>
      </div>
    </div>
  {:else if returning.status === 'applied'}
    <p class="applied">✓ Filled in from your account — double-check it's right below.</p>
  {/if}
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

  .returning {
    display: grid;
    gap: 0.6rem;
    padding: 0.85rem 1rem;
    border: 1px solid var(--color-primary-soft-strong);
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 85%);
  }

  .welcome {
    margin: 0;
    font-weight: 600;
    color: var(--color-text);
  }

  .returning-actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .use {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    background: var(--color-primary);
    color: #fff;
    font-weight: 600;
  }

  .use:hover {
    background: var(--color-primary-hover);
  }

  .dismiss {
    padding: 0.5rem 1rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-muted);
    font-weight: 600;
  }

  .applied {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  @media (max-width: 520px) {
    .row.two {
      grid-template-columns: 1fr;
    }
  }
</style>
