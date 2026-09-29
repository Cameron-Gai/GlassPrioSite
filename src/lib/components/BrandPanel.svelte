<script lang="ts">
  /**
   * The slim blue brand band across the top of the intake, at every width.
   * The form below it asks one thing at a time, so the band stays out of the
   * way: brand, open/closed, the phone number, and — once the customer has
   * answered anything — a "Your request" chip that opens their summary and
   * what happens next, so the review step is a confirmation, not a surprise.
   *
   * Phones: before any answer the band also carries the headline; the summary
   * opens inline under the chip. Desktop (≥960px): one row; the headline is
   * left to the question itself, and the summary drops down as a card.
   *
   * Deliberately shows NO step count, step list, or progress meter (owner
   * decision 2026-09-21): a visible "2 of 8" costs more abandonment than it
   * buys orientation. Reassure with time ("about two minutes"), never length.
   */
  import { intakeStore } from '$lib/stores/intakeStore';
  import { describeTiming } from '$lib/utils/timing';
  import { propertyTypeLabel } from '$lib/types/intake';

  export let openNow: boolean;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';
  const money = (n: number) => `$${n.toLocaleString()}`;

  let expanded = false;
  let bandEl: HTMLElement | undefined;

  $: state = $intakeStore;
  $: job = state.selectedJobType;
  $: hasAddress = state.address.street.trim() !== '' || /^\d{5}/.test(state.address.zip.trim());
  $: timing = describeTiming(state);
  $: hasTiming =
    timing !== '—' && (state.schedulingPreference !== '' || state.priorityUpgrade || state.isEmergency);
  // Review's authoritative quote wins; the address-step advisory fills in earlier.
  $: charge = state.feeQuote ?? state.advisoryQuote;
  $: hasAnything = !!job || !!state.propertyType || hasAddress || hasTiming;
  $: done = state.step === 'confirmation';
  $: if (!hasAnything) expanded = false;
  $: handle = [job ? (job.customerLabel ?? job.name) : '', state.address.city.trim()]
    .filter(Boolean)
    .join(' · ');
  $: nextLines = state.isEmergency
    ? [
        'A dispatcher confirms your address and access',
        state.isDuringBusinessHours
          ? 'A professional is on-site within 2 hours'
          : 'A professional is on-site within 3 hours, after hours',
        'We clean up, board up if needed, and quote the repair'
      ]
    : [
        'We check your area and show any visit charge before you submit',
        'You pick a day that suits you',
        'Our office follows up to confirm your appointment'
      ];

  function onWindowClick(event: MouseEvent) {
    if (expanded && bandEl && !bandEl.contains(event.target as Node)) expanded = false;
  }

  function onWindowKey(event: KeyboardEvent) {
    if (expanded && event.key === 'Escape') expanded = false;
  }
</script>

<svelte:window on:click={onWindowClick} on:keydown={onWindowKey} />

