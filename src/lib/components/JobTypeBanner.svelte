<script lang="ts">
  import PriorityBadge from './PriorityBadge.svelte';
  import type { JobType } from '$lib/data/jobTypes';

  export let job: JobType;
  export let isEmergency = false;
  export let isDuringBusinessHours = false;
  export let priorityUpgrade = false;

  // Per-job fees now come from the zone map and are shown (and collected) at the
  // review step once we know the customer's ZIP. Only priority/emergency keep a
  // fixed up-front price here.
  $: showStaticPrice = job.category === 'emergency';
</script>

<aside class="banner fade-in" class:emergency={isEmergency}>
  <div class="head">
    <span class="eyebrow">
      {#if isEmergency}
        {isDuringBusinessHours ? 'Priority dispatch' : 'After-hours emergency'}
      {:else if priorityUpgrade}
        Priority upgrade
      {:else}
        Routed to
      {/if}
    </span>
    <PriorityBadge priority={job.priority} />
  </div>

  <div class="name">{job.customerLabel ?? job.name}</div>

  {#if job.summary}
    <p class="summary">{job.summary}</p>
  {/if}

  {#if job.includes && job.includes.length}
    <ul class="includes">
      {#each job.includes as item (item)}
        <li>{item}</li>
      {/each}
    </ul>
  {/if}

  {#if (showStaticPrice && job.pricing) || job.duration}
    <div class="chips">
      {#if showStaticPrice && job.pricing}
        <span class="chip price">{job.pricing.display}</span>
      {/if}
      {#if showStaticPrice && job.pricing?.rebate}
        <span class="chip rebate">{job.pricing.rebate}</span>
      {/if}
      {#if job.duration}
        <span class="chip duration">~{job.duration}</span>
      {/if}
    </div>
    {#if showStaticPrice && job.pricing?.detail}
      <p class="detail">{job.pricing.detail}</p>
    {/if}
  {/if}
</aside>

<style>
  .banner {
    display: grid;
    gap: 0.6rem;
    padding: 1rem 1.1rem;
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 80%);
    border: 1px solid var(--color-primary-soft-strong);
  }

  .banner.emergency {
    background: linear-gradient(180deg, var(--color-emergency-bg), #ffffff 80%);
    border-color: var(--color-emergency-soft);
  }

  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .eyebrow {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 700;
    color: var(--color-primary);
  }

  .banner.emergency .eyebrow {
    color: var(--color-emergency);
  }

  .name {
    font-weight: 700;
    font-size: 1.05rem;
    line-height: 1.25;
  }

  .summary {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.92rem;
    line-height: 1.5;
  }

  .includes {
    margin: 0;
    padding: 0;
    list-style: none;
    display: grid;
    gap: 0.25rem;
    font-size: 0.88rem;
  }

  .includes li {
    position: relative;
    padding-left: 1.15rem;
    color: var(--color-text);
  }

  .includes li::before {
    content: '';
    position: absolute;
    left: 0.05rem;
    top: 0.55rem;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-primary);
  }

  .banner.emergency .includes li::before {
    background: var(--color-emergency);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-top: 0.1rem;
  }

  .chip {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
    background: #ffffff;
    border: 1px solid var(--color-border);
    color: var(--color-text);
  }

  .chip.price {
    background: var(--color-primary);
    color: #fff;
    border-color: var(--color-primary);
  }

  .banner.emergency .chip.price {
    background: var(--color-emergency);
    border-color: var(--color-emergency);
  }

  .chip.rebate {
    background: var(--color-accent-bg);
    color: var(--color-accent);
    border-color: rgba(96, 175, 230, 0.4);
  }

  .chip.duration {
    color: var(--color-muted);
  }

  .detail {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
</style>
