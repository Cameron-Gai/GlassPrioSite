<script lang="ts">
  import ServiceIcon from './ServiceIcon.svelte';
  import type { ServiceIcon as IconKey } from '$lib/triage/triageTree';

  export let label: string;
  export let helperText: string | undefined = undefined;
  export let icon: IconKey | undefined = undefined;
  export let emphasis: 'default' | 'emergency' = 'default';
  export let disabled = false;
  /** Brief post-tap highlight while the wizard advances. */
  export let selected = false;
</script>

<button
  type="button"
  class="option"
  class:emergency={emphasis === 'emergency'}
  class:selected
  {disabled}
  on:click
>
  {#if icon}
    <span class="icon" aria-hidden="true">
      <ServiceIcon {icon} size={22} />
    </span>
  {/if}
  <span class="content">
    <span class="label">{label}</span>
    {#if helperText}
      <span class="helper">{helperText}</span>
    {/if}
  </span>
  <span class="chev" aria-hidden="true">
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 6l6 6-6 6" />
    </svg>
  </span>
</button>

<style>
  .option {
    display: flex;
    align-items: center;
    gap: 0.95rem;
    width: 100%;
    padding: 0.95rem 1.1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    text-align: left;
    color: var(--color-text);
    transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease,
      background 0.18s ease;
  }

  .option:hover:not(:disabled) {
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .option:focus-visible {
    outline: none;
    box-shadow: var(--ring-focus);
    border-color: var(--color-primary);
  }

  /* Touch feedback: hover never fires on phones, so the press itself responds. */
  .option:active:not(:disabled) {
    transform: scale(0.985);
    transition-duration: 0.06s;
  }

  .option.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    box-shadow: var(--ring-focus);
  }

  .option.emergency.selected {
    border-color: var(--color-emergency);
    background: var(--color-emergency-bg);
    box-shadow: 0 0 0 4px rgba(228, 0, 43, 0.16);
  }

  .option.emergency {
    border-color: var(--color-emergency-soft);
    background: linear-gradient(180deg, #fff6f4 0%, #ffffff 70%);
    color: #5b150a;
  }

  .option.emergency:hover:not(:disabled) {
    border-color: var(--color-emergency);
    background: linear-gradient(180deg, #ffe8e3 0%, #ffffff 70%);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 11px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .option.emergency .icon {
    background: rgba(192, 57, 43, 0.12);
    color: var(--color-emergency);
  }

  .content {
    flex: 1;
    display: grid;
    gap: 0.15rem;
    min-width: 0;
  }

  .label {
    font-weight: 600;
    line-height: 1.25;
  }

  .helper {
    font-size: 0.86rem;
    color: var(--color-muted);
  }

  .option.emergency .helper {
    color: #834035;
  }

  .chev {
    display: inline-flex;
    color: var(--color-subtle);
    transition: transform 0.18s ease, color 0.18s ease;
  }

  .option:hover:not(:disabled) .chev {
    color: var(--color-primary);
    transform: translateX(2px);
  }

  .option.emergency .chev {
    color: var(--color-emergency);
  }
</style>
