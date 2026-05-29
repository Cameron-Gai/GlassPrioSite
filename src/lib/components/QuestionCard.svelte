<script lang="ts">
  import OptionButton from './OptionButton.svelte';
  import OptionCard from './OptionCard.svelte';
  import type { TriageNode, TriageOption } from '$lib/triage/triageTree';

  export let node: TriageNode;
  export let onSelect: (option: TriageOption) => void;

  $: isEmergencyNode = node.id === 'emergency';
  $: useCardGrid = node.layout === 'cards';
</script>

<section class="card fade-in">
  <header>
    <h2>{node.question}</h2>
    {#if node.helperText}
      <p class="helper">{node.helperText}</p>
    {/if}
  </header>

  {#if useCardGrid}
    <div class="grid">
      {#each node.options as option (option.id)}
        <OptionCard
          label={option.label}
          helperText={option.helperText}
          icon={option.icon}
          on:click={() => onSelect(option)}
        />
      {/each}
    </div>
  {:else}
    <div class="list">
      {#each node.options as option (option.id)}
        <OptionButton
          label={option.label}
          helperText={option.helperText}
          icon={option.icon}
          emphasis={isEmergencyNode && option.isEmergency ? 'emergency' : 'default'}
          on:click={() => onSelect(option)}
        />
      {/each}
    </div>
  {/if}
</section>

<style>
  .card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  header {
    display: grid;
    gap: 0.4rem;
  }

  h2 {
    margin: 0;
    font-size: 1.4rem;
    line-height: 1.25;
    color: var(--color-text);
  }

  .helper {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.95rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
  }

  @media (max-width: 720px) {
    .grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 420px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 640px) {
    h2 {
      font-size: 1.25rem;
    }
  }
</style>
