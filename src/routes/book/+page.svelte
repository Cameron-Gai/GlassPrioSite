<script lang="ts">
  /**
   * /book — where ad landing pages send their visitors (Mancini Digital first;
   * flow agreed with Mike and Jim 2026-10-09). Mike's page collects name /
   * phone / email, counts the lead, pushes it here through Zapier, and
   * redirects the visitor to this page. Compared with the main site, this page:
   *   - runs Mike's tracking code on load (AD_TRACKING_SNIPPET, see +page.server)
   *   - asks the ZIP FIRST and stops out-of-area visitors before the form
   *   - prefills the contact step from the pushed lead (matched by `lid` or the
   *     Google click id on the URL) so nobody types their details twice
   *   - shows a bold progress bar and a standing "rather talk to a person?" line
   *   - reports each step and the booking to window.dataLayer, so the
   *     advertiser can see where visitors drop off
   * UTM tags / click ids ride onto the ServiceTitan booking as on the main site.
   */
  import { onDestroy, onMount } from 'svelte';
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import BrandPanel from '$lib/components/BrandPanel.svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { attribution, readAttribution } from '$lib/attribution';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';
  import type { CustomerInfo } from '$lib/types/intake';
  import type { PageData } from './$types';

  export let data: PageData;

  const SUPPORT_PHONE = '(206) 508-2444';
  const SUPPORT_PHONE_HREF = 'tel:+12065082444';
  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();

  // --- dataLayer: the advertiser's view of the funnel ----------------------
  function track(event: string, detail: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...detail });
  }

  // --- ZIP first ------------------------------------------------------------
  let gatePassed = false;
  let zipInput = '';
  let zipChecking = false;
  let zipError = '';
  let outOfArea: string | null = null;

  async function checkZip() {
    const zip = zipInput.trim();
    zipError = '';
    outOfArea = null;
    if (!/^\d{5}$/.test(zip)) {
      zipError = 'Enter a 5-digit ZIP code.';
      return;
    }
    zipChecking = true;
    let serviced = true;
    try {
      const res = await fetch(`/api/service-area?zip=${zip}`);
      if (res.ok) serviced = (await res.json()).serviced !== false;
    } catch {
      // Can't tell — let them through rather than turn away a real lead.
    }
    zipChecking = false;
    track('glassdoctor_zip_checked', { serviced });
    if (!serviced) {
      outOfArea = zip;
      return;
    }
    intakeStore.updateAddress({ zip });
    gatePassed = true;
  }

  // --- Prefill from the partner's pushed lead -----------------------------
  const POLL_MS = 3000;
  const POLL_TRIES = 60; // ~3 minutes; Zapier usually lands in seconds
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  function applyLead(lead: Partial<CustomerInfo> & { zip?: string }) {
    const current = $intakeStore.customer;
    const patch: Partial<CustomerInfo> = {};
    // Only fill blanks — never overwrite what the visitor already typed.
    for (const key of ['firstName', 'lastName', 'phone', 'email'] as const) {
      const v = lead[key]?.trim();
      if (v && !current[key].trim()) patch[key] = v;
    }
    if (Object.keys(patch).length) intakeStore.updateCustomer(patch);
    if (lead.zip && !gatePassed && !zipInput.trim()) zipInput = lead.zip;
  }

  function pollLead(key: string, triesLeft: number) {
    pollTimer = setTimeout(async () => {
      pollTimer = null;
      try {
        const res = await fetch(`/api/leads/inbound/${encodeURIComponent(key)}`);
        if (res.ok) {
          const body = await res.json();
          if (body.found && body.lead) {
            applyLead(body.lead);
            track('glassdoctor_lead_matched');
            return;
          }
        }
        if (res.status === 429) triesLeft = Math.min(triesLeft, 3);
      } catch {
        /* network blip — try again */
      }
      if (triesLeft > 1) pollLead(key, triesLeft - 1);
    }, triesLeft === POLL_TRIES ? 0 : POLL_MS);
  }

  // --- Step + booking events ----------------------------------------------
  let lastStep: string | null = null;
  let bookedSent: string | null = null;
  const unsubscribe = intakeStore.subscribe((s) => {
    if (!gatePassed) return;
    if (s.step !== lastStep) {
      lastStep = s.step;
      track('glassdoctor_step', { step: s.step });
    }
    if (s.step === 'confirmation' && s.confirmationNumber && bookedSent !== s.confirmationNumber) {
      bookedSent = s.confirmationNumber;
      track('glassdoctor_booked', {
        confirmationNumber: s.confirmationNumber,
        service: s.selectedJobType?.customerLabel ?? s.selectedJobType?.name ?? null
      });
    }
  });

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    attribution.set(readAttribution(params));

    // A visitor coming back to a saved draft already answered the ZIP.
    intakeStore.hydrate();
    const savedZip = $intakeStore.address.zip.trim();
    if (/^\d{5}/.test(savedZip)) gatePassed = true;

    const key = params.get('lid') || params.get('gclid') || params.get('gbraid') || params.get('wbraid');
    if (key) pollLead(key, POLL_TRIES);
  });

  onDestroy(() => {
    if (pollTimer) clearTimeout(pollTimer);
    unsubscribe();
  });

  $: if (gatePassed && lastStep === null) {
    lastStep = $intakeStore.step;
    track('glassdoctor_step', { step: lastStep });
  }
</script>

