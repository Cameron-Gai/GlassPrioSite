<script lang="ts">
  /**
   * The page frame around the booking form, shared by the main site (/) and
   * the ad page (/book) — design picked 2026-10-16: on phones a headline hero
   * with the form card lifted over it (first screen only); on computers the
   * form card beside a "Your request" summary rail, no hero.
   */
  import BrandPanel from './BrandPanel.svelte';
  import MobileHero from './MobileHero.svelte';
  import SummaryRail from './SummaryRail.svelte';
  import { intakeStore } from '$lib/stores/intakeStore';

  export let openNow: boolean;
  export let hoursDescription: string;

  $: heroShown = $intakeStore.step === 'triage' && $intakeStore.triageHistory.length === 0;
</script>

<div class="page">
  <div class="band">
    <BrandPanel {openNow} showPromise={false} deskSummary={false} />
  </div>

  <MobileHero />

  <main class:lifted={heroShown}>
    <div class="layout">
      <section class="panel">
        <slot />
      </section>
      <SummaryRail />
    </div>

    <footer class="foot">
      <p>Business hours: {hoursDescription}</p>
      <p class="emergency-line">Active life-safety emergency? Call 911 first, then submit the form.</p>
    </footer>
  </main>
</div>

<style>
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
    max-width: 1080px;
    margin: 0 auto;
    padding: 1rem 0.85rem 2.5rem;
  }

  .layout {
    display: grid;
    gap: 1.5rem;
    grid-template-columns: minmax(0, 1fr);
  }

  .panel {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: 1.1rem;
    box-shadow: var(--shadow-md);
    border: 1px solid var(--color-border);
    min-width: 0;
  }

  /* Phones, first screen: the card rides up over the hero. */
  @media (max-width: 959px) {
    main.lifted {
      padding-top: 0;
    }

    main.lifted .panel {
      position: relative;
      z-index: 2;
      margin-top: -2.8rem;
      border: 0;
      box-shadow: 0 16px 40px rgba(6, 3, 141, 0.16);
    }
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
    }
  }

  @media (min-width: 960px) {
    main {
      padding: 2rem 1.5rem 3rem;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr) 300px;
      align-items: start;
    }

    .panel {
      padding: 1.75rem 2rem;
      border-radius: var(--radius-xl);
      box-shadow: 0 12px 30px rgba(6, 3, 141, 0.08);
    }

    .foot {
      margin-top: 2.5rem;
    }
  }
</style>
