<script lang="ts">
  import ServiceIcon from './ServiceIcon.svelte';
  import type { ServiceIcon as IconKey } from '$lib/triage/triageTree';

  export let label: string;
  export let helperText: string | undefined = undefined;
  export let icon: IconKey | undefined = undefined;
  export let emphasis: 'default' | 'emergency' = 'default';
  export let disabled = false;
</script>

<button
  type="button"
  class="option"
  class:emergency={emphasis === 'emergency'}
  {disabled}
  on:click
>
  {#if icon}
    <span class="icon" aria-hidden="true">
      <ServiceIcon {icon} size={24} />
    </span>
  {/if}
  <span class="content">
    <span class="label">{label}</span>
    {#if helperText}
      <span class="helper">{helperText}</span>
    {/if}
  </span>
  <span class="chev" aria-hidden="true">→</span>
</button>

<style>
  .option {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    width: 100%;
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    text-align: left;
    color: var(--color-text);
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease,
      background 0.15s ease;
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

  .option.emergency {
    border-color: var(--color-emergency-soft);
    background: var(--color-emergency-bg);
    color: #6b170b;
  }

  .option.emergency:hover:not(:disabled) {
    border-color: var(--color-emergency);
    background: #fbdcd6;
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: 10px;
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
    gap: 0.1rem;
  }

  .label {
    font-weight: 600;
    line-height: 1.2;
  }

  .helper {
    font-size: 0.85rem;
    color: var(--color-muted);
  }

  .option.emergency .helper {
    color: #834035;
  }

  .chev {
    font-size: 1.1rem;
    color: var(--color-subtle);
    transition: transform 0.15s ease, color 0.15s ease;
  }

  .option:hover:not(:disabled) .chev {
    color: var(--color-primary);
    transform: translateX(2px);
  }

  .option.emergency .chev {
    color: var(--color-emergency);
  }
</style>
