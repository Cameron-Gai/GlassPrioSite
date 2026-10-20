<script lang="ts">
  /**
   * The offer on the "This is a priority" screen (Cameron, 2026-10-20): what
   * the customer is agreeing to before they accept. During business hours it's
   * Priority Service (on-site within 2 hours, $399 with a $199 rebate); after
   * hours the same tile books Emergency Service, so the card says so. Figures
   * come from the job types in $lib/data/jobTypes, never from this file.
   */
  import { getPublicJobType } from '$lib/data/jobTypes';
  import { isBusinessHours } from '$lib/utils/businessHours';
  import PriorityBadge from './PriorityBadge.svelte';

  const duringHours = isBusinessHours();
  const job = getPublicJobType(duringHours ? 'Priority Service (Business Hours)' : 'Emergency Services (After Hours)');
</script>

{#if job}
  <section class="offer" aria-label="What priority service includes">
    <div class="head">
      <span class="title">{job.customerLabel ?? job.name}</span>
      <PriorityBadge priority="Urgent" />
    </div>
    {#if job.summary}<p class="summary">{job.summary}</p>{/if}
    {#if job.includes?.length}
      <ul>
        {#each job.includes as line}<li>{line}</li>{/each}
      </ul>
    {/if}
    {#if job.pricing}
      <div class="chips">
        <span class="chip price">{job.pricing.display}</span>
        {#if job.pricing.rebate}<span class="chip rebate">{job.pricing.rebate}</span>{/if}
      </div>
    {/if}
    {#if !duringHours}
      <p class="note">It's after business hours, so this books our after-hours emergency service.</p>
    {/if}
  </section>
{/if}

<style>
  .offer {
    display: grid;
    gap: 0.55rem;
    padding: 1rem 1.1rem;
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-md);
    background: var(--color-light-blue-soft);
  }

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6rem;
  }

  .title {
    font-weight: 700;
    font-size: 1.05rem;
  }

  .summary {
    margin: 0;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.2rem;
    font-size: 0.9rem;
    color: var(--color-muted);
  }

  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }

  .chip {
    font-weight: 700;
    font-size: 0.85rem;
  }

  .chip.price {
    background: var(--color-primary);
    color: #fff;
    border-radius: 999px;
    padding: 0.2rem 0.65rem;
  }

  .chip.rebate {
    color: var(--color-text-strong);
  }

  .note {
    margin: 0;
    font-size: 0.85rem;
    color: var(--color-muted);
  }
</style>