<header class="bp" bind:this={bandEl}>
  <div class="bp-row">
    <div class="brand">
      <span class="reflective-ray" aria-hidden="true">
        <span class="ray ray-red"></span>
        <span class="ray ray-white"></span>
        <span class="ray ray-blue"></span>
      </span>
      <span class="lockup">
        <span class="wordmark">GLASS<span class="wm-doctor">DOCTOR</span><span class="wm-rx">Rx</span><span class="wm-reg">®</span></span>
        <span class="brand-sub">a Neighborly company</span>
      </span>
    </div>

    <div class="bp-end">
      {#if hasAnything}
        <button
          type="button"
          class="handle handle-desk"
          aria-expanded={expanded}
          aria-controls="bp-summary"
          on:click={() => (expanded = !expanded)}
        >
          <span class="handle-label">Your request</span>
          <span class="handle-text">{handle || 'In progress'}</span>
          <span class="chev" aria-hidden="true">{expanded ? '▴' : '▾'}</span>
        </button>
      {/if}
      <span class="status" data-open={openNow}>
        <span class="status-dot" aria-hidden="true"></span>
        {openNow ? 'Open now' : 'After hours — emergencies welcome'}
      </span>
      <a class="call-chip" href={SUPPORT_PHONE_HREF} aria-label="Call {SUPPORT_PHONE}">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        {SUPPORT_PHONE}
      </a>
    </div>
  </div>

  {#if !hasAnything}
    <h1 class="promise">Glass fixed right. Requested in two minutes.</h1>
  {:else}
    <h1 class="sr-only">Glass Doctor — request service</h1>
    <button
      type="button"
      class="handle handle-phone"
      aria-expanded={expanded}
      aria-controls="bp-summary"
      on:click={() => (expanded = !expanded)}
    >
      <span class="handle-text">{handle || 'Your request'}</span>
      <span class="handle-cue">{expanded ? 'Hide' : 'Details'}</span>
    </button>

    <div class="filled" id="bp-summary" data-expanded={expanded}>
      <section class="sum" aria-label="Your request so far">
        <h2>Your request</h2>
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
                {propertyTypeLabel(state.propertyType)}{state.propertyDetails.businessName
                  ? ` · ${state.propertyDetails.businessName}`
                  : state.propertyDetails.complexName
                    ? ` · ${state.propertyDetails.complexName}`
                    : ''}
              </dd>
            </div>
            {#if state.propertyType === 'Facility maintenance' && state.propertyDetails.workOrderNumber}
              <div>
                <dt>Work order</dt>
                <dd>{state.propertyDetails.workOrderNumber}</dd>
              </div>
            {/if}
          {/if}
          {#if state.issueDetails.photos.length > 0}
            <div>
              <dt>Photos</dt>
              <dd>{state.issueDetails.photos.length} attached</dd>
            </div>
          {/if}
          {#if hasAddress}
            <div>
              <dt>Address</dt>
              <dd>
                {#if state.address.street.trim()}{state.address.street}{state.address.unit?.trim()
                    ? `, ${state.address.unit}`
                    : ''}<br />{/if}
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
              <dt>Visit charge</dt>
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
        </dl>
      </section>

      {#if !done}
        <section class="next">
          <h2>What happens next</h2>
          <ul>
            {#each nextLines as line (line)}
              <li>{line}</li>
            {/each}
          </ul>
        </section>
      {/if}
    </div>
  {/if}
</header>

<style>
  .bp {
    --bp-ink: #ffffff;
    --bp-soft: rgba(255, 255, 255, 0.76);
    --bp-line: rgba(255, 255, 255, 0.22);
    --bp-fill: rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
    color: var(--bp-ink);
    background: linear-gradient(155deg, #06038d 0%, #12289b 62%, #1d4bbb 100%);
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: calc(0.7rem + env(safe-area-inset-top, 0px)) 1rem 0.8rem;
  }

  /* The brand's Reflective Ray, scaled up into a pane of light across the
     band — fixed brand angle, decorative only. */
  .bp::after {
    content: '';
    position: absolute;
    top: -20%;
    right: -18%;
    width: 55%;
    height: 150%;
    transform: skewX(-18deg);
    background: linear-gradient(
      90deg,
      rgba(255, 56, 57, 0.1) 0 22%,
      transparent 22% 30%,
      rgba(255, 255, 255, 0.09) 30% 58%,
      transparent 58% 66%,
      rgba(96, 175, 230, 0.26) 66% 100%
    );
    pointer-events: none;
  }

  .bp > * {
    position: relative;
    z-index: 1;
  }

  .bp-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .bp-end {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    min-width: 0;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    flex-shrink: 0;
  }

  .reflective-ray {
    display: inline-flex;
    gap: 3px;
    height: 28px;
  }

  .ray {
    display: block;
    width: 6px;
    height: 100%;
    transform: skewX(-18deg);
    border-radius: 1px;
  }

  .ray-red {
    background: var(--color-red-web);
  }

  .ray-white {
    background: #ffffff;
  }

  .ray-blue {
    background: var(--color-light-blue);
  }

  .lockup {
    display: flex;
    flex-direction: column;
    line-height: 1.05;
  }

  .wordmark {
    font-weight: 800;
    font-size: 1.22rem;
    letter-spacing: -0.02em;
    display: inline-flex;
    align-items: baseline;
  }

  .wm-doctor {
    margin-left: 0.12em;
  }

  .wm-rx {
    font-size: 0.62em;
    align-self: flex-end;
    transform: translateY(0.12em);
  }

  .wm-reg {
    font-size: 0.42em;
    align-self: flex-start;
    transform: translateY(0.15em);
  }

  .brand-sub {
    font-size: 0.6rem;
    font-weight: 600;
    color: var(--bp-soft);
    margin-top: 2px;
  }

  .call-chip {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    border-radius: 999px;
    background: var(--bp-fill);
    border: 1px solid var(--bp-line);
    color: #fff;
    font-size: 0.82rem;
    font-weight: 700;
    text-decoration: none;
    white-space: nowrap;
  }

  .call-chip:hover {
    background: rgba(255, 255, 255, 0.18);
  }

  .call-chip:focus-visible,
  .handle:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .promise {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }

  /* Phone: status and the one-row chip don't fit; the phone button does. */
  .status,
  .handle-desk {
    display: none;
  }

  .handle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    background: var(--bp-fill);
    border: 1px solid var(--bp-line);
    color: #fff;
    font-size: 0.84rem;
    font-weight: 600;
    text-align: left;
  }

  .handle-text {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .handle-cue {
    flex-shrink: 0;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--bp-soft);
  }

  .filled {
    display: none;
    gap: 1rem;
    max-height: 55vh;
    overflow-y: auto;
  }

  .filled[data-expanded='true'] {
    display: grid;
  }

  .sum {
    background: var(--bp-fill);
    border: 1px solid var(--bp-line);
    border-radius: 14px;
    padding: 0.9rem 1rem;
  }

  h2 {
    margin: 0 0 0.6rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--bp-soft);
  }

  dl {
    margin: 0;
    display: grid;
    gap: 0.6rem;
  }

  dl > div {
    display: grid;
    grid-template-columns: 5.6rem minmax(0, 1fr);
    gap: 0.6rem;
    align-items: baseline;
  }

  dt {
    font-size: 0.8rem;
    color: var(--bp-soft);
  }

  dd {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }

  .badge {
    display: inline-block;
    margin-left: 0.3rem;
    padding: 0.08rem 0.45rem;
    border-radius: 999px;
    font-size: 0.66rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    background: #fff;
    color: var(--color-emergency);
    vertical-align: 1px;
  }

  .next ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6rem;
  }

  .next li {
    display: grid;
    grid-template-columns: 6px minmax(0, 1fr);
    gap: 0.65rem;
    align-items: baseline;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--bp-soft);
  }

  .next li::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-light-blue);
    transform: translateY(-2px);
  }

  .status {
    align-items: center;
    gap: 0.45rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--bp-soft);
    white-space: nowrap;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.45);
  }

  .status[data-open='true'] {
    color: #fff;
  }

  .status[data-open='true'] .status-dot {
    background: var(--color-light-blue);
    box-shadow: 0 0 0 4px rgba(96, 175, 230, 0.28);
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }

  @media (min-width: 960px) {
    /* One slim row. The drop-down summary has to escape the band, so the
       band stops clipping — and the decorative ray, which relied on that
       clip, is dropped rather than left to spill past the viewport. */
    .bp {
      overflow: visible;
      padding: 0.85rem clamp(1.5rem, 4vw, 3rem);
      gap: 0;
    }

    .bp::after {
      display: none;
    }

    .status {
      display: inline-flex;
    }

    /* The question below is the headline on desktop. */
    .promise,
    .handle-phone {
      display: none;
    }

    .handle-desk {
      display: inline-flex;
      width: auto;
      max-width: 22rem;
      padding: 0.4rem 0.8rem;
      border-radius: 999px;
      gap: 0.5rem;
    }

    .handle-label {
      flex-shrink: 0;
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--bp-soft);
    }

    .chev {
      flex-shrink: 0;
      font-size: 0.7rem;
      color: var(--bp-soft);
    }

    .filled,
    .filled[data-expanded='true'] {
      display: none;
    }

    .filled[data-expanded='true'] {
      display: grid;
      position: absolute;
      top: calc(100% + 0.5rem);
      right: clamp(1.5rem, 4vw, 3rem);
      width: min(24rem, calc(100vw - 3rem));
      max-height: min(70vh, 34rem);
      gap: 1.2rem;
      padding: 1.1rem 1.2rem;
      border-radius: 16px;
      background: linear-gradient(160deg, #06038d 0%, #12289b 100%);
      box-shadow: 0 18px 48px rgba(6, 3, 80, 0.28);
    }
  }
</style>
