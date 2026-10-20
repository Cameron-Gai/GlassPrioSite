<script lang="ts">
  /**
   * Phones only (<960px), first screen only: the headline the form card sits
   * over (design picked 2026-10-16). Once the customer answers anything it
   * gives way to the slim brand band, so later steps start at the question.
   *
   * Behind the headline: the brand-photo slideshow (PhotoSlideshow, shared
   * with the desktop summary rail). In front:
   * curated real Google reviews that link to Google (src/lib/data/
   * heroReviews.ts), shown only once that list has entries; until then the
   * three trust points take their place. Never placeholder reviews.
   */
  import { onDestroy, onMount } from 'svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { HERO_REVIEWS } from '$lib/data/heroReviews';
  import PhotoSlideshow from './PhotoSlideshow.svelte';

  const REVIEW_MS = 7000;

  let review = 0;
  let reviewTimer: ReturnType<typeof setInterval> | null = null;

  $: show = $intakeStore.step === 'triage' && $intakeStore.triageHistory.length === 0;

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (HERO_REVIEWS.length > 1) {
      reviewTimer = setInterval(() => (review = (review + 1) % HERO_REVIEWS.length), REVIEW_MS);
    }
  });

  onDestroy(() => {
    if (reviewTimer) clearInterval(reviewTimer);
  });
</script>

{#if show}
  <section class="hero" aria-label="Glass Doctor">
    <PhotoSlideshow />
    <div class="shade" aria-hidden="true"></div>

    <div class="content">
      <p class="headline">Glass fixed right. Booked in two minutes.</p>
      <p class="lead">Window, storefront, shower and door glass across Seattle, Lynnwood and Tacoma.</p>

      {#if HERO_REVIEWS.length}
        {@const r = HERO_REVIEWS[review % HERO_REVIEWS.length]}
        {#key review}
          <a class="review" href={r.url} target="_blank" rel="noopener">
            <span class="stars" aria-label="{r.rating} out of 5 stars">{'★'.repeat(Math.round(r.rating))}</span>
            <span class="quote">“{r.quote}”</span>
            <span class="who">{r.author} · read it on Google ↗</span>
          </a>
        {/key}
      {:else}
        <ul class="proof">
          <li><b>Upfront</b>Visit charge shown before you submit</li>
          <li><b>Real people</b>We confirm every appointment</li>
          <li><b>Same day</b>Emergency dispatch</li>
        </ul>
      {/if}
    </div>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    overflow: hidden;
    color: #fff;
    min-height: 19rem;
    display: grid;
    background: var(--color-primary);
  }

  /* Brand-blue wash so white type stays readable over any photo. */
  .shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      rgba(6, 3, 141, 0.82) 0%,
      rgba(6, 3, 141, 0.5) 34%,
      rgba(6, 3, 141, 0.22) 62%,
      rgba(6, 3, 141, 0.7) 100%
    );
  }

  .content {
    position: relative;
    display: grid;
    gap: 0.7rem;
    align-content: start;
    padding: 1.3rem 1.1rem 4rem;
  }

  .headline {
    margin: 0;
    font-size: clamp(1.75rem, 8vw, 2.3rem);
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.025em;
    max-width: 15ch;
    text-wrap: balance;
    text-shadow: 0 2px 12px rgba(0, 0, 0, 0.25);
  }

  .lead {
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.92;
    max-width: 36ch;
  }

  .review {
    display: grid;
    gap: 0.3rem;
    margin-top: 0.2rem;
    padding: 0.75rem 0.85rem;
    border-radius: var(--radius-md);
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.3);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    color: #fff;
    text-decoration: none;
    animation: review-in 0.5s ease both;
  }

  .stars {
    color: #ffd166;
    letter-spacing: 2px;
    font-size: 0.9rem;
  }

  .quote {
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .who {
    font-size: 0.74rem;
    opacity: 0.85;
    font-weight: 600;
  }

  @keyframes review-in {
    from {
      opacity: 0;
      transform: translateX(14px);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }

  .proof {
    list-style: none;
    margin: 0.2rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.45rem;
  }

  .proof li {
    background: rgba(255, 255, 255, 0.14);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    font-size: 0.72rem;
    line-height: 1.3;
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .proof b {
    display: block;
    font-size: 0.8rem;
  }

  @media (prefers-reduced-motion: reduce) {
    .review {
      animation: none;
    }
  }

  @media (min-width: 960px) {
    .hero {
      display: none;
    }
  }
</style>
