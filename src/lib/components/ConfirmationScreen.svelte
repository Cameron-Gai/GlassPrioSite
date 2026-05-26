<script lang="ts">
  import PriorityBadge from './PriorityBadge.svelte';
  import type { JobPriority } from '$lib/data/jobTypes';

  export let confirmationNumber: string;
  export let jobName: string;
  export let priority: JobPriority | '';
  export let duration: string;
  export let isEmergency: boolean;
  export let isDuringBusinessHours: boolean;
  export let onReset: () => void;
</script>

<section class="confirm">
  <div class="hero">
    <span class="check" aria-hidden="true">✓</span>
    <h2>Request received</h2>
    <p class="sub">
      Confirmation number <strong>{confirmationNumber}</strong>
    </p>
  </div>

  <div class="card">
    <div class="row">
      <span>Service</span>
      <strong>{jobName}</strong>
    </div>
    <div class="row">
      <span>Priority</span>
      <PriorityBadge {priority} />
    </div>
    <div class="row">
      <span>Estimated duration</span>
      <strong>{duration}</strong>
    </div>
    {#if isEmergency}
      <div class="row emergency">
        <span>Routing</span>
        <strong>
          {isDuringBusinessHours ? 'Priority dispatch during business hours' : 'After-hours emergency dispatch'}
        </strong>
      </div>
    {/if}
  </div>

  <p class="note">
    {#if isEmergency}
      A dispatcher will reach out as soon as possible. If conditions worsen, call 911 or our emergency line.
    {:else}
      A team member will follow up to confirm the consultation appointment.
    {/if}
  </p>

  <button type="button" class="reset" on:click={onReset}>Start a new request</button>
</section>

<style>
  .confirm {
    display: grid;
    gap: 1.1rem;
    text-align: center;
  }

  .hero {
    display: grid;
    gap: 0.3rem;
    place-items: center;
  }

  .check {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: var(--color-success-bg);
    color: var(--color-success);
    font-size: 2rem;
    line-height: 56px;
    font-weight: 700;
  }

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .sub {
    color: var(--color-muted);
    margin: 0;
  }

  .card {
    text-align: left;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.9rem 1rem;
    display: grid;
    gap: 0.55rem;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .row span {
    color: var(--color-muted);
  }

  .row.emergency strong {
    color: var(--color-emergency);
  }

  .note {
    margin: 0;
    color: var(--color-muted);
  }

  .reset {
    background: var(--color-primary);
    color: #fff;
    padding: 0.75rem 1rem;
    border-radius: var(--radius-md);
    font-weight: 600;
  }

  .reset:hover {
    background: var(--color-primary-hover);
  }
</style>
