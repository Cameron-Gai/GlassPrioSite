<script lang="ts">
  export let stepLabel: string;
  export let current: number;
  export let total: number;

  $: percent = Math.min(100, Math.max(0, Math.round((current / total) * 100)));
</script>

<div class="progress">
  <div class="meta">
    <span class="step">{stepLabel}</span>
    <span class="count">Step {current} of {total}</span>
  </div>
  <div class="bar" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100">
    <div class="fill" style:width="{percent}%"></div>
  </div>
</div>

<style>
  .progress {
    margin-bottom: 1.25rem;
  }

  .meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    color: var(--color-muted);
    margin-bottom: 0.35rem;
  }

  .step {
    font-weight: 600;
    color: var(--color-text);
  }

  .bar {
    height: 6px;
    background: #e1e7f0;
    border-radius: 999px;
    overflow: hidden;
  }

  .fill {
    height: 100%;
    background: var(--color-primary);
    transition: width 0.3s ease;
  }
</style>
