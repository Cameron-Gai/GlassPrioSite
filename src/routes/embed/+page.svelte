<script lang="ts">
  /**
   * /embed — the booking form alone, for an iframe on someone else's page
   * (Mancini Digital's Google Ads landing pages first). No brand band, no
   * footer, transparent background: the host page supplies the frame.
   *
   * It talks to the host page with postMessage (the snippet on /embed/demo
   * listens for these):
   *   glassdoctor:resize  { height }   — size the iframe to the form, no inner scrollbar
   *   glassdoctor:step                 — a new step began; scroll the iframe into view
   *   glassdoctor:booked  { confirmationNumber, service } — fire the ad conversion here
   * The host's UTM tags / Google click ids arrive on this page's URL and ride
   * along to the ServiceTitan booking ($lib/attribution).
   */
  import { onDestroy, onMount } from 'svelte';
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { attribution, readAttribution } from '$lib/attribution';

  let root: HTMLDivElement;
  let observer: ResizeObserver | null = null;
  let lastHeight = 0;
  let bookedSent: string | null = null;

  function post(message: Record<string, unknown>) {
    if (typeof window === 'undefined' || window.parent === window) return;
    // '*' is deliberate: the host can be any landing page. Nothing sensitive is
    // sent — a height, a step tick, and the confirmation number after booking.
    window.parent.postMessage(message, '*');
  }

  function reportHeight() {
    const h = Math.ceil(root?.getBoundingClientRect().height ?? 0);
    if (h && Math.abs(h - lastHeight) > 2) {
      lastHeight = h;
      post({ type: 'glassdoctor:resize', height: h });
    }
  }

  const unsubscribe = intakeStore.subscribe((s) => {
    if (s.step === 'confirmation' && s.confirmationNumber && bookedSent !== s.confirmationNumber) {
      bookedSent = s.confirmationNumber;
      post({ type: 'glassdoctor:booked', confirmationNumber: s.confirmationNumber, service: s.selectedJobType?.customerLabel ?? s.selectedJobType?.name ?? null });
    }
  });

  onMount(() => {
    attribution.set(readAttribution(new URLSearchParams(window.location.search)));
    observer = new ResizeObserver(reportHeight);
    observer.observe(root);
    reportHeight();
  });

  onDestroy(() => {
    observer?.disconnect();
    unsubscribe();
  });
</script>

<svelte:head>
  <title>Book Glass Doctor</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<div class="embed" bind:this={root}>
  <section class="panel">
    <IntakeWizard embedded onStepChanged={() => post({ type: 'glassdoctor:step' })} />
  </section>
  <p class="foot">
    Glass Doctor of Seattle · <a href="tel:+12065082444">(206) 508-2444</a> · Active life-safety emergency? Call 911 first.
  </p>
</div>

<style>
  /* The host page paints the background; this page is just the card. */
  :global(html),
  :global(body) {
    background: transparent !important;
    background-image: none !important;
  }

  .embed {
    padding: 4px 4px 8px;
    display: grid;
    gap: 0.6rem;
  }

  .panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 1.1rem;
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
  }

  .foot {
    margin: 0;
    text-align: center;
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .foot a {
    color: inherit;
    font-weight: 600;
  }

  @media (min-width: 521px) {
    .panel {
      padding: 1.4rem 1.5rem;
    }
  }
</style>
