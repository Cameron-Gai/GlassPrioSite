<script lang="ts">
  /**
   * The Glass Doctor running man dashes across the screen when an ad visitor
   * lands on /book (Jim, 2026-10-16: franchisees love him, and corporate
   * retiring him "was one of the worst mistakes they ever made"). Image from
   * Jim: static/running-man.png.
   *
   * Kept out of the way on purpose: about 2.8 seconds, once per browser
   * session, any tap skips it, and it never runs with reduced motion. It
   * renders only after mount, so it never holds up the page or the form.
   */
  import { onMount } from 'svelte';

  const SEEN_KEY = 'gd-running-man-seen';
  const RUN_MS = 2800;

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
    <span class="streak streak-red"></span>
    <span class="streak streak-blue"></span>
    <img class="man" src="/running-man.png" alt="" width="220" height="199" />
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
    animation: runway-out 2.8s ease forwards;
  }

  .man {
    position: absolute;
    top: 50%;
    left: 0;
    width: min(46vw, 220px);
    height: auto;
    animation: run 2.8s cubic-bezier(0.45, 0.05, 0.4, 1) forwards, bob 0.26s ease-in-out infinite alternate;
  }

  /* The red-white-blue "reflective ray" from the logo, trailing behind him. */
  .streak {
    position: absolute;
    left: 0;
    height: 14px;
    width: 120vw;
    transform-origin: left center;
    animation: streak 2.8s cubic-bezier(0.45, 0.05, 0.4, 1) forwards;
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

  @keyframes bob {
    from {
      margin-top: 0;
    }
    to {
      margin-top: -6px;
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
    78% {
      opacity: 1;
    }
    100% {
      opacity: 0;
    }
  }
</style>
