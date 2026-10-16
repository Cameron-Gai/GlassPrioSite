<script lang="ts">
  /**
   * Phones only (<960px), first screen only: the headline the form card sits
   * over (design picked 2026-10-16). Once the customer answers anything it
   * gives way to the slim brand band, so later steps start at the question.
   *
   * No star rating or reviews here yet: those come from the Google Business
   * Profile once Jim grants access — never placeholder reviews on the live
   * site. Same for a job photo: the drawn panes stand in until real photos
   * arrive.
   */
  import { intakeStore } from '$lib/stores/intakeStore';

  $: show = $intakeStore.step === 'triage' && $intakeStore.triageHistory.length === 0;
</script>

{#if show}
  <section class="hero" aria-label="Glass Doctor">
    <svg class="panes" viewBox="0 0 360 300" aria-hidden="true">
      <g fill="none" stroke="#fff" stroke-width="6"><rect x="30" y="20" width="300" height="260" rx="6" /><path d="M180 20v260M30 150h300" /></g>
      <g stroke="#fff" stroke-width="5" opacity="0.8"><path d="M60 50l60 60M80 50l30 30M210 180l60 60M230 180l30 30" /></g>
    </svg>
    <p class="headline">Glass fixed right. Booked in two minutes.</p>
    <p class="lead">Window, storefront, shower and door glass across Seattle, Lynnwood and Tacoma.</p>
    <ul class="proof">
      <li><b>Upfront</b>Visit charge shown before you submit</li>
      <li><b>Real people</b>We confirm every appointment</li>
      <li><b>Same day</b>Emergency dispatch</li>
    </ul>
  </section>
{/if}

<style>
  .hero {
    position: relative;
    overflow: hidden;
    color: #fff;
    padding: 1.3rem 1.1rem 4rem;
    display: grid;
    gap: 0.7rem;
    background:
      radial-gradient(120% 80% at 85% 10%, rgba(96, 175, 230, 0.55), transparent 60%),
      linear-gradient(160deg, rgba(6, 3, 141, 0.97), rgba(26, 63, 184, 0.88));
  }

  .hero > :not(.panes) {
    position: relative;
  }

  .panes {
    position: absolute;
    right: -60px;
    bottom: -40px;
    width: 300px;
    height: 250px;
    opacity: 0.25;
    pointer-events: none;
  }

  .headline {
    margin: 0;
    font-size: clamp(1.75rem, 8vw, 2.3rem);
    font-weight: 900;
    line-height: 1.08;
    letter-spacing: -0.025em;
    max-width: 15ch;
    text-wrap: balance;
  }

  .lead {
    margin: 0;
    font-size: 0.95rem;
    opacity: 0.9;
    max-width: 36ch;
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
    background: rgba(255, 255, 255, 0.12);
    border-radius: var(--radius-sm);
    padding: 0.5rem;
    font-size: 0.72rem;
    line-height: 1.3;
  }

  .proof b {
    display: block;
    font-size: 0.8rem;
  }

  @media (min-width: 960px) {
    .hero {
      display: none;
    }
  }
</style>
