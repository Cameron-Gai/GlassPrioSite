<script lang="ts">
  import JobTypeBanner from './JobTypeBanner.svelte';
  import type { IntakeState } from '$lib/stores/intakeStore';

  export let state: IntakeState;
  export let onReset: () => void;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';
  const money = (n: number) => `$${n.toLocaleString()}`;
  $: charge = state.feeQuote && state.feeQuote.osc > 0 ? state.feeQuote : null;

  $: nextSteps = buildNextSteps(state);

  function buildNextSteps(s: IntakeState): string[] {
    const job = s.selectedJobType;
    if (!job) return [];
    if (s.isEmergency) {
      return s.isDuringBusinessHours
        ? [
            'A dispatcher will reach out shortly to confirm your address and access',
            'A professional will be on-site within 2 hours during business hours',
            'On arrival we will clean up, board up if needed, and quote any repair'
          ]
        : [
            'A dispatcher will reach out to confirm your address and access',
            'A professional will be on-site within 3 hours, after business hours',
            'On arrival we will clean up, board up if needed, and quote any repair'
          ];
    }
    if (s.remoteConsult) {
      return [
        'A team member will review the photos you sent and start a remote consultation',
        'We will share a rough estimate — no on-site charge for the remote review',
        'If an on-site visit is needed, the visit charge applies only then, and we will confirm first'
      ];
    }
    if (job.category === 'other') {
      return [
        'A client manager will review your request',
        'You will hear back about whether we send a consultant, quote remotely, or refer you elsewhere'
      ];
    }
    if (job.consultationFormat === 'virtual') {
      return [
        'A team member will reach out to start the virtual consultation',
        'Once we review your photos, we will share a rough estimate',
        'After acceptance, a $125 deposit is collected and we schedule the critical on-site measure'
      ];
    }
    return [
      "A team member will follow up to confirm your consultation appointment — if your requested time doesn't work, we'll reach out to find one that does",
      'The consultant will assess the work, take measurements, and provide a written quote',
      'If you accept the quote, we schedule the installation visit'
    ];
  }
</script>

<section class="confirm">
  <div class="hero">
    <span class="check" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7" />
      </svg>
    </span>
    <h2>Request received</h2>
    <p class="sub">
      Confirmation number
      <strong>{state.confirmationNumber ?? '—'}</strong>
    </p>
  </div>

  {#if state.selectedJobType}
    <JobTypeBanner
      job={state.selectedJobType}
      isEmergency={state.isEmergency}
      isDuringBusinessHours={state.isDuringBusinessHours}
      priorityUpgrade={state.priorityUpgrade}
    />
  {/if}

  <section class="next">
    <h3>What happens next</h3>
    <ol>
      {#each nextSteps as step, idx (idx)}
        <li>
          <span class="num">{idx + 1}</span>
          <span>{step}</span>
        </li>
      {/each}
    </ol>
  </section>

  <p class="note">
    {#if state.isEmergency}
      If conditions worsen, call 911 first, then our emergency line at
      <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a>.
    {:else}
      We'll text and email
      <strong>{state.customer.email || 'you'}</strong>
      with updates. Questions? Call us at <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a>.
    {/if}
  </p>

  {#if charge}
    <div class="charge">
      <span class="charge-label">On-site consultation charge</span>
      <span class="charge-amount">
        {money(charge.osc)}
        {#if state.paymentAuthorized}
          <span class="paid">Paid</span>
        {:else if state.remoteConsult}
          <span class="later">Waived — remote consultation first</span>
        {:else if state.payLater}
          <span class="later">
            Payment link will be texted to {state.payLaterPhone || state.customer.phone || 'you'}
          </span>
        {:else}
          <span class="later">Collected at scheduling</span>
        {/if}
      </span>
    </div>
  {/if}

  <button type="button" class="reset" on:click={onReset}>Submit another request</button>
</section>

<style>
  .confirm {
    display: grid;
    gap: 1.1rem;
  }

  .hero {
    display: grid;
    place-items: center;
    gap: 0.35rem;
    text-align: center;
  }

  .check {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: var(--color-accent-bg);
    color: var(--color-accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  h2 {
    margin: 0;
    font-size: 1.55rem;
  }

  .sub {
    color: var(--color-muted);
    margin: 0;
  }

  .sub strong {
    color: var(--color-text);
    letter-spacing: 0.04em;
  }

  .next {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 1rem;
  }

  .next h3 {
    margin: 0 0 0.65rem;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    font-weight: 700;
  }

  .next ol {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.55rem;
  }

  .next li {
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
  }

  .num {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    font-size: 0.78rem;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 0.05rem;
  }

  .note {
    margin: 0;
    color: var(--color-muted);
    text-align: center;
    font-size: 0.92rem;
  }

  .charge {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.85rem 1rem;
  }

  .charge-label {
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-muted);
    font-weight: 700;
  }

  .charge-amount {
    font-weight: 700;
    font-size: 1.05rem;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .charge-amount .paid {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-accent);
    background: var(--color-accent-bg);
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
  }

  .charge-amount .later {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .reset {
    background: var(--color-primary);
    color: #fff;
    padding: 0.8rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
  }

  .reset:hover {
    background: var(--color-primary-hover);
  }
</style>
