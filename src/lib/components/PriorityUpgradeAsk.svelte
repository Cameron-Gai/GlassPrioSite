<script lang="ts">
  import PriorityBadge from './PriorityBadge.svelte';
  import { intakeStore } from '$lib/stores/intakeStore';
  import { getPublicJobType } from '$lib/data/jobTypes';

  const priority = getPublicJobType('Priority Service (Business Hours)');

  function accept() {
    intakeStore.acceptPriorityUpgrade();
  }

  function decline() {
    intakeStore.declinePriorityUpgrade();
  }
</script>

<section class="ask fade-in">
  <header>
    <h2>How quickly do you need this done?</h2>
    <p class="helper">
      We can upgrade your request to <strong>Priority Service</strong> for fast same-day handling.
      Otherwise we'll proceed with the consultation we just routed you to.
    </p>
  </header>

  <button type="button" class="upgrade" on:click={accept}>
    <div class="upgrade-head">
      <span class="title">Yes — make it priority</span>
      <PriorityBadge priority="Urgent" />
    </div>
    <p class="summary">{priority.summary}</p>
    <ul class="includes">
      {#each priority.includes ?? [] as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
    <div class="chips">
      <span class="chip price">{priority.pricing?.display ?? '$399'}</span>
      {#if priority.pricing?.rebate}
        <span class="chip rebate">{priority.pricing.rebate}</span>
      {/if}
    </div>
  </button>

  <button type="button" class="standard" on:click={decline}>
    <span class="title">Standard timing is fine</span>
    <span class="hint">Continue with the consultation we routed you to</span>
  </button>
</section>

<style>
  .ask {
    display: grid;
    gap: 1rem;
  }

  header {
    display: grid;
    gap: 0.35rem;
  }

  h2 {
    margin: 0;
    font-size: 1.35rem;
  }

  .helper {
    margin: 0;
    color: var(--color-muted);
  }

  .upgrade {
    display: grid;
    gap: 0.55rem;
    padding: 1rem 1.1rem;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-primary);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 75%);
    text-align: left;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .upgrade:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .upgrade-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .upgrade .title {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .summary {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.9rem;
  }

  .includes {
    margin: 0;
    padding-left: 1.1rem;
    color: var(--color-text);
    font-size: 0.88rem;
    display: grid;
    gap: 0.2rem;
  }

  .chips {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .chip {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .chip.price {
    background: var(--color-primary);
    color: #fff;
  }

  .chip.rebate {
    background: var(--color-accent-bg);
    color: var(--color-accent);
  }

  .standard {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.85rem 1.05rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    text-align: left;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .standard:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-tint);
  }

  .standard .title {
    font-weight: 600;
  }

  .hint {
    font-size: 0.85rem;
    color: var(--color-muted);
  }
</style>
