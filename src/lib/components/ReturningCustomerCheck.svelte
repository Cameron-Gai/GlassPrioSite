<script lang="ts">
  import { onMount } from 'svelte';
  import { intakeStore, type IntakeState } from '$lib/stores/intakeStore';

  export let state: IntakeState;

  let proceeded = false;
  let applying = false;
  let showSkip = false;

  function proceed() {
    if (proceeded) return;
    proceeded = true;
    intakeStore.advance();
  }

  async function yes() {
    applying = true;
    await intakeStore.applyReturningCustomer();
    proceed();
  }

  function no() {
    intakeStore.dismissReturningCustomer();
    proceed();
  }

  onMount(() => {
    // Kick the lookup now (after Continue), so it runs against the final phone+email
    // — not mid-typing. The contact step already validated both, so it will run.
    if (state.returning.status === 'idle') intakeStore.lookupReturningCustomer();
    // Escape hatch: if ServiceTitan is slow/unreachable, reveal a skip so the
    // customer is never stranded on the spinner.
    const t = setTimeout(() => (showSkip = true), 4000);
    return () => clearTimeout(t);
  });

  // No match (or a failed prefill) → nothing to ask; move straight on.
  $: if (!proceeded && state.returning.status === 'none') proceed();

  $: status = state.returning.status;
  $: firstName = state.returning.firstName;
</script>

<section class="rc-check" aria-live="polite">
  {#if status === 'found' && !applying}
    <div class="prompt fade-in">
      <span class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
        </svg>
      </span>
      <h2>Is this you?</h2>
      <p class="lead">
        We found an account{firstName ? ` for <strong>${firstName}</strong>` : ''} with this phone and email.
        Want us to fill in your name and service address from your file?
      </p>
      <div class="actions">
        <button type="button" class="primary" on:click={yes}>Yes, that's me</button>
        <button type="button" class="ghost" on:click={no}>No, I'm new here</button>
      </div>
    </div>
  {:else}
    <div class="loading fade-in">
      <span class="spinner" aria-hidden="true"></span>
      <p class="muted">{applying ? 'Loading your details…' : 'Checking for your account…'}</p>
      {#if showSkip && !applying}
        <button type="button" class="skip" on:click={no}>Continue without waiting</button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .rc-check {
    display: grid;
    place-items: center;
    min-height: 220px;
    text-align: center;
  }

  .prompt {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    max-width: 420px;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 52px;
    height: 52px;
    border-radius: 50%;
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  h2 {
    margin: 0;
    font-size: 1.4rem;
  }

  .lead {
    margin: 0;
    color: var(--color-muted);
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 0.6rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.4rem;
  }

  .primary,
  .ghost {
    padding: 0.8rem 1.3rem;
    border-radius: var(--radius-md);
    font-weight: 600;
    min-width: 140px;
  }

  .primary {
    background: var(--color-primary);
    color: #fff;
  }
  .primary:hover {
    background: var(--color-primary-hover);
  }

  .ghost {
    background: transparent;
    color: var(--color-primary);
    border: 1px solid var(--color-border);
  }
  .ghost:hover {
    border-color: var(--color-primary);
  }

  .loading {
    display: grid;
    justify-items: center;
    gap: 0.7rem;
  }

  .spinner {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    border: 3px solid var(--color-primary-soft);
    border-top-color: var(--color-primary);
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .muted {
    margin: 0;
    color: var(--color-muted);
  }

  .skip {
    margin-top: 0.2rem;
    color: var(--color-muted);
    font-size: 0.88rem;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .skip:hover {
    color: var(--color-primary);
  }
</style>
