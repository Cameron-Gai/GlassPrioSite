<script lang="ts">
  /**
   * The page frame around the booking form, shared by the main site (/) and
   * the ad page (/book) — design picked 2026-10-16: on phones a headline hero
   * with the form card lifted over it (first screen only); on computers the
   * form card beside a "Your request" summary rail.
   *
   * Computers (2026-10-20, after looking at Glass Doctor corporate, Mr.
   * Rooter, Renewal by Andersen and Pella, which all lead with photography):
   * the brand-photo slideshow fills the whole window behind a blue wash, so a
   * wide monitor shows photos edge to edge instead of empty white margins.
   * The headline sits over it on the first screen; the cards float on top.
   * Not the split side panel Cameron turned down.
   */
  import PhotoSlideshow from './PhotoSlideshow.svelte';
  import { HERO_REVIEWS } from '$lib/data/heroReviews';
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

  <!-- Computers only: photos behind the whole page. -->
  <div class="desk-backdrop" aria-hidden="true">
    <PhotoSlideshow large showTag={false} />
    <div class="desk-shade"></div>
  </div>

  <main class:lifted={heroShown}>
    {#if heroShown}
      <div class="desk-copy">
        <p class="desk-headline">Glass fixed right. Booked in two minutes.</p>
        <p class="desk-lead">Window, storefront, shower and door glass across Seattle, Lynnwood and Tacoma.</p>
        {#if HERO_REVIEWS.length}
          <a class="desk-review" href={HERO_REVIEWS[0].url} target="_blank" rel="noopener">
            “{HERO_REVIEWS[0].quote}” <span>{HERO_REVIEWS[0].author} · read it on Google ↗</span>
          </a>
        {/if}
      </div>
    {/if}

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
    position: relative;
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
    position: relative;
    z-index: 1;
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

  .desk-backdrop,
  .desk-copy {
    display: none;
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
    .desk-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 0;
      background: var(--color-primary);
    }

    /* Strong enough that white type and the cards read over any photo;
       lighter to the right so the photos still show. */
    .desk-shade {
      position: absolute;
      inset: 0;
      background: linear-gradient(
        100deg,
        rgba(6, 3, 141, 0.9) 0%,
        rgba(6, 3, 141, 0.72) 45%,
        rgba(6, 3, 141, 0.5) 100%
      );
    }

    main {
      max-width: 77.5rem;
      padding: 2.2rem 1.5rem 3rem;
    }

    .desk-copy {
      display: grid;
      gap: 0.55rem;
      padding: 0.6rem 0 2rem;
      color: #fff;
    }

    .desk-headline {
      margin: 0;
      font-size: clamp(2.3rem, 3.2vw, 3.1rem);
      font-weight: 900;
      line-height: 1.05;
      letter-spacing: -0.025em;
      max-width: 20ch;
      text-wrap: balance;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);
    }

    .desk-lead {
      margin: 0;
      font-size: 1.1rem;
      opacity: 0.92;
    }

    .desk-review {
      max-width: 50ch;
      color: #fff;
      text-decoration: none;
      font-size: 0.95rem;
    }

    .desk-review span {
      display: block;
      opacity: 0.8;
      font-size: 0.8rem;
      margin-top: 0.2rem;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr) 20rem;
      gap: 1.75rem;
      align-items: start;
    }

    .panel {
      padding: 1.9rem 2.2rem;
      border: 0;
      border-radius: var(--radius-xl);
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
    }

    .foot {
      margin-top: 2.5rem;
      color: rgba(255, 255, 255, 0.85);
    }

    .emergency-line {
      color: #ffc9d1;
    }
  }

  @media (min-width: 1440px) {
    main {
      max-width: 85rem;
    }

    .layout {
      grid-template-columns: minmax(0, 1fr) 22.5rem;
    }
  }
</style>
