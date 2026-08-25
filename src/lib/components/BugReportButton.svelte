<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { errorLog, hasClientErrors, installGlobalErrorListeners, reportClientError } from '$lib/stores/errorLog';

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';

  $: state = $intakeStore;
  $: hasErrors = $hasClientErrors;

  // Submit failures live in the store; mirror each new one into the error log
  // so the button lights up and the failure rides along on the report.
  let lastSubmitError: string | null = null;
  $: if (state.submitError && state.submitError !== lastSubmitError) {
    lastSubmitError = state.submitError;
    reportClientError('submit', state.submitError);
  }

  let open = false;
  let message = '';
  let email = '';
  let phone = '';
  let status: 'idle' | 'sending' | 'sent' | 'failed' = 'idle';
  let reference = '';
  let validationError = '';
  let textareaEl: HTMLTextAreaElement | undefined;
  let dialogEl: HTMLDivElement | undefined;

  onMount(() => {
    installGlobalErrorListeners();
  });

  async function openDialog() {
    open = true;
    status = 'idle';
    validationError = '';
    // Prefill contact from what the customer already typed — never make them
    // repeat themselves just to report a problem.
    if (!email) email = state.customer.email;
    if (!phone) phone = state.customer.phone;
    await tick();
    textareaEl?.focus();
  }

  function closeDialog() {
    open = false;
    // A sent report clears the draft; an unsent one is kept for reopening.
    if (status === 'sent') {
      message = '';
      status = 'idle';
    }
  }

  function onKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && open) closeDialog();
  }

  async function send() {
    if (!message.trim()) {
      validationError = 'Please describe what went wrong.';
      return;
    }
    validationError = '';
    status = 'sending';
    try {
      const res = await fetch('/api/bug-report', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          email: email.trim(),
          phone: phone.trim(),
          step: state.step,
          jobTypeName: state.selectedJobType?.name ?? '',
          zip: state.address.zip,
          confirmationNumber: state.confirmationNumber ?? '',
          errors: $errorLog,
          userAgent: navigator.userAgent,
          url: location.href
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || `Report failed (${res.status})`);
      reference = data.reference ?? '';
      status = 'sent';
    } catch (err) {
      console.error('[bug-report] send failed', err);
      status = 'failed';
    }
  }
</script>

<svelte:window on:keydown={onKeydown} />

<!-- Always visible, every step through confirmation. Small on purpose — it
     must never compete with the wizard — but it turns amber and says so when
     an error has actually been detected. -->
<button
  type="button"
  class="bug-fab"
  class:alert={hasErrors}
  on:click={openDialog}
  aria-haspopup="dialog"
>
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="8" y="6" width="8" height="14" rx="4" />
    <path d="M19 7l-3 2M5 7l3 2M19 19l-3-2M5 19l3-2M12 20v-8M2 13h6M16 13h6M9 4a3 3 0 0 1 6 0" />
  </svg>
  <span>{hasErrors ? 'Something went wrong? Report it' : 'Report a bug'}</span>
