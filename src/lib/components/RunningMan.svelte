<script lang="ts">
  /**
   * The Glass Doctor running man dashes across the screen when a visitor
   * lands on the booking site (Jim, 2026-10-16: franchisees love him, and
   * corporate retiring him "was one of the worst mistakes they ever made").
   * On both / and /book since 2026-10-20 (the two pages match). Image from
   * Jim: static/running-man.png.
   *
   * Kept out of the way on purpose: about 6 seconds, once per browser
   * session, any tap skips it, and it never runs with reduced motion. It
   * renders only after mount, so it never holds up the page or the form.
   */
  import { onMount } from 'svelte';

  const SEEN_KEY = 'gd-running-man-seen';
  const RUN_MS = 6000;

  let running = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  function stop() {
    running = false;
    if (timer) clearTimeout(timer);
  }

  onMount(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) return;
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* storage blocked: still run once for this page view */
    }
    running = true;
    timer = setTimeout(stop, RUN_MS);
    return stop;
  });
</script>

{#if running}
  <button type="button" class="runway" aria-label="Skip intro" on:click={stop}>
    <span class="message">
      <span class="message-brand">Glass Doctor</span>
      <span class="message-line">We fix your panes.</span>
    </span>
    <span class="streak streak-red"></span>
    <span class="streak streak-blue"></span>
    <!-- One drawn pose, so the run is faked: the wrapper crosses the screen
         while the image strides (bounce, lean, squash on each footfall), with
         speed lines and dust puffs trailing. A true leg cycle needs 4–6 drawn
         frames of him; swap them in here if corporate or a designer has them. -->
    <span class="runner">
      <span class="speed speed-1"></span>
      <span class="speed speed-2"></span>
      <span class="speed speed-3"></span>
      <span class="puff puff-1"></span>
      <span class="puff puff-2"></span>
      <img class="man" src="/running-man.png" alt="" width="220" height="199" />
    </span>
  </button>
{/if}

<style>
  .runway {
    position: fixed;
    inset: 0;
    z-index: 100;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
    overflow: hidden;
    background: linear-gradient(135deg, var(--color-primary) 0%, #1a3fb8 100%);
    animation: runway-out 6s ease forwards;
  }

  /* The reassuring line above him (Cameron, 2026-10-20). */
  .message {
    position: absolute;
    left: 0;
    right: 0;
    top: 18%;
    display: grid;
    gap: 0.35rem;
    justify-items: center;
    text-align: center;
    color: #fff;
    padding: 0 1rem;
    animation: message-in 6s ease forwards;
  }

  .message-brand {
    font-size: clamp(0.85rem, 2.4vw, 1.1rem);
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    opacity: 0.85;
  }

  .message-line {
    font-size: clamp(2rem, 7vw, 3.6rem);
    font-weight: 900;
    line-height: 1.05;
    letter-spacing: -0.02em;
    text-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  }

  @keyframes message-in {
    0% {
      opacity: 0;
      transform: translateY(12px);
    }
    12%,
    100% {
      opacity: 1;
      transform: none;
    }
  }

  .runner {
    position: absolute;
    top: 50%;
    left: 0;
    width: min(46vw, 220px);
    animation: run 6s cubic-bezier(0.45, 0.05, 0.4, 1) forwards;
  }

  .man {
    display: block;
    width: 100%;
    height: auto;
    transform-origin: 50% 95%;
    animation: stride 0.52s linear infinite;
  }

  /* Speed lines behind him, flickering like an old cartoon. */
  .speed {
    position: absolute;
    right: 88%;
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.85);
    animation: flicker 0.18s steps(2) infinite;
  }

  .speed-1 {
    top: 30%;
    width: 38%;
  }

  .speed-2 {
    top: 46%;
    width: 56%;
    animation-delay: 0.06s;
  }

  .speed-3 {
    top: 62%;
    width: 30%;
    animation-delay: 0.12s;
  }

  /* Dust kicked up at each footfall. */
  .puff {
    position: absolute;
    bottom: 2%;
    left: 22%;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.7);
    animation: puff 0.52s ease-out infinite;
  }

  .puff-2 {
    left: 34%;
    animation-delay: 0.26s;
  }

  @keyframes stride {
    0% {
      transform: translateY(0) rotate(-2deg) scale(1.03, 0.96);
    }
    25% {
      transform: translateY(-12px) rotate(3deg) scale(0.98, 1.03);
    }
    50% {
      transform: translateY(0) rotate(-2deg) scale(1.03, 0.96);
    }
    75% {
      transform: translateY(-10px) rotate(2deg) scale(0.98, 1.03);
    }
    100% {
      transform: translateY(0) rotate(-2deg) scale(1.03, 0.96);
    }
  }

  @keyframes flicker {
    0% {
      opacity: 1;
      transform: translateX(0);
    }
    100% {
      opacity: 0.45;
      transform: translateX(-10px);
    }
  }

  @keyframes puff {
    from {
      opacity: 0.8;
      transform: translate(0, 0) scale(0.4);
    }
    to {
      opacity: 0;
      transform: translate(-40px, -8px) scale(1.3);
    }
  }

  /* The red-white-blue "reflective ray" from the logo, trailing behind him. */
  .streak {
    position: absolute;
    left: 0;
    height: 14px;
    width: 120vw;
    transform-origin: left center;
    animation: streak 6s cubic-bezier(0.45, 0.05, 0.4, 1) forwards;
  }

  .streak-red {
    top: calc(50% + 40px);
    background: linear-gradient(90deg, transparent, var(--color-red));
  }

  .streak-blue {
    top: calc(50% + 62px);
    background: linear-gradient(90deg, transparent, var(--color-light-blue));
    animation-delay: 0.05s;
  }

  @keyframes run {
    from {
      transform: translate(-60vw, -50%);
    }
    to {
      transform: translate(115vw, -50%);
    }
  }

  @keyframes streak {
    from {
      transform: translateX(-130vw) scaleX(0.4);
    }
    to {
      transform: translateX(20vw) scaleX(1);
    }
  }

  @keyframes runway-out {
    0%,
    85% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
