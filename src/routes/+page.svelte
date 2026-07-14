<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import SummaryRail from '$lib/components/SummaryRail.svelte';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();
</script>

<svelte:head>
  <title>Glass Doctor — Request Service</title>
  <meta
    name="description"
    content="Glass Doctor — request glass, window, door, or hardware service. Urgent issues are dispatched the same day."
  />
</svelte:head>

<div class="page">
  <header class="topbar-shell">
  <div class="topbar">
    <div class="brand">
      <span class="reflective-ray" aria-hidden="true">
        <span class="ray ray-red"></span>
        <span class="ray ray-navy"></span>
        <span class="ray ray-blue"></span>
      </span>
      <span class="lockup">
        <span class="wordmark">
          <span class="wm-glass">GLASS</span><span class="wm-doctor">DOCTOR</span><span class="wm-rx">Rx</span><span class="wm-reg">®</span>
        </span>
        <span class="brand-sub">a Neighborly company</span>
      </span>
    </div>
    <div class="topbar-right">
      <a class="call-link" href="tel:+12065082444">
        <span class="call-dot" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </span>
        (206) 508-2444
      </a>
      <span class="status" data-open={openNow}>
        <span class="status-dot" aria-hidden="true"></span>
        {openNow ? 'Open now' : 'After hours — emergencies welcome'}
      </span>
    </div>
  </div>
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">We Fix Your Panes!®</p>
      <h1>Tell us what you need.<br /><span class="muted">We’ll route it the right way.</span></h1>
      <p class="lede">
        A few quick questions are all it takes. Emergencies are dispatched the same day; everything
        else starts with a consultation and a written quote.
      </p>
      <ul class="trust">
        <li>
          <span class="trust-dot" aria-hidden="true"></span>
          <span><strong>2-hour</strong> priority response</span>
        </li>
        <li>
          <span class="trust-dot" aria-hidden="true"></span>
          <span>Insured, locally operated</span>
        </li>
        <li>
          <span class="trust-dot" aria-hidden="true"></span>
          <span>Upfront pricing — see any visit charge before you book</span>
        </li>
      </ul>
    </section>

    <div class="content">
      <section class="panel">
        <IntakeWizard />
      </section>
      <div class="rail-slot">
        <SummaryRail />
      </div>
    </div>

    <footer class="foot">
      <p>Business hours: {hoursDescription}</p>
      <p class="emergency-line">
        Active life-safety emergency? Call 911 first, then submit the form.
      </p>
    </footer>
  </main>
</div>

<style>
  .page {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* Sticky frost band: the phone number and open/closed status stay one
     glance away no matter how far the form scrolls. */
  .topbar-shell {
    position: sticky;
    top: 0;
    z-index: 20;
    background: var(--color-surface-frost);
    backdrop-filter: blur(14px) saturate(160%);
    -webkit-backdrop-filter: blur(14px) saturate(160%);
    border-bottom: 1px solid var(--color-divider);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.95rem 1.2rem;
    max-width: 760px;
    margin: 0 auto;
    width: 100%;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }

  /* Reflective Ray brand artifact — angled tri-color stripes from the logo.
     Angle is fixed; color order may vary per the guidelines. */
  .reflective-ray {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    height: 30px;
  }

  .ray {
    display: block;
    width: 7px;
    height: 100%;
    transform: skewX(-18deg);
    border-radius: 1px;
  }

  .ray-red {
    background: var(--color-red);
  }

  .ray-navy {
    background: var(--color-primary);
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
    font-size: 1.32rem;
    letter-spacing: -0.02em;
    display: inline-flex;
    align-items: baseline;
  }

  .wm-glass {
    color: var(--color-primary);
  }

  .wm-doctor {
    color: var(--color-red);
    margin-left: 0.12em;
  }

  .wm-rx {
    color: var(--color-red);
    font-size: 0.62em;
    align-self: flex-end;
    transform: translateY(0.12em);
    margin-left: 0.02em;
  }

  .wm-reg {
    color: var(--color-red);
    font-size: 0.42em;
    align-self: flex-start;
    transform: translateY(0.15em);
  }

  .brand-sub {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.01em;
    color: var(--color-muted);
    margin-top: 2px;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 0.5rem 0.8rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .call-link {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--color-primary);
    text-decoration: none;
    white-space: nowrap;
  }

  .call-link:hover {
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  .call-dot {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-muted);
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: var(--color-surface-frost);
    backdrop-filter: blur(6px);
    border: 1px solid var(--color-border);
  }

  .status[data-open='true'] {
    color: var(--color-accent);
    background: var(--color-accent-bg);
    border-color: rgba(96, 175, 230, 0.45);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-muted);
  }

  .status[data-open='true'] .status-dot {
    background: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(96, 175, 230, 0.28);
  }

  main {
    max-width: 700px;
    width: 100%;
    margin: 0 auto;
    padding: 1rem 1.2rem 3rem;
    flex: 1;
  }

  /* Desktop: the live summary rail rides alongside the form; below 1100px the
     rail disappears and the layout is the single centered column. */
  .rail-slot {
    display: none;
  }

  @media (min-width: 1100px) {
    main {
      max-width: 1040px;
    }

    .content {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 300px;
      gap: 1.4rem;
      align-items: start;
    }

    .rail-slot {
      display: block;
      position: sticky;
      top: 84px; /* clears the sticky topbar */
    }
  }

  .hero {
    margin: 1rem 0 1.7rem;
  }

  .eyebrow {
    margin: 0 0 0.5rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--color-primary);
  }

  h1 {
    margin: 0 0 0.7rem;
    font-size: 2.3rem;
    line-height: 1.1;
    letter-spacing: -0.025em;
    font-weight: 700;
    color: var(--color-text-strong);
  }

  h1 .muted {
    color: var(--color-muted);
    font-weight: 600;
  }

  .lede {
    margin: 0 0 1.2rem;
    color: var(--color-muted);
    font-size: 1.04rem;
    max-width: 540px;
  }

  .trust {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.1rem;
    font-size: 0.88rem;
    color: var(--color-muted);
  }

  .trust li {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .trust strong {
    color: var(--color-text-strong);
  }

  .trust-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
    flex-shrink: 0;
  }

  .panel {
    background: var(--color-surface-frost);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-radius: var(--radius-xl);
    padding: 1.5rem;
    box-shadow: var(--shadow-glass);
    border: 1px solid rgba(255, 255, 255, 0.6);
    outline: 1px solid var(--color-border);
    outline-offset: -1px;
  }

  .foot {
    margin-top: 1.5rem;
    color: var(--color-muted);
    font-size: 0.85rem;
    text-align: center;
  }

  .foot p {
    margin: 0.15rem 0;
  }

  .emergency-line {
    color: var(--color-emergency);
    font-weight: 600;
  }

  @media (max-width: 520px) {
    main {
      padding: 0.5rem 0.85rem 2.5rem;
    }

    h1 {
      font-size: 1.85rem;
    }

    .panel {
      padding: 1.1rem;
      border-radius: var(--radius-lg);
    }

    .topbar {
      padding: 0.75rem 0.85rem;
    }

    .status {
      font-size: 0.72rem;
    }
  }
</style>
