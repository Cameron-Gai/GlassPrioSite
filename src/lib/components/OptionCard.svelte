<script lang="ts">
  import ServiceIcon from './ServiceIcon.svelte';
  import type { ServiceIcon as IconKey } from '$lib/triage/triageTree';

  export let label: string;
  export let helperText: string | undefined = undefined;
  export let icon: IconKey | undefined = undefined;
  /** Brief post-tap highlight while the wizard advances. */
  export let selected = false;
  /** 'emergency' renders red-tinted and horizontal (used full-row in the grid). */
  export let tone: 'default' | 'emergency' = 'default';
  /** "Did you know?" text behind the eye icon (Jim, 2026-10-16). It sits in a
   *  separate button beside the card, never inside it: tapping it must not
   *  pick the service. */
  export let info: string | undefined = undefined;

  let showInfo = false;
</script>

<div class="tile">
<button
  type="button"
  class="card"
  class:selected
  class:emergency={tone === 'emergency'}
  on:click
>
  {#if icon && tone === 'emergency'}
    <span class="icon" aria-hidden="true">
      <ServiceIcon {icon} size={26} />
    </span>
  {:else if icon}
    <!-- Picture tile (design picked 2026-10-16): a tinted panel per service. -->
    <span class="art" data-icon={icon} aria-hidden="true">
      <ServiceIcon {icon} size={34} />
    </span>
  {/if}
  <span class="body">
    <span class="label">{label}</span>
    {#if helperText}
      <span class="helper">{helperText}</span>
    {/if}
  </span>
</button>
{#if info}
  <button
    type="button"
    class="info-btn"
    aria-label={showInfo ? `Hide what ${label} covers` : `What does ${label} cover?`}
    aria-expanded={showInfo}
    on:click={() => (showInfo = !showInfo)}
  >
    {#if showInfo}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    {:else}
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>
    {/if}
  </button>
  {#if showInfo}
    <!-- Tapping the explainer closes it; the service is picked from the card. -->
    <button type="button" class="info-pop" on:click={() => (showInfo = false)}>
      <span class="info-kicker">Did you know?</span>
      {info}
    </button>
  {/if}
{/if}
</div>

<style>
  .tile {
    position: relative;
    display: grid;
    height: 100%;
  }

  .info-btn {
    position: absolute;
    top: 0.45rem;
    right: 0.45rem;
    z-index: 2;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.92);
    color: var(--color-primary);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .info-btn:hover {
    border-color: var(--color-primary);
  }

  .info-btn:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus);
  }

  .info-pop {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.85rem 2.4rem 0.85rem 0.9rem;
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text);
    font: inherit;
    font-size: 0.82rem;
    line-height: 1.35;
    text-align: left;
    overflow: auto;
    cursor: pointer;
  }

  .info-kicker {
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-strong);
  }

  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
    width: 100%;
    height: 100%;
    min-height: 124px;
    padding: 0.95rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    text-align: left;
    color: var(--color-text);
    cursor: pointer;
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease,
      background 0.15s ease;
  }

  /* Neutral wrapper: children lay out as direct flex items of .card, so the
     column card keeps its helper pinned to the bottom via margin-top: auto. */
  .body {
    display: contents;
  }

  .card:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
    background: var(--color-surface-tint);
  }

  .card:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: var(--ring-focus);
  }

  /* Touch feedback: hover never fires on phones, so the press itself responds. */
  .card:active {
    transform: scale(0.98);
    transition-duration: 0.06s;
  }

  .card.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    box-shadow: var(--ring-focus);
  }

  /* Emergency tile: red, horizontal, spans the full grid row (set by parent). */
  .card.emergency {
    flex-direction: row;
    align-items: center;
    min-height: 0;
    border-color: var(--color-emergency-soft);
    background: linear-gradient(180deg, #fff6f4 0%, #ffffff 75%);
  }

  .card.emergency .body {
    display: grid;
    gap: 0.15rem;
  }

  .card.emergency:hover {
    border-color: var(--color-emergency);
    background: linear-gradient(180deg, #ffe8e3 0%, #ffffff 75%);
  }

  .card.emergency.selected {
    border-color: var(--color-emergency);
    background: var(--color-emergency-bg);
    box-shadow: 0 0 0 4px rgba(228, 0, 43, 0.16);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .art {
    display: grid;
    place-items: center;
    width: 100%;
    height: 64px;
    border-radius: 10px;
    color: var(--color-primary);
    background: linear-gradient(135deg, #e7f3fc, #b9dcf5);
    transition: transform 0.15s ease;
  }

  .card:hover .art {
    transform: scale(1.02);
  }

  .art[data-icon='window'] { background: linear-gradient(135deg, #ececf8, #c7c6ea); }
  .art[data-icon='storefront'] { background: linear-gradient(135deg, #e6edf9, #a9bfe8); }
  .art[data-icon='patio'] { background: linear-gradient(135deg, #e5f4fc, #a6d6f1); }
  .art[data-icon='shower'] { background: linear-gradient(135deg, #eef8fd, #bfe2f7); }
  .art[data-icon='hardware'] { background: linear-gradient(135deg, #fff0f2, #ffc9cf); color: var(--color-emergency); }
  .art[data-icon='multi'] { background: linear-gradient(135deg, #eef0fb, #d2d6f2); }
  .art[data-icon='measure'] { background: linear-gradient(135deg, #e9f6f0, #b8e2cc); color: #11603b; }
  .art[data-icon='other'] { background: linear-gradient(135deg, #f1f3f7, #d8dee9); }

  .card.emergency .icon {
    background: var(--color-emergency-bg);
    color: var(--color-emergency);
  }

  .label {
    font-weight: 600;
    line-height: 1.2;
  }

  .card.emergency .label {
    font-weight: 700;
    color: var(--color-emergency);
  }

  .helper {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin-top: auto;
  }

  .card.emergency .helper {
    margin-top: 0;
  }
</style>
