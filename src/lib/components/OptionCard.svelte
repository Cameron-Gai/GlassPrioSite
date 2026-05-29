<script lang="ts">
  import ServiceIcon from './ServiceIcon.svelte';
  import type { ServiceIcon as IconKey } from '$lib/triage/triageTree';

  export let label: string;
  export let helperText: string | undefined = undefined;
  export let icon: IconKey | undefined = undefined;
</script>

<button type="button" class="card" on:click>
  {#if icon}
    <span class="icon" aria-hidden="true">
      <ServiceIcon {icon} size={26} />
    </span>
  {/if}
  <span class="label">{label}</span>
  {#if helperText}
    <span class="helper">{helperText}</span>
  {/if}
</button>

<style>
  .card {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
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

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .label {
    font-weight: 600;
    line-height: 1.2;
  }

  .helper {
    font-size: 0.85rem;
    color: var(--color-muted);
    margin-top: auto;
  }
</style>
