<script lang="ts">
  /**
   * Desktop-only live summary ("Your request so far"): fills in as the customer
   * answers, so the review step feels like confirmation instead of surprise.
   * Rendered by +page.svelte in a sticky right-hand rail ≥1100px; the page
   * hides it below that. Reads the store directly — no props.
   */
  import { intakeStore } from '$lib/stores/intakeStore';
  import { describeTiming } from '$lib/utils/timing';

  const money = (n: number) => `$${n.toLocaleString()}`;

  $: state = $intakeStore;
  $: job = state.selectedJobType;
  $: hasAddress = state.address.street.trim() !== '' || /^\d{5}/.test(state.address.zip.trim());
  $: timing = describeTiming(state);
  $: hasTiming = timing !== '—' && (state.schedulingPreference !== '' || state.priorityUpgrade || state.isEmergency);
  // Review's authoritative quote wins; the address-step advisory fills in earlier.
  $: charge = state.feeQuote ?? state.advisoryQuote;
  $: hasAnything = !!job || !!state.propertyType || hasAddress || hasTiming;
</script>

<aside class="rail" aria-label="Your request so far">
  <h2>Your request so far</h2>

  {#if !hasAnything}
    <p class="empty">Your answers appear here as you go.</p>
  {:else}
    <dl>
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
          <dd>
            {state.propertyType}{state.propertyDetails.businessName
              ? ` · ${state.propertyDetails.businessName}`
              : state.propertyDetails.complexName
                ? ` · ${state.propertyDetails.complexName}`
                : ''}
          </dd>
        </div>
      {/if}
      {#if hasAddress}
        <div>
          <dt>Address</dt>
          <dd>
            {#if state.address.street.trim()}{state.address.street}<br />{/if}
            {state.address.city}{state.address.city && state.address.zip ? ', ' : ''}{state.address.zip}
          </dd>
        </div>
      {/if}
      {#if hasTiming}
        <div>
          <dt>Timing</dt>
          <dd>{timing}</dd>
        </div>
      {/if}
      {#if charge}
        <div>
          <dt>On-site charge</dt>
          <dd>
            {#if charge.serviced && charge.osc > 0}
              {money(charge.osc)}{charge.zoneName ? ` · ${charge.zoneName}` : ''}
            {:else if charge.serviced && charge.flag === 'none'}
              None for this service
            {:else}
              Confirmed before scheduling
            {/if}
          </dd>
        </div>
      {/if}
      {#if state.issueDetails.photos.length > 0}
        <div>
          <dt>Photos</dt>
          <dd>{state.issueDetails.photos.length} attached</dd>
        </div>
      {/if}
    </dl>
  {/if}
</aside>

<style>
  .rail {
    background: var(--color-surface-frost);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 1rem 1.1rem;
    box-shadow: var(--shadow-sm);
  }

  h2 {
    margin: 0 0 0.7rem;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-muted);
    font-weight: 700;
  }

  .empty {
    margin: 0;
    color: var(--color-subtle);
    font-size: 0.88rem;
    line-height: 1.5;
  }

  dl {
    margin: 0;
    display: grid;
    gap: 0.65rem;
  }

  dt {
    font-size: 0.74rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-subtle);
    font-weight: 700;
    margin-bottom: 0.1rem;
  }

  dd {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 500;
    color: var(--color-text);
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .badge {
    display: inline-block;
    margin-left: 0.35rem;
    padding: 0.08rem 0.45rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: var(--color-emergency-bg);
    color: var(--color-emergency);
    vertical-align: 1px;
  }
</style>
