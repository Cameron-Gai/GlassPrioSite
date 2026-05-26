<script lang="ts">
  import OptionButton from './OptionButton.svelte';
  import type { TriageNode, TriageOption } from '$lib/triage/triageTree';

  export let node: TriageNode;
  export let onSelect: (option: TriageOption) => void;

  $: isEmergencyNode = node.id === 'emergency';
</script>

<section class="card">
  <h2>{node.question}</h2>
  {#if node.helperText}
    <p class="helper">{node.helperText}</p>
  {/if}
  <div class="options">
    {#each node.options as option (option.id)}
      <OptionButton
        label={option.label}
        emphasis={isEmergencyNode && option.isEmergency ? 'emergency' : 'default'}
        on:click={() => onSelect(option)}
      />
    {/each}
  </div>
</section>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.25;
    color: var(--color-text);
  }

  .helper {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .options {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    margin-top: 0.5rem;
  }

  @media (max-width: 640px) {
    h2 {
      font-size: 1.3rem;
    }
  }
</style>
