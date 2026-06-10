<script lang="ts">
  import OptionButton from './OptionButton.svelte';
  import OptionCard from './OptionCard.svelte';
  import YesNoTiles from './YesNoTiles.svelte';
  import type { TriageNode, TriageOption } from '$lib/triage/triageTree';

  export let node: TriageNode;
  export let onSelect: (option: TriageOption) => void;

  $: isEmergencyDetail = node.id === 'emergency-which';
</script>

<section class="card fade-in">
  <header>
    <h2>{node.question}</h2>
    {#if node.helperText}
      <p class="helper">{node.helperText}</p>
    {/if}
  </header>

  {#if node.layout === 'yesno'}
    <YesNoTiles options={node.options} {onSelect} />
  {:else if node.layout === 'cards'}
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
          emphasis={isEmergencyDetail ? 'emergency' : 'default'}
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
    gap: 1.2rem;
  }

  header {
    display: grid;
    gap: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.7rem;
    line-height: 1.2;
    color: var(--color-text-strong);
    font-weight: 700;
  }

  .helper {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.98rem;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
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
      font-size: 1.4rem;
    }
  }
</style>
