<script lang="ts">
  /**
   * The ZIP question, asked right after the service choice (on the property
   * step) — the zone map answers "do we serve you?" before the customer fills
   * out the rest. It was on the first screen until Jim moved it down
   * (2026-10-16). The answer lives in the store (areaStatus) so the wizard
   * can hold the step until the ZIP checks out. The address step later starts
   * with this ZIP filled in.
   *
   * Fails open: when the zone map can't answer, areaStatus is 'unknown' and
   * the visitor goes through — the review step re-checks authoritatively.
   * A restored draft keeps its ZIP but the store resets areaStatus to 'idle',
   * so the check simply runs again.
   */
  import { intakeStore } from '$lib/stores/intakeStore';

  /** Show the "enter a ZIP" error (after Continue is pressed without one). */
  export let showError = false;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';

  let lastChecked = '';

  $: zip = $intakeStore.address.zip.trim().slice(0, 5);
  $: status = $intakeStore.areaStatus;
  $: if (/^\d{5}$/.test(zip) && status === 'idle' && zip !== lastChecked) check(zip);

  async function check(z: string) {
    lastChecked = z;
    intakeStore.setAreaStatus('checking');
    let next: 'in' | 'out' | 'unknown' = 'unknown';
    try {
      const res = await fetch(`/api/service-area?zip=${z}`);
      if (res.ok) {
        const body = await res.json();
        next = body.known === false ? 'unknown' : body.serviced ? 'in' : 'out';
      }
    } catch {
      /* zone map unreachable — let them through */
    }
    // Ignore a stale answer if they've typed a different ZIP since.
    if ($intakeStore.address.zip.trim().slice(0, 5) === z) intakeStore.setAreaStatus(next);
  }

  function onInput(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 5);
    if (digits !== input.value) input.value = digits;
    lastChecked = '';
    intakeStore.updateAddress({ zip: digits });
  }
</script>

<div class="zipcheck">
  <label for="intake-zip">ZIP code of the job</label>
  <input
    id="intake-zip"
    class:bad={showError && status !== 'in' && status !== 'unknown'}
    inputmode="numeric"
    autocomplete="postal-code"
    maxlength="5"
    placeholder="98103"
    value={zip}
    on:input={onInput}
    aria-describedby="intake-zip-status"
  />
  <div id="intake-zip-status" aria-live="polite">
    {#if status === 'checking'}
      <p class="zc-note zc-muted">Checking your area…</p>
    {:else if status === 'in'}
      <p class="zc-note zc-ok">✓ We serve {zip}.</p>
    {:else if status === 'out'}
      <p class="zc-note zc-out">
        <strong>We don't serve {zip} yet.</strong> Think that's wrong? Call
        <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a> and we'll double-check.
      </p>
    {:else if showError && status === 'idle'}
      <p class="zc-note zc-err">Enter the 5-digit ZIP code where the work is.</p>
    {/if}
  </div>
</div>

<style>
  .zipcheck {
    display: grid;
    gap: 0.45rem;
  }

  label {
    font-weight: 700;
    font-size: 0.9rem;
  }

  input {
    font: inherit;
    font-size: 1.35rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    max-width: 220px;
    padding: 0.7rem 0.95rem;
    border: 1.5px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
  }

  input:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: var(--ring-focus);
  }

  input.bad {
    border-color: var(--color-emergency);
  }

  .zc-note {
    margin: 0;
    border-radius: var(--radius-sm);
    font-size: 0.9rem;
  }

  .zc-ok {
    background: #e6f6ee;
    color: #11603b;
    font-weight: 600;
    padding: 0.55rem 0.75rem;
  }

  .zc-out {
    background: var(--color-warning-bg);
    padding: 0.6rem 0.75rem;
  }

  .zc-out a {
    color: var(--color-text-strong);
    font-weight: 700;
  }

  .zc-err {
    color: var(--color-emergency);
    font-weight: 700;
  }

  .zc-muted {
    color: var(--color-muted);
  }
</style>
