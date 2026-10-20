<script lang="ts">
  /**
   * Phones only (<960px), first screen only: the headline the form card sits
   * over (design picked 2026-10-16). Once the customer answers anything it
   * gives way to the slim brand band, so later steps start at the question.
   *
   * Behind the headline: a slideshow of Glass Doctor brand photos, opening
   * with a before/after pair (Jim, 2026-10-16). They're Neighborly brand
   * assets, not Seattle jobs, so nothing labels them as our work. In front:
   * curated real Google reviews that link to Google (src/lib/data/
   * heroReviews.ts), shown only once that list has entries; until then the
   * three trust points take their place. Never placeholder reviews.
   */
  import { onDestroy, onMount } from 'svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { HERO_REVIEWS } from '$lib/data/heroReviews';

  const SLIDES = [
    { src: '/hero/before-broken-pane.jpg', tag: 'Before' },
    { src: '/hero/after-fixed-pane.jpg', tag: 'After' },
    { src: '/hero/tech-window.jpg', tag: '' },
    { src: '/hero/custom-glass.jpg', tag: '' },
    { src: '/hero/patio.jpg', tag: '' },
    { src: '/hero/glass-table.jpg', tag: '' }
  ];
  const SLIDE_MS = 5000;
  const REVIEW_MS = 7000;

  let slide = 0;
  let review = 0;
  // Only the first photo loads with the page; the rest follow once it's up,
  // so the first screen isn't waiting on half a megabyte of images.
  let loadedCount = 1;
  let timers: ReturnType<typeof setInterval>[] = [];

  $: show = $intakeStore.step === 'triage' && $intakeStore.triageHistory.length === 0;

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = setTimeout(() => {
      loadedCount = SLIDES.length;
      timers.push(setInterval(() => (slide = (slide + 1) % SLIDES.length), SLIDE_MS));
    }, 1500);
    timers.push(start as unknown as ReturnType<typeof setInterval>);
    if (HERO_REVIEWS.length > 1) {
      timers.push(setInterval(() => (review = (review + 1) % HERO_REVIEWS.length), REVIEW_MS));
    }
  });

  onDestroy(() => timers.forEach((t) => clearInterval(t)));
</script>

{#if show}
  <section class="hero" aria-label="Glass Doctor">
    <div class="slides" aria-hidden="true">
      {#each SLIDES.slice(0, loadedCount) as s, i (s.src)}
        <img
          src={s.src}
          alt=""
          class:on={i === slide}
          decoding="async"
          fetchpriority={i === 0 ? 'high' : 'low'}
        />
      {/each}
      {#if SLIDES[slide].tag}<span class="tag">{SLIDES[slide].tag}</span>{/if}
    </div>
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

  .slides,
  .shade {
    position: absolute;
    inset: 0;
  }

  .slides img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transform: scale(1.04);
    transition: opacity 1.2s ease, transform 6s ease-out;
  }

  .slides img.on {
    opacity: 1;
    transform: scale(1);
  }

  .tag {
    position: absolute;
    top: 0.8rem;
    right: 0.8rem;
    z-index: 1;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: var(--color-text-strong);
  }

  /* Brand-blue wash so white type stays readable over any photo. */
  .shade {
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
    .slides img {
      transition: none;
      transform: none;
    }

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
