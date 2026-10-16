<script lang="ts">
  import IntakeWizard from '$lib/components/IntakeWizard.svelte';
  import IntakeLayout from '$lib/components/IntakeLayout.svelte';
  import { describeBusinessHours, isBusinessHours } from '$lib/utils/businessHours';
  import { onMount } from 'svelte';
  import { attribution, readAttribution } from '$lib/attribution';

  const hoursDescription = describeBusinessHours();
  const openNow = isBusinessHours();

  // Ad links straight to the site carry their UTM tags / click ids onto the booking too.
  onMount(() => attribution.set(readAttribution(new URLSearchParams(window.location.search))));
</script>

<svelte:head>
  <title>Glass Doctor — Request Service</title>
  <meta
    name="description"
    content="Glass Doctor — request glass, window, door, or hardware service. Urgent issues are dispatched the same day."
  />
</svelte:head>

<IntakeLayout {openNow} {hoursDescription}>
  <IntakeWizard />
</IntakeLayout>
