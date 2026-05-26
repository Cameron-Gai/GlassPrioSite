<script lang="ts">
  export let label: string;
  export let emphasis: 'default' | 'emergency' = 'default';
  export let disabled = false;
</script>

<button
  type="button"
  class="option"
  class:emergency={emphasis === 'emergency'}
  {disabled}
  on:click
>
  <span class="label">{label}</span>
  <span class="chev" aria-hidden="true">›</span>
</button>

<style>
  .option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.95rem 1.1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    text-align: left;
    font-weight: 600;
    color: var(--color-text);
    transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease,
      background 0.15s ease;
  }

  .option:hover:not(:disabled) {
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .option.emergency {
    border-color: var(--color-emergency);
    background: var(--color-emergency-bg);
    color: #7a1d12;
  }

  .option.emergency:hover:not(:disabled) {
    background: #fbdcd6;
  }

  .label {
    flex: 1;
    padding-right: 0.5rem;
  }

  .chev {
    font-size: 1.4rem;
    line-height: 1;
    color: var(--color-muted);
  }

  .option.emergency .chev {
    color: var(--color-emergency);
  }
</style>
