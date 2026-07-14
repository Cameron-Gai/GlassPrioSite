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
</script>

<button
  type="button"
  class="card"
  class:selected
  class:emergency={tone === 'emergency'}
  on:click
>
  {#if icon}
    <span class="icon" aria-hidden="true">
      <ServiceIcon {icon} size={26} />
    </span>
  {/if}
  <span class="body">
    <span class="label">{label}</span>
    {#if helperText}
      <span class="helper">{helperText}</span>
    {/if}
  </span>
</button>

<style>
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
