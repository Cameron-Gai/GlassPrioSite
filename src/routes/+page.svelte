<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import BrandPanel from '$lib/components/BrandPanel.svelte';
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
  <div class="side">
    <BrandPanel {openNow} {hoursDescription} />
  </div>

  <main>
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
  /* Split layout: the brand panel is a full-height sticky column beside the
     form. Below 960px it folds into a slim sticky band above it. */
  .page {
    min-height: 100vh;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
  }

  .side {
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
  }

  .foot p {
    margin: 0.15rem 0;
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
    .page {
      display: grid;
      grid-template-columns: minmax(340px, 38%) minmax(0, 1fr);
      align-items: start;
    }

    .side {
      height: 100vh;
      height: 100dvh;
    }

    main {
      max-width: 720px;
      padding: 3rem 2.5rem 3rem;
    }

    /* The form sits straight on the pane here — the split already frames it. */
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
      text-align: left;
      margin-top: 2.5rem;
    }
  }
</style>
