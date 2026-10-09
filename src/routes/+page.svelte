<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import BrandPanel from '$lib/components/BrandPanel.svelte';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';
  import { onMount } from 'svelte';
  import { attribution, readAttribution } from '$lib/attribution';

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();

  // Ad links straight to the site carry their UTM tags / click ids onto the booking too.
  onMount(() => attribution.set(readAttribution(new URLSearchParams(window.location.search))));
</script>

<svelte:head>
  <title>Glass Doctor — Request Service</title>
  <meta
    name="description"
    content="Glass Doctor — request glass, window, door, or hardware service. Urgent issues are dispatched the same day."
  />
</svelte:head>

<div class="page">
  <div class="band">
    <BrandPanel {openNow} />
  </div>

  <main>
    <section class="panel">
      <IntakeWizard />
    </section>

    <footer class="foot">
      <ul class="trust">
        <li>You see any visit charge before you submit</li>
        <li>A real person confirms your appointment</li>
        <li>Emergencies are dispatched the same day</li>
      </ul>
      <p>Business hours: {hoursDescription}</p>
      <p class="emergency-line">
        Active life-safety emergency? Call 911 first, then submit the form.
      </p>
    </footer>
  </main>
</div>

<style>
  /* One thing at a time: a slim sticky brand band, then a single centered
     column where the current question is the headline. Same shape at every
     width — desktop just gets more air and a card-less form. */
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

    /* The form sits straight on the page — one question needs no frame. */
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
