<script lang="ts">
  /**
   * Computers only (≥960px): the customer's request so far, beside the form,
   * with the visit charge as soon as the ZIP and job type are known. On
   * phones the brand band's "Your request" chip does this job instead.
   */
  import { intakeStore } from '$lib/stores/intakeStore';
  import { describeTiming } from '$lib/utils/timing';
  import { propertyTypeLabel } from '$lib/types/intake';

  const money = (n: number) => `$${n.toLocaleString()}`;

  $: state = $intakeStore;
  $: job = state.selectedJobType;
  $: zip = state.address.zip.trim().slice(0, 5);
  $: hasZip = /^\d{5}$/.test(zip);
  $: timing = describeTiming(state);
  $: hasTiming =
    timing !== '—' && (state.schedulingPreference !== '' || state.priorityUpgrade || state.isEmergency);
  // Review's authoritative quote wins; the early advisory fills in before it.
  $: charge = state.feeQuote ?? state.advisoryQuote;
  $: empty = !hasZip && !job && !state.propertyType;
</script>

<aside class="rail" aria-label="Your request">
  <section class="rail-card">
    <h2>Your request</h2>
    {#if empty}
      <p class="rail-empty">Your answers show up here as you go, with any visit charge before you submit.</p>
    {:else}
      <dl>
        {#if hasZip}
          <div>
            <dt>Where</dt>
            <dd>{state.address.city.trim() ? `${state.address.city.trim()}, ` : ''}{zip}</dd>
          </div>
        {/if}
        {#if job}
          <div>
            <dt>Service</dt>
            <dd>
              {job.customerLabel ?? job.name}
              {#if state.isEmergency}<span class="badge">Emergency</span>{/if}
              {#if state.priorityUpgrade}<span class="badge">Priority</span>{/if}
            </dd>
          </div>
        {/if}
        {#if state.propertyType}
          <div>
            <dt>Property</dt>
            <dd>{propertyTypeLabel(state.propertyType)}</dd>
          </div>
        {/if}
        {#if state.address.street.trim()}
          <div>
            <dt>Address</dt>
            <dd>{state.address.street.trim()}{state.address.unit?.trim() ? `, ${state.address.unit.trim()}` : ''}</dd>
          </div>
        {/if}
        {#if hasTiming}
          <div>
            <dt>When</dt>
            <dd>{timing}</dd>
          </div>
        {/if}
      </dl>
      {#if charge}
        <div class="charge">
          <span>Visit charge</span>
          <strong>
            {#if charge.serviced && charge.osc > 0}
              {money(charge.osc)}
            {:else if charge.serviced && charge.flag === 'none'}
              None
            {:else}
              Confirmed by our office
            {/if}
          </strong>
        </div>
      {/if}
    {/if}
  </section>

  <ul class="trust">
    <li>You see any visit charge before you submit</li>
    <li>A real person confirms your appointment</li>
    <li>Emergencies are dispatched the same day</li>
  </ul>
</aside>

<style>
  .rail {
    display: none;
  }

  @media (min-width: 960px) {
    .rail {
      display: grid;
      gap: 0.9rem;
      position: sticky;
      top: 6rem;
      align-self: start;
    }
  }

  .rail-card {
    background: var(--color-surface);
    box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
    border-radius: var(--radius-lg);
    padding: 1.1rem;
    display: grid;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }

  .rail-empty {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  dl {
    margin: 0;
    display: grid;
    gap: 0.55rem;
  }

  dl div {
    display: grid;
    grid-template-columns: 5.2rem minmax(0, 1fr);
    gap: 0.5rem;
    font-size: 0.9rem;
  }

  dt {
    color: var(--color-muted);
  }

  dd {
    margin: 0;
    font-weight: 600;
    overflow-wrap: anywhere;
  }

  .badge {
    display: inline-block;
    margin-left: 0.3rem;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.05rem 0.4rem;
    border-radius: 999px;
    background: var(--color-primary-soft);
    color: var(--color-text-strong);
  }

  .charge {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    background: var(--color-primary-soft);
    color: var(--color-text-strong);
    border-radius: var(--radius-md);
    padding: 0.65rem 0.8rem;
    font-weight: 700;
  }

  .charge span {
    white-space: nowrap;
  }

  .charge strong {
    text-align: right;
  }

  .trust {
    list-style: none;
    margin: 0;
    padding: 0 0.3rem;
    display: grid;
    gap: 0.45rem;
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  /* The rail sits on the desktop photo backdrop (IntakeLayout), so the
     trust lines are light. */
  .trust li {
    color: rgba(255, 255, 255, 0.9);
  }

  .trust li::before {
    content: '✓ ';
    color: #9be8bd;
    font-weight: 800;
  }
</style>
