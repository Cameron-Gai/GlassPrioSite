<script lang="ts">
  import { PHASES } from '$lib/stores/intakeStore';

  export let currentIndex: number;
</script>

<nav class="stepper" aria-label="Progress">
  {#each PHASES as phase, idx (phase.id)}
    {@const state = idx < currentIndex ? 'done' : idx === currentIndex ? 'active' : 'upcoming'}
    <div class="phase" data-state={state}>
      <span class="dot">
        {#if state === 'done'}
          <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
            <path d="M2 6.5l2.5 2.5L10 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        {:else}
          {idx + 1}
        {/if}
      </span>
      <span class="label">{phase.label}</span>
    </div>
    {#if idx < PHASES.length - 1}
      <span class="line" data-state={idx < currentIndex ? 'done' : 'upcoming'} aria-hidden="true"></span>
    {/if}
  {/each}
</nav>

<style>
  .stepper {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0;
  }

  .phase {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-shrink: 0;
  }

  .dot {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: #ffffff;
    border: 1.5px solid var(--color-border-strong);
    color: var(--color-muted);
    font-size: 0.78rem;
    font-weight: 700;
    transition: background 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  .phase[data-state='active'] .dot {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
    box-shadow: 0 0 0 4px rgba(11, 79, 138, 0.16);
  }

  .phase[data-state='done'] .dot {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }

  .label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-muted);
  }

  .phase[data-state='active'] .label {
    color: var(--color-text);
  }

  .phase[data-state='done'] .label {
    color: var(--color-text);
  }

  .line {
    flex: 1;
    height: 2px;
    border-radius: 1px;
    background: var(--color-border);
    transition: background 0.2s ease;
  }

  .line[data-state='done'] {
    background: var(--color-accent);
  }

  @media (max-width: 520px) {
    .label {
      display: none;
    }
    .stepper {
      justify-content: center;
      gap: 0.4rem;
    }
    .line {
      min-width: 16px;
    }
  }
</style>
