<script lang="ts">
  import type { JobPriority } from '$lib/data/jobTypes';

  export let priority: JobPriority | '';

  // Brand palette: Urgent = Supporting Red, High = Light Blue, Normal = Primary
  // Blue, Low = neutral. No off-brand hues.
  const palette: Record<JobPriority, { bg: string; fg: string }> = {
    Urgent: { bg: '#ffe6e8', fg: '#c2001f' },
    High: { bg: '#e7f3fc', fg: '#1f5e8f' },
    Normal: { bg: '#e7e7f5', fg: '#06038d' },
    Low: { bg: '#eef0f4', fg: '#56657d' }
  };

  $: style = priority ? palette[priority as JobPriority] : palette.Normal;
</script>

{#if priority}
  <span class="badge" style:background={style.bg} style:color={style.fg}>{priority}</span>
{/if}

<style>
  .badge {
    display: inline-block;
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }
</style>
