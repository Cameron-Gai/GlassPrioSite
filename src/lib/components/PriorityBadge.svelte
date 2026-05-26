<script lang="ts">
  import type { JobPriority } from '$lib/data/jobTypes';

  export let priority: JobPriority | '';

  const palette: Record<JobPriority, { bg: string; fg: string }> = {
    Urgent: { bg: '#fdecea', fg: '#c0392b' },
    High: { bg: '#fff4dc', fg: '#a36100' },
    Normal: { bg: '#e3f0fb', fg: '#0b4f8a' },
    Low: { bg: '#eef0f4', fg: '#5a6578' }
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
