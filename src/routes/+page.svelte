<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import { describeBusinessHours } from '$lib/utils/businessHours';
  import { isBusinessHours } from '$lib/utils/businessHours';

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();
</script>

<svelte:head>
  <title>Request Glass Service</title>
  <meta
    name="description"
    content="Request glass, window, door, or hardware service. Urgent issues are routed immediately."
  />
</svelte:head>

<main>
  <header class="hero">
    <div class="brand">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M3 12h18M12 3v18" />
        </svg>
      </span>
      <span class="brand-name">Glass Service</span>
      <span class="status" data-open={openNow}>
        <span class="status-dot" aria-hidden="true"></span>
        {openNow ? 'Open now' : 'After hours — emergencies welcome'}
      </span>
    </div>
    <p class="eyebrow">Service request</p>
    <h1>What kind of glass service do you need?</h1>
    <p class="lede">
      Answer a few quick questions so we can route your request correctly. Urgent issues are
      dispatched the same day.
    </p>
    <ul class="trust">
      <li>
        <span aria-hidden="true">⏱</span>
        2-hour priority response
      </li>
      <li>
        <span aria-hidden="true">🛡</span>
        Insured and locally operated
      </li>
      <li>
        <span aria-hidden="true">💬</span>
        Free quotes on most consults
      </li>
    </ul>
  </header>

  <div class="panel">
    <IntakeWizard />
  </div>

  <footer class="foot">
    <p>Business hours: {hoursDescription}</p>
    <p class="emergency-line">
      Active life-safety emergency? Call 911 first, then submit the form.
    </p>
  </footer>
</main>

<style>
  main {
    max-width: 680px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  .hero {
    margin-bottom: 1.25rem;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-bottom: 1.4rem;
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    background: var(--color-primary);
    color: #fff;
    border-radius: 9px;
  }

  .brand-name {
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .status {
    margin-left: auto;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-muted);
    padding: 0.25rem 0.55rem;
    border-radius: 999px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
  }

  .status[data-open='true'] {
    color: var(--color-accent);
    background: var(--color-accent-bg);
    border-color: rgba(17, 163, 122, 0.25);
  }

  .status-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--color-muted);
  }

  .status[data-open='true'] .status-dot {
    background: var(--color-accent);
    box-shadow: 0 0 0 3px rgba(17, 163, 122, 0.18);
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.74rem;
    font-weight: 700;
    color: var(--color-primary);
  }

  h1 {
    margin: 0.3rem 0 0.5rem;
    font-size: 2rem;
    line-height: 1.15;
    letter-spacing: -0.01em;
  }

  .lede {
    margin: 0 0 1.1rem;
    color: var(--color-muted);
    font-size: 1.02rem;
    max-width: 520px;
  }

  .trust {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    font-size: 0.88rem;
    color: var(--color-muted);
  }

  .trust li {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 1.35rem;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--color-border);
  }

  .foot {
    margin-top: 1.25rem;
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
      padding: 1rem 0.75rem 2.5rem;
    }
    h1 {
      font-size: 1.6rem;
    }
    .panel {
      padding: 1.05rem;
    }
    .status {
      font-size: 0.72rem;
    }
  }
</style>
