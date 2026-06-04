<script lang="ts">
  import type { ServiceIcon as IconKey } from '$lib/triage/triageTree';

  export let icon: IconKey;
  export let size: number = 28;
</script>

{#if icon === 'glass'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="1.5" />
    <path d="M4 12h16M12 4v16" />
    <path d="M6.5 6.5l3 3" opacity="0.5" />
  </svg>
{:else if icon === 'window'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M3 12h18M12 3v18" />
    <path d="M3 17h18" />
  </svg>
{:else if icon === 'storefront'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 9l1.5-4h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M10 20v-6h4v6" />
    <path d="M4 9h16" />
  </svg>
{:else if icon === 'patio'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="4" y="3" width="7" height="18" rx="1" />
    <rect x="13" y="3" width="7" height="18" rx="1" />
    <path d="M7.5 12h.01M16.5 12h.01" />
  </svg>
{:else if icon === 'shower'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 3v6" />
    <path d="M3 9h14" />
    <path d="M5 13l-1 3M9 13l-1 3M13 13l-1 3" />
    <circle cx="19" cy="6" r="2.5" />
  </svg>
{:else if icon === 'hardware'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="10" cy="14" r="4" />
    <path d="M13 11l7-7" />
    <path d="M17 4l3 3" />
    <path d="M14.5 6.5l3 3" />
  </svg>
{:else if icon === 'multi'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="8" height="8" rx="1" />
    <rect x="13" y="3" width="8" height="8" rx="1" />
    <rect x="3" y="13" width="8" height="8" rx="1" />
    <rect x="13" y="13" width="8" height="8" rx="1" />
  </svg>
{:else if icon === 'measure'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 8l4-4 14 14-4 4z" />
    <path d="M7 8l1 1M10 11l1 1M13 14l1 1M16 17l1 1" />
  </svg>
{:else if icon === 'other'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7" />
    <circle cx="12" cy="17" r="0.6" fill="currentColor" />
  </svg>
{:else if icon === 'emergency-glass'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M4 4l5 4 1 5-3 4 6-2 4 3 3-5-2-5-4-1z" />
    <path d="M9 8l4 5M15 7l-2 6" opacity="0.6" />
  </svg>
{:else if icon === 'emergency-door'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="5" y="3" width="14" height="18" rx="1" />
    <circle cx="15.5" cy="12" r="0.6" fill="currentColor" />
    <path d="M9 8l3 3-3 3" />
  </svg>
{:else if icon === 'emergency-storefront'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M3 9l1.5-4h15L21 9" />
    <path d="M4 9v11h16V9" />
    <path d="M9 20v-9h6v9" />
    <path d="M11 14h2" />
  </svg>
{:else if icon === 'emergency-weather'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 11a4 4 0 1 1 1-7.9 5 5 0 0 1 9.5 1.4A3.5 3.5 0 0 1 18 11H6z" />
    <path d="M8 15l-1 3M12 15l-1 3M16 15l-1 3" />
  </svg>
{:else if icon === 'safe'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
{:else if icon === 'yes'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.5 2.5L16 9.5" />
  </svg>
{:else if icon === 'no'}
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
{/if}

<style>
  svg {
    flex-shrink: 0;
    display: block;
  }
</style>
