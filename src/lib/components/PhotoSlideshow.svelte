<script lang="ts">
  /**
   * Crossfading Glass Doctor brand photos, opening with a before/after pair
   * (Jim, 2026-10-16). Fills its parent (position the parent relatively and
   * give it a size). Used behind the phone hero and in the desktop summary
   * rail. They're Neighborly brand assets, not Seattle jobs, so nothing here
   * labels them as our work.
   *
   * Only the first photo loads with the page; the rest follow after a beat so
   * the first screen never waits on them. Reduced motion: the first photo,
   * still.
   */
  import { onDestroy, onMount } from 'svelte';

  /** Small "Before" / "After" tag in the corner. */
  export let showTag = true;
  /** Use the 1920px exports (static/hero/*-1920.jpg) on wide screens;
   *  phones and tablets keep the 1100px versions. */
  export let large = false;
  let useLarge = false;

  const SLIDES = [
    { src: '/hero/before-broken-pane.jpg', tag: 'Before' },
    { src: '/hero/after-fixed-pane.jpg', tag: 'After' },
    { src: '/hero/tech-window.jpg', tag: '' },
    { src: '/hero/custom-glass.jpg', tag: '' },
    { src: '/hero/patio.jpg', tag: '' },
    { src: '/hero/glass-table.jpg', tag: '' }
  ];
  const SLIDE_MS = 5000;

  let slide = 0;
  let loadedCount = 1;
  let startTimer: ReturnType<typeof setTimeout> | null = null;
  let cycle: ReturnType<typeof setInterval> | null = null;

  onMount(() => {
    useLarge = large && window.matchMedia('(min-width: 960px)').matches;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    startTimer = setTimeout(() => {
      loadedCount = SLIDES.length;
      cycle = setInterval(() => (slide = (slide + 1) % SLIDES.length), SLIDE_MS);
    }, 1500);
  });

  onDestroy(() => {
    if (startTimer) clearTimeout(startTimer);
    if (cycle) clearInterval(cycle);
  });
</script>

<div class="slides" aria-hidden="true">
  {#each SLIDES.slice(0, loadedCount) as s, i (s.src)}
    <img src={useLarge ? s.src.replace('.jpg', '-1920.jpg') : s.src} alt="" class:on={i === slide} decoding="async" fetchpriority={i === 0 ? 'high' : 'low'} />
  {/each}
  {#if showTag && SLIDES[slide].tag}<span class="tag">{SLIDES[slide].tag}</span>{/if}
</div>

<style>
  .slides {
    position: absolute;
    inset: 0;
    overflow: hidden;
  }

  img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transform: scale(1.04);
    transition: opacity 1.2s ease, transform 6s ease-out;
  }

  img.on {
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

  @media (prefers-reduced-motion: reduce) {
    img {
      transition: none;
      transform: none;
    }
  }
</style>
