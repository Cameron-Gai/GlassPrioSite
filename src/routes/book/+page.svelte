<script lang="ts">
  /**
   * /book — where ad landing pages send their visitors (Mancini Digital first;
   * flow agreed with Mike and Jim 2026-10-09). Mike's page collects name /
   * phone / email, counts the lead, pushes it here through Zapier, and
   * redirects the visitor to this page. It looks exactly like the main site
   * (Cameron, 2026-10-20: same page minus Mike's code); behind the scenes it:
   *   - runs Mike's tracking code on load (AD_TRACKING_SNIPPET, see +page.server)
   *   - fills the contact details (and the ZIP) from the pushed lead, matched
   *     by `lid` or the Google click id on the URL. When the lead has a first
   *     name, phone and email, the contact step is skipped entirely
   *     (contactFromLead); otherwise it shows with what arrived filled in
   *   - reports the address step's ZIP check, each step and the booking to window.dataLayer,
   *     so the advertiser can see where visitors drop off
   * UTM tags / click ids ride onto the ServiceTitan booking as on the main site.
   */
  import { onDestroy, onMount } from 'svelte';
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import IntakeLayout from '$lib/components/IntakeLayout.svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { attribution, readAttribution } from '$lib/attribution';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';
  import type { CustomerInfo } from '$lib/types/intake';
  import type { PageData } from './$types';

  export let data: PageData;

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();

  // --- dataLayer: the advertiser's view of the funnel ----------------------
  function track(event: string, detail: Record<string, unknown> = {}) {
    if (typeof window === 'undefined') return;
    const w = window as unknown as { dataLayer?: unknown[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...detail });
  }

  // --- Prefill from the partner's pushed lead -----------------------------
  const POLL_MS = 3000;
  const POLL_TRIES = 60; // ~3 minutes; Zapier usually lands in seconds
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

  function applyLead(lead: Partial<CustomerInfo> & { zip?: string }) {
    const s = $intakeStore;
    const patch: Partial<CustomerInfo> = {};
    // Only fill blanks — never overwrite what the visitor already typed.
    for (const key of ['firstName', 'lastName', 'phone', 'email'] as const) {
      const v = lead[key]?.trim();
      if (v && !s.customer[key].trim()) patch[key] = v;
    }
    if (Object.keys(patch).length) intakeStore.updateCustomer(patch);
    if (lead.zip && !s.address.zip.trim()) intakeStore.updateAddress({ zip: lead.zip });
    // Skip the contact step only when it has everything the booking needs
    // (last name is optional for ad leads). Not once the visitor is already
    // on it or editing it from review.
    const c = $intakeStore.customer;
    const complete =
      c.firstName.trim() !== '' &&
      c.phone.replace(/D/g, '').length >= 10 &&
      /^[^s@]+@[^s@]+.[^s@]+$/.test(c.email.trim());
    const st = $intakeStore.step;
    if (complete && st !== 'contact' && st !== 'review' && st !== 'confirmation') {
      intakeStore.setContactFromLead(true);
    }
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

  // --- ZIP check, step and booking events ---------------------------------
  let mounted = false;
  let lastStep: string | null = null;
  let lastAreaKey = '';
  let bookedSent: string | null = null;
  const unsubscribe = intakeStore.subscribe((s) => {
    if (!mounted) return;
    // The address step's ZIP lookup (ZoneFeeNotice) resolved: in area or not.
    const q = s.advisoryQuote;
    const areaKey = q ? `${s.address.zip.trim().slice(0, 5)}|${q.serviced}` : '';
    if (q && areaKey !== lastAreaKey && (q.serviced || q.flag === 'unserviced-or-unknown')) {
      lastAreaKey = areaKey;
      track('glassdoctor_zip_checked', { serviced: q.serviced });
    }
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

    // The wizard (a child) has already restored any saved draft by now.
    mounted = true;
    lastStep = $intakeStore.step;
    track('glassdoctor_step', { step: lastStep });

    const key = params.get('lid') || params.get('gclid') || params.get('gbraid') || params.get('wbraid');
    if (key) pollLead(key, POLL_TRIES);
  });

  onDestroy(() => {
    if (pollTimer) clearTimeout(pollTimer);
    unsubscribe();
  });
</script>

<svelte:head>
  <title>Book Glass Doctor Online</title>
  <meta name="robots" content="noindex" />
  {#if data.trackingSnippet}{@html data.trackingSnippet}{/if}
</svelte:head>

<IntakeLayout {openNow} {hoursDescription}>
  <IntakeWizard />
</IntakeLayout>
