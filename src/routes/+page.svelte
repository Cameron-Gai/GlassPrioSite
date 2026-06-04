<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();
</script>

<svelte:head>
  <title>Request Glass Service</title>
  <meta
    name="description"
    content="Request glass, window, door, or hardware service. Urgent issues are dispatched the same day."
  />
</svelte:head>

<div class="page">
  <header class="topbar">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" opacity="0.55" />
          <path d="M4 13h7v7H4z" opacity="0.7" />
          <path d="M13 13h7v7h-7z" opacity="0.4" />
        </svg>
      </span>
      <span class="brand-name">Glass Service</span>
    </div>
    <span class="status" data-open={openNow}>
      <span class="status-dot" aria-hidden="true"></span>
      {openNow ? 'Open now' : 'After hours — emergencies welcome'}
    </span>
  </header>

  <main>
    <section class="hero">
      <p class="eyebrow">Service request</p>
      <h1>Tell us what you need.<br /><span class="muted">We’ll route it the right way.</span></h1>
      <p class="lede">
        A few quick questions are all it takes. Emergencies are dispatched the same day; everything
        else heads to a free consultation.
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
          <span>Free quotes on most consults</span>
        </li>
      </ul>
    </section>

    <section class="panel">
      <IntakeWizard />
    </section>

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

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    background: var(--color-primary-gradient);
    color: #fff;
    border-radius: 11px;
    box-shadow: var(--shadow-sm);
  }

  .brand-name {
    font-weight: 700;
    letter-spacing: -0.015em;
    font-size: 1.02rem;
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
    border-color: rgba(15, 169, 124, 0.28);
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-muted);
  }

  .status[data-open='true'] .status-dot {
    background: var(--color-accent);
    box-shadow: 0 0 0 4px rgba(15, 169, 124, 0.18);
  }

  main {
    max-width: 700px;
    width: 100%;
    margin: 0 auto;
    padding: 1rem 1.2rem 3rem;
    flex: 1;
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
