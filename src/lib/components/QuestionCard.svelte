<script lang="ts">
  import { onDestroy } from 'svelte';
  import OptionButton from './OptionButton.svelte';
  import OptionCard from './OptionCard.svelte';
  import YesNoTiles from './YesNoTiles.svelte';
  import type { TriageNode, TriageOption } from '$lib/triage/triageTree';

  export let node: TriageNode;
  export let onSelect: (option: TriageOption) => void;

  $: isEmergencyDetail = node.id === 'emergency-which';

  // Brief "selected" flash before advancing, so a tap visibly registers instead
  // of the screen just swapping. Skipped under prefers-reduced-motion.
  let flashId: string | null = null;
  let flashTimer: ReturnType<typeof setTimeout> | null = null;

  function pick(option: TriageOption) {
    if (flashTimer) return; // ignore double-taps mid-flash
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      onSelect(option);
      return;
    }
    flashId = option.id;
    flashTimer = setTimeout(() => {
      flashTimer = null;
      flashId = null;
      onSelect(option);
    }, 160);
  }

  onDestroy(() => {
    if (flashTimer) clearTimeout(flashTimer);
  });
</script>

<section class="card">
  <header>
    <h2>{node.question}</h2>
    {#if node.helperText}
      <p class="helper">{node.helperText}</p>
    {/if}
  </header>

  {#if node.layout === 'yesno'}
    <YesNoTiles options={node.options} onSelect={pick} selectedId={flashId} />
  {:else if node.layout === 'cards'}
    <div class="grid">
      {#each node.options as option (option.id)}
        <div class="cell" class:wide={option.tone === 'emergency'}>
          <OptionCard
            label={option.label}
            helperText={option.helperText}
            icon={option.icon}
            tone={option.tone ?? 'default'}
            selected={flashId === option.id}
            on:click={() => pick(option)}
          />
        </div>
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
          selected={flashId === option.id}
          on:click={() => pick(option)}
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

  .cell {
    display: grid;
    min-width: 0;
  }

  .cell.wide {
    grid-column: 1 / -1;
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
