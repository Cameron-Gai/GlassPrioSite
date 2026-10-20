<script lang="ts">
  /**
   * The page frame around the booking form, shared by the main site (/) and
   * the ad page (/book) — design picked 2026-10-16: on phones a headline hero
   * with the form card lifted over it (first screen only); on computers the
   * form card beside a "Your request" summary rail.
   *
   * Computers also get a full-width photo band (2026-10-20, after looking at
   * Glass Doctor corporate, Mr. Rooter, Renewal by Andersen and Pella, which
   * all lead with a wide photo): headline over the brand-photo slideshow on
   * the first screen, a slimmer photo strip on later steps, with the cards
   * lifted over its bottom edge. A horizontal band, not the split side
   * panel Cameron turned down.
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

  <section class="desk-band" class:tall={heroShown} aria-label="Glass Doctor">
    <PhotoSlideshow large showTag={false} />
    <div class="desk-shade" aria-hidden="true"></div>
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
  </section>

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

  .desk-band {
    display: none;
  }

  @media (min-width: 960px) {
    .desk-band {
      display: block;
      position: relative;
      height: 11rem;
      overflow: hidden;
      background: var(--color-primary);
      transition: height 0.4s ease;
    }

    .desk-band.tall {
      height: 21rem;
    }

    /* Darker on the left where the headline sits, lighter to the right so
       the photo shows. */
    .desk-shade {
      position: absolute;
      inset: 0;
      background:
        linear-gradient(90deg, rgba(6, 3, 141, 0.9) 0%, rgba(6, 3, 141, 0.55) 45%, rgba(6, 3, 141, 0.2) 100%),
        linear-gradient(180deg, transparent 60%, rgba(6, 3, 141, 0.35) 100%);
    }

    .desk-copy {
      position: relative;
      max-width: 1080px;
      margin: 0 auto;
      padding: 2.4rem 1.5rem 0;
      display: grid;
      gap: 0.6rem;
      color: #fff;
    }

    .desk-headline {
      margin: 0;
      font-size: 2.6rem;
      font-weight: 900;
      line-height: 1.05;
      letter-spacing: -0.025em;
      max-width: 18ch;
      text-wrap: balance;
      text-shadow: 0 2px 14px rgba(0, 0, 0, 0.25);
    }

    .desk-lead {
      margin: 0;
      font-size: 1.05rem;
      opacity: 0.92;
    }

    .desk-review {
      max-width: 46ch;
      color: #fff;
      text-decoration: none;
      font-size: 0.92rem;
    }

    .desk-review span {
      display: block;
      opacity: 0.8;
      font-size: 0.8rem;
      margin-top: 0.2rem;
    }

    /* The cards ride up over the band's bottom edge. */
    main {
      padding: 0 1.5rem 3rem;
      margin-top: -4.5rem;
      position: relative;
      z-index: 2;
    }

    main.lifted {
      margin-top: -6rem;
    }

    main.lifted .panel {
      box-shadow: 0 20px 44px rgba(6, 3, 141, 0.16);
    }

    .layout {
      grid-template-columns: minmax(0, 1fr) 300px;
      align-items: start;
    }

    .panel {
      padding: 1.75rem 2rem;
      border-radius: var(--radius-xl);
      box-shadow: 0 16px 36px rgba(6, 3, 141, 0.12);
    }

    .foot {
      margin-top: 2.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .desk-band {
      transition: none;
    }
  }
</style>
