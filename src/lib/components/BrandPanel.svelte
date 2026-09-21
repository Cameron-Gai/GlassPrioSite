<script lang="ts">
  /**
   * The persistent brand side of the split layout. It opens with the promise,
   * then — as soon as the customer has answered anything — swaps to their
   * request building up beside "what happens next", so the review step is a
   * confirmation rather than a surprise.
   *
   * ≥960px it is a full-height sticky column; below that it folds into a slim
   * sticky band whose summary sits behind a "Details" toggle.
   *
   * Deliberately shows NO step count, step list, or progress meter (owner
   * decision 2026-09-21): a visible "2 of 8" costs more abandonment than it
   * buys orientation. Reassure with time ("about two minutes"), never length.
   */
  import { intakeStore } from '$lib/stores/intakeStore';
  import { describeTiming } from '$lib/utils/timing';
  import { propertyTypeLabel } from '$lib/types/intake';

  export let openNow: boolean;
  export let hoursDescription: string;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';
  const money = (n: number) => `$${n.toLocaleString()}`;

  let expanded = false;

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
</script>

<aside class="bp" data-filled={hasAnything}>
  <div class="bp-top">
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
    <a class="call-chip" href={SUPPORT_PHONE_HREF} aria-label="Call {SUPPORT_PHONE}">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
      {SUPPORT_PHONE}
    </a>
  </div>

  <div class="bp-body">
    {#if !hasAnything}
      <div class="promise">
        <p class="eyebrow">We Fix Your Panes!®</p>
        <h1>Glass fixed right. Requested in two minutes.</h1>
        <ul class="trust">
          <li>You see any visit charge before you submit</li>
          <li>A real person confirms your appointment</li>
          <li>Emergencies are dispatched the same day</li>
        </ul>
      </div>
    {:else}
      <h1 class="sr-only">Glass Doctor — request service</h1>
      <button
        type="button"
        class="handle"
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
  </div>

  <div class="bp-foot">
    <span class="status" data-open={openNow}>
      <span class="status-dot" aria-hidden="true"></span>
      {openNow ? 'Open now' : 'After hours — emergencies welcome'}
    </span>
    <p>Rather talk? <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a></p>
    <p class="hours">{hoursDescription}</p>
  </div>
</aside>

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
     panel — fixed brand angle, decorative only. */
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

  .bp-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
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
  .handle:focus-visible,
  .bp-foot a:focus-visible {
    outline: 2px solid #fff;
    outline-offset: 2px;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-light-blue);
  }

  h1 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.2;
    font-weight: 800;
    letter-spacing: -0.02em;
    text-wrap: balance;
  }

  .promise {
    display: grid;
    gap: 0.35rem;
  }

  /* Phone band keeps the promise to the headline; the reassurances need the
     room the desktop column has. */
  .trust,
  .promise .eyebrow,
  .bp-foot {
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

  .next ul,
  .trust {
    list-style: none;
    margin: 0;
    padding: 0;
    gap: 0.6rem;
  }

  .next ul {
    display: grid;
  }

  .next li,
  .trust li {
    display: grid;
    grid-template-columns: 6px minmax(0, 1fr);
    gap: 0.65rem;
    align-items: baseline;
    font-size: 0.9rem;
    line-height: 1.45;
    color: var(--bp-soft);
  }

  .next li::before,
  .trust li::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-light-blue);
    transform: translateY(-2px);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    align-self: flex-start;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--bp-soft);
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

  .bp-foot p {
    margin: 0;
    font-size: 0.86rem;
    color: var(--bp-soft);
  }

  .bp-foot a {
    color: #fff;
    font-weight: 700;
    text-decoration: none;
  }

  .bp-foot a:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .bp-foot .hours {
    font-size: 0.76rem;
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
    .bp {
      height: 100%;
      gap: 2rem;
      justify-content: space-between;
      /* bottom room for the fixed Report-a-bug button, which sits over this corner */
      padding: 2.2rem 2.4rem 4.4rem;
      overflow-y: auto;
    }

    .call-chip,
    .handle {
      display: none;
    }

    .promise {
      gap: 1.1rem;
    }

    .promise .eyebrow {
      display: block;
    }

    h1 {
      font-size: clamp(1.9rem, 2.6vw, 2.6rem);
      line-height: 1.08;
    }

    .trust {
      display: grid;
      margin-top: 0.5rem;
    }

    .trust li {
      font-size: 0.98rem;
    }

    .filled {
      display: grid;
      gap: 1.6rem;
      max-height: none;
      overflow: visible;
    }

    .bp-foot {
      display: grid;
      gap: 0.35rem;
    }
  }
</style>
