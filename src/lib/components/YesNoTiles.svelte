<script lang="ts">
  import ServiceIcon from './ServiceIcon.svelte';
  import type { TriageOption } from '$lib/triage/triageTree';

  export let options: TriageOption[];
  export let onSelect: (option: TriageOption) => void;
</script>

<div class="tiles">
  {#each options as option (option.id)}
    {@const tone = option.id.includes('yes') ? 'yes' : 'no'}
    <button type="button" class="tile" data-tone={tone} on:click={() => onSelect(option)}>
      <span class="icon" aria-hidden="true">
        {#if option.icon}
          <ServiceIcon icon={option.icon} size={32} />
        {/if}
      </span>
      <span class="label">{option.label}</span>
      {#if option.helperText}
        <span class="helper">{option.helperText}</span>
      {/if}
    </button>
  {/each}
</div>

<style>
  .tiles {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;
  }

  .tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
    min-height: 150px;
    padding: 1.2rem 1.25rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    text-align: left;
    color: var(--color-text);
    cursor: pointer;
    transition: transform 0.18s cubic-bezier(0.2, 0.7, 0.2, 1),
      box-shadow 0.18s ease,
      border-color 0.18s ease,
      background 0.18s ease;
  }

  .tile:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .tile:focus-visible {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: var(--ring-focus);
  }

  .tile[data-tone='yes'] {
    border-color: var(--color-emergency-soft);
    background: linear-gradient(160deg, #fff6f4 0%, #ffffff 65%);
  }

  .tile[data-tone='yes']:hover {
    border-color: var(--color-emergency);
    background: linear-gradient(160deg, #ffe7e1 0%, #ffffff 65%);
  }

  .tile[data-tone='no'] {
    border-color: var(--color-primary-soft-strong);
    background: linear-gradient(160deg, #eaf3fc 0%, #ffffff 65%);
  }

  .tile[data-tone='no']:hover {
    border-color: var(--color-primary);
    background: linear-gradient(160deg, #d8e8f8 0%, #ffffff 65%);
  }

  .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 14px;
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .tile[data-tone='yes'] .icon {
    color: var(--color-emergency);
  }

  .tile[data-tone='no'] .icon {
    color: var(--color-primary);
  }

  .label {
    font-weight: 700;
    font-size: 1.15rem;
    letter-spacing: -0.01em;
  }

  .helper {
    color: var(--color-muted);
    font-size: 0.88rem;
    margin-top: auto;
  }

  @media (max-width: 460px) {
    .tiles {
      grid-template-columns: 1fr;
    }

    .tile {
      min-height: 120px;
    }
  }
</style>