<svelte:head>
  <title>Book Glass Doctor Online</title>
  <meta name="robots" content="noindex" />
  {#if data.trackingSnippet}{@html data.trackingSnippet}{/if}
</svelte:head>

<div class="page">
  <div class="band">
    <BrandPanel {openNow} />
  </div>

  <main>
    <section class="panel">
      {#if gatePassed}
        <IntakeWizard showProgress talkToPerson />
      {:else}
        <form class="gate" novalidate on:submit|preventDefault={checkZip}>
          <p class="gate-kicker">Book online in about 2 minutes</p>
          <h1>First, where's the job?</h1>
          <p class="gate-sub">We'll make sure we serve your area before you start.</p>

          <label for="book-zip">ZIP code</label>
          <input
            id="book-zip"
            inputmode="numeric"
            autocomplete="postal-code"
            maxlength="5"
            placeholder="98101"
            bind:value={zipInput}
            on:input={() => {
              zipError = '';
              outOfArea = null;
            }}
          />
          {#if zipError}<p class="gate-error" role="alert">{zipError}</p>{/if}

          {#if outOfArea}
            <div class="gate-out" role="alert">
              <p><strong>Sorry, we don't serve {outOfArea} yet.</strong></p>
              <p>
                If you think that's a mistake, give us a call at
                <a href={SUPPORT_PHONE_HREF}>{SUPPORT_PHONE}</a> and we'll double-check.
              </p>
            </div>
          {/if}

          <button type="submit" class="gate-go" disabled={zipChecking}>
            {zipChecking ? 'Checking…' : 'Continue'}
          </button>
          <p class="gate-call">
            Rather talk to a person? <a href={SUPPORT_PHONE_HREF}>Call {SUPPORT_PHONE}</a>
          </p>
        </form>
      {/if}
    </section>

    <footer class="foot">
      <ul class="trust">
        <li>You see any visit charge before you submit</li>
        <li>A real person confirms your appointment</li>
        <li>Emergencies are dispatched the same day</li>
      </ul>
      <p>Business hours: {hoursDescription}</p>
      <p class="emergency-line">Active life-safety emergency? Call 911 first, then submit the form.</p>
    </footer>
  </main>
</div>

<style>
  /* Same frame as the main site (src/routes/+page.svelte). */
  .page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .band {
    position: sticky;
    top: 0;
    z-index: 20;
  }

  main {
    flex: 1;
    width: 100%;
    max-width: 700px;
    margin: 0 auto;
    padding: 1rem 0.85rem 2.5rem;
  }

  .panel {
    background: var(--color-surface-frost);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: var(--radius-lg);
    padding: 1.1rem;
    box-shadow: var(--shadow-glass);
    border: 1px solid rgba(255, 255, 255, 0.6);
    outline: 1px solid var(--color-border);
    outline-offset: -1px;
  }

  .gate {
    display: grid;
    gap: 0.6rem;
    max-width: 420px;
    margin: 0 auto;
    padding: 0.5rem 0;
  }

  .gate-kicker {
    margin: 0;
    font-size: 0.82rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--color-muted);
  }

  .gate h1 {
    margin: 0;
    font-size: 1.6rem;
    line-height: 1.2;
    color: var(--color-text-strong);
  }

  .gate-sub {
    margin: 0 0 0.4rem;
    color: var(--color-muted);
  }

  .gate label {
    font-weight: 600;
    font-size: 0.9rem;
  }

  .gate input {
    font: inherit;
    font-size: 1.25rem;
    letter-spacing: 0.08em;
    padding: 0.8rem 1rem;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
  }

  .gate input:focus-visible {
    outline: 2px solid var(--color-light-blue);
    outline-offset: 1px;
  }

  .gate-error {
    margin: 0;
    color: var(--color-emergency);
    font-size: 0.88rem;
    font-weight: 600;
  }

  .gate-out {
    background: var(--color-warning-bg);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    padding: 0.75rem 0.9rem;
    font-size: 0.92rem;
  }

  .gate-out p {
    margin: 0;
  }

  .gate-out p + p {
    margin-top: 0.3rem;
  }

  .gate-out a {
    color: var(--color-text-strong);
    font-weight: 700;
  }

  .gate-go {
    margin-top: 0.3rem;
    padding: 0.9rem 1.3rem;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }

  .gate-go:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  .gate-go:disabled {
    opacity: 0.7;
    cursor: progress;
  }

  .gate-call {
    margin: 0.2rem 0 0;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .gate-call a {
    color: var(--color-text-strong);
    font-weight: 700;
    white-space: nowrap;
  }

  .foot {
    margin-top: 1.5rem;
    color: var(--color-muted);
    font-size: 0.85rem;
    text-align: center;
    display: grid;
    gap: 0.2rem;
  }

  .foot p {
    margin: 0;
  }

  .trust {
    list-style: none;
    margin: 0 0 0.6rem;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.35rem 1.1rem;
  }

  .trust li {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
  }

  .trust li::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-light-blue);
    flex-shrink: 0;
  }

  .emergency-line {
    color: var(--color-emergency);
    font-weight: 600;
  }

  @media (min-width: 521px) {
    main {
      padding: 1.4rem 1.2rem 3rem;
    }

    .panel {
      padding: 1.5rem;
      border-radius: var(--radius-xl);
    }
  }

  @media (min-width: 960px) {
    main {
      max-width: 660px;
      padding: 3.5rem 1.5rem 3rem;
    }

    .panel {
      background: none;
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
      box-shadow: none;
      border: 0;
      outline: 0;
      padding: 0;
      border-radius: 0;
    }

    .foot {
      margin-top: 3rem;
    }
  }
</style>
