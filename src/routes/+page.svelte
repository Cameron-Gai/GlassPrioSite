<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import { describeBusinessHours } from '$lib/utils/businessHours';

  const hoursDescription = describeBusinessHours();
</script>

<svelte:head>
  <title>Glass Service Request</title>
  <meta
    name="description"
    content="Request glass, window, door, or hardware service. We'll route urgent issues immediately."
  />
</svelte:head>

<main>
  <header class="hero">
    <p class="eyebrow">Customer service request</p>
    <h1>What kind of glass service do you need?</h1>
    <p class="lede">
      Answer a few quick questions so we can route your request correctly.
    </p>
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
    max-width: 640px;
    margin: 0 auto;
    padding: 1.5rem 1rem 3rem;
  }

  .hero {
    text-align: left;
    margin-bottom: 1.25rem;
  }

  .eyebrow {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--color-primary);
  }

  h1 {
    margin: 0.3rem 0 0.5rem;
    font-size: 1.85rem;
    line-height: 1.2;
  }

  .lede {
    margin: 0;
    color: var(--color-muted);
    font-size: 1rem;
  }

  .panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 1.25rem;
    box-shadow: var(--shadow-md);
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
      font-size: 1.5rem;
    }
    .panel {
      padding: 1rem;
    }
  }
</style>