</button>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
  <div class="bug-overlay" on:click|self={closeDialog}>
    <div class="bug-dialog" role="dialog" aria-modal="true" aria-labelledby="bug-title" bind:this={dialogEl}>
      <div class="bug-head">
        <h3 id="bug-title">Report a problem</h3>
        <button type="button" class="bug-close" aria-label="Close" on:click={closeDialog}>✕</button>
      </div>

      {#if status === 'sent'}
        <div class="bug-sent" role="status">
          <p class="bug-sent-lead">✓ Thanks — your report is in.</p>
          {#if reference}
            <p>Reference <strong>{reference}</strong>. If this is urgent, call us at
              <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a> and mention it.</p>
          {/if}
          <button type="button" class="bug-primary" on:click={closeDialog}>Done</button>
        </div>
      {:else}
        <p class="bug-sub">
          Tell us what happened and we'll look into it. Technical details below are
          attached automatically.
        </p>

        <label class="bug-label" for="bug-message">What went wrong?</label>
        <textarea
          id="bug-message"
          rows="4"
          bind:this={textareaEl}
          bind:value={message}
          placeholder="What were you trying to do, and what happened instead?"
        ></textarea>
        {#if validationError}
          <p class="bug-error">{validationError}</p>
        {/if}

        <div class="bug-contact">
          <div>
            <label class="bug-label" for="bug-email">Email <span class="opt">optional</span></label>
            <input id="bug-email" type="email" bind:value={email} autocomplete="email" />
          </div>
          <div>
            <label class="bug-label" for="bug-phone">Phone <span class="opt">optional</span></label>
            <input id="bug-phone" type="tel" bind:value={phone} autocomplete="tel" />
          </div>
        </div>

        <details class="bug-attached">
          <summary>What gets attached ({$errorLog.length} detected {$errorLog.length === 1 ? 'error' : 'errors'})</summary>
          <ul>
            <li>Current step: {state.step}</li>
            {#if state.selectedJobType}<li>Service: {state.selectedJobType.name}</li>{/if}
            {#if state.address.zip}<li>ZIP: {state.address.zip}</li>{/if}
            {#if state.confirmationNumber}<li>Confirmation: {state.confirmationNumber}</li>{/if}
            <li>Browser info</li>
            {#each $errorLog as entry (entry.at + entry.message)}
              <li class="bug-err-entry">[{entry.source}] {entry.message}</li>
            {/each}
          </ul>
        </details>

        {#if status === 'failed'}
          <p class="bug-error" role="alert">
            We couldn't send the report — that's ironic, sorry. Please call us at
            <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a> instead.
          </p>
        {/if}

        <div class="bug-actions">
          <button type="button" class="bug-ghost" on:click={closeDialog}>Cancel</button>
          <button type="button" class="bug-primary" on:click={send} disabled={status === 'sending'}>
            {status === 'sending' ? 'Sending…' : 'Send report'}
          </button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  .bug-fab {
    position: fixed;
    bottom: 0.9rem;
    left: 0.9rem;
    z-index: 60;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.65rem;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-muted);
    background: var(--color-surface-frost, rgba(255, 255, 255, 0.85));
    backdrop-filter: blur(6px);
    border: 1px solid var(--color-border);
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(26, 34, 54, 0.12);
    cursor: pointer;
    transition: color 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
  }
  .bug-fab:hover {
    color: var(--color-text);
    border-color: var(--color-border-strong);
    box-shadow: 0 3px 10px rgba(26, 34, 54, 0.18);
  }
  .bug-fab.alert {
    color: #7a4d00;
    background: #fff7e6;
    border-color: #f0c36d;
  }

  .bug-overlay {
    position: fixed;
    inset: 0;
    z-index: 70;
    display: grid;
    place-items: center;
    padding: 1rem;
    background: rgba(16, 24, 40, 0.45);
  }
  .bug-dialog {
    width: 100%;
    max-width: 26rem;
    max-height: 85vh;
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 1rem 1.1rem 1.1rem;
    box-shadow: 0 12px 40px rgba(16, 24, 40, 0.25);
    display: grid;
    gap: 0.6rem;
  }
  .bug-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .bug-head h3 {
    margin: 0;
    font-size: 1rem;
    color: var(--color-text-strong);
  }
  .bug-close {
    border: none;
    background: none;
    font-size: 0.9rem;
    color: var(--color-subtle);
    cursor: pointer;
    padding: 0.2rem 0.4rem;
  }
  .bug-sub {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-muted);
  }
  .bug-label {
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }
  .opt {
    font-weight: 400;
    color: var(--color-subtle);
  }
  textarea,
  input {
    width: 100%;
    font: inherit;
    font-size: 0.85rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface-tint);
    color: var(--color-text);
    box-sizing: border-box;
  }
  textarea:focus,
  input:focus {
    outline: 2px solid var(--color-primary-soft-strong);
    border-color: var(--color-primary);
  }
  .bug-contact {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }
  @media (max-width: 420px) {
    .bug-contact {
      grid-template-columns: 1fr;
    }
  }
  .bug-attached {
    font-size: 0.72rem;
    color: var(--color-muted);
    border: 1px dashed var(--color-border);
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
  }
  .bug-attached summary {
    cursor: pointer;
    font-weight: 600;
  }
  .bug-attached ul {
    margin: 0.35rem 0 0;
    padding-left: 1rem;
  }
  .bug-err-entry {
    color: #9a3412;
    word-break: break-word;
  }
  .bug-error {
    margin: 0;
    font-size: 0.78rem;
    color: var(--color-red);
  }
  .bug-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.2rem;
  }
  .bug-primary {
    font: inherit;
    font-size: 0.82rem;
    font-weight: 600;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: none;
    background: var(--color-primary);
    color: #fff;
    cursor: pointer;
  }
  .bug-primary:disabled {
    opacity: 0.6;
    cursor: default;
  }
  .bug-ghost {
    font: inherit;
    font-size: 0.82rem;
    padding: 0.45rem 0.9rem;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    cursor: pointer;
  }
  .bug-sent {
    display: grid;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--color-text);
  }
  .bug-sent-lead {
    margin: 0;
    font-weight: 700;
    color: var(--color-text-strong);
  }
  .bug-sent p {
    margin: 0;
  }
  .bug-sent .bug-primary {
    justify-self: end;
    margin-top: 0.3rem;
  }
</style>
