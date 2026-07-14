<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import { canUpgradeToPriority } from '$lib/triage/triageTree';
  import { getPublicJobType } from '$lib/data/jobTypes';
  import { businessHours, type WeekdayKey } from '$lib/config/businessHours';
  import PriorityBadge from './PriorityBadge.svelte';
  import type { SchedulingPreference } from '$lib/types/intake';

  export let value: SchedulingPreference;

  const priority = getPublicJobType('Priority Service (Business Hours)');

  const WEEKDAY_KEYS: WeekdayKey[] = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday'
  ];

  /** Concrete day choices: the next 5 open business days, starting tomorrow.
   *  Stored as a local YYYY-MM-DD; the server books it as a Pacific wall-clock
   *  day (customers are local to the shop). */
  interface DayOption {
    value: string;
    label: string;
    sublabel: string;
  }

  function buildDayOptions(): DayOption[] {
    const out: DayOption[] = [];
    const today = new Date();
    for (let i = 1; out.length < 5 && i <= 14; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i);
      const key = WEEKDAY_KEYS[d.getDay()];
      if (!businessHours.days[key]) continue; // closed that day (Sundays)
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      out.push({
        value: iso,
        label: i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' }),
        sublabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    return out;
  }

  const dayOptions = buildDayOptions();

  // Arrival windows match business hours (8am–5pm Pacific).
  const arrivalWindows = ['Morning (8am–11am)', 'Midday (11am–2pm)', 'Afternoon (2pm–5pm)'];

  $: state = $intakeStore;
  // Priority availability keys off the ORIGINAL job — choosing it swaps
  // selectedJobType to Priority Service, which is itself not upgradeable.
  $: canPriority = !state.isEmergency && canUpgradeToPriority(state.originalJobType ?? state.selectedJobType);
  $: priorityChosen = state.priorityUpgrade;
  $: chosenWindow = state.specialInstructions.preferredWindow;

  function choosePriority() {
    intakeStore.acceptPriorityUpgrade();
    intakeStore.setSchedulingPreference('');
  }

  function selectDay(option: string) {
    if (priorityChosen) intakeStore.declinePriorityUpgrade();
    intakeStore.setSchedulingPreference(option);
  }

  function selectWindow(window: string) {
    // Toggle: tapping the active window clears it back to "any time".
    intakeStore.updateSpecialInstructions({
      preferredWindow: chosenWindow === window ? '' : window
    });
  }
</script>

{#if state.isEmergency}
  <p class="emergency-note">
    This is an urgent request — there's no need to pick a window. A dispatcher will reach out right
    away to confirm and send a professional as fast as possible.
  </p>
{:else}
  <div class="grid">
    {#if canPriority}
      <button
        type="button"
        class="tile priority"
        class:active={priorityChosen}
        on:click={choosePriority}
      >
        <span class="tile-head">
          <span class="tile-title">Priority Service</span>
          <PriorityBadge priority="Urgent" />
        </span>
        <span class="tile-desc">A professional on-site within 2 hours during business hours.</span>
        <span class="chips">
          <span class="chip price">{priority.pricing?.display ?? '$399'}</span>
          {#if priority.pricing?.rebate}
            <span class="chip rebate">{priority.pricing.rebate}</span>
          {/if}
        </span>
        {#if priorityChosen}
          <span class="tile-selected">✓ Selected — review the charge on the next step.</span>
        {/if}
      </button>
    {/if}

    <fieldset class="picker">
      <legend>Pick a day that works for you</legend>
      <div class="day-row" role="radiogroup" aria-label="Requested day">
        {#each dayOptions as day (day.value)}
          <button
            type="button"
            role="radio"
            aria-checked={!priorityChosen && value === day.value}
            class="day"
            class:active={!priorityChosen && value === day.value}
            on:click={() => selectDay(day.value)}
          >
            <span class="day-label">{day.label}</span>
            <span class="day-sub">{day.sublabel}</span>
          </button>
        {/each}
        <button
          type="button"
          role="radio"
          aria-checked={!priorityChosen && value === 'flexible'}
          class="day flexible"
          class:active={!priorityChosen && value === 'flexible'}
          on:click={() => selectDay('flexible')}
        >
          <span class="day-label">Flexible</span>
          <span class="day-sub">First available</span>
        </button>
      </div>
    </fieldset>

    {#if value && value !== 'flexible' && !priorityChosen}
      <fieldset class="picker">
        <legend>Preferred arrival window <span class="optional">optional</span></legend>
        <div class="window-row" role="radiogroup" aria-label="Preferred arrival window">
          {#each arrivalWindows as window (window)}
            <button
              type="button"
              role="radio"
              aria-checked={chosenWindow === window}
              class="window"
              class:active={chosenWindow === window}
              on:click={() => selectWindow(window)}
            >
              {window}
            </button>
          {/each}
        </div>
      </fieldset>
    {/if}

    <p class="disclaimer">
      This is a request, not a confirmed appointment — our team will confirm your time. If your
      requested day or window doesn't work out, we'll contact you to find one that does.
    </p>
  </div>
{/if}

<style>
  .emergency-note {
    margin: 0;
    padding: 0.85rem 1rem;
    border-radius: var(--radius-md);
    background: var(--color-emergency-bg);
    color: var(--color-emergency);
    font-weight: 600;
    line-height: 1.45;
  }

  .grid {
    display: grid;
    gap: 0.85rem;
  }

  .picker {
    border: 0;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }

  legend {
    padding: 0;
    font-weight: 600;
    font-size: 0.92rem;
    color: var(--color-text);
    margin-bottom: 0.15rem;
  }

  .optional {
    font-weight: 500;
    font-size: 0.78rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    margin-left: 0.3rem;
  }

  .day-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
    gap: 0.5rem;
  }

  .day {
    display: grid;
    gap: 0.1rem;
    justify-items: center;
    padding: 0.6rem 0.4rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .day:hover {
    border-color: var(--color-primary);
  }

  .day:active {
    transform: scale(0.97);
  }

  .day.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
  }

  .day-label {
    font-weight: 700;
    font-size: 0.92rem;
    color: var(--color-text);
  }

  .day-sub {
    font-size: 0.78rem;
    color: var(--color-muted);
  }

  .window-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .window {
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    font-weight: 600;
    font-size: 0.86rem;
    color: var(--color-text);
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .window:hover {
    border-color: var(--color-primary);
  }

  .window:active {
    transform: scale(0.96);
  }

  .window.active {
    border-color: var(--color-primary);
    background: var(--color-primary-soft);
    color: var(--color-primary);
  }

  .disclaimer {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--color-muted);
  }

  /* Priority is a peer timing option, styled to stand out as the premium pick. */
  .tile.priority {
    display: grid;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    border: 1.5px solid var(--color-primary);
    border-radius: var(--radius-md);
    background: linear-gradient(180deg, var(--color-primary-soft), #ffffff 80%);
    box-shadow: var(--shadow-sm);
    text-align: left;
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .tile.priority:active {
    transform: scale(0.99);
  }

  .tile.priority.active {
    border-color: var(--color-accent);
    background: var(--color-accent-bg);
  }

  .tile-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .tile-title {
    font-weight: 700;
    font-size: 1.02rem;
  }

  .tile-desc {
    font-weight: 500;
    font-size: 0.9rem;
    color: var(--color-text);
  }

  .chips {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }

  .chip {
    padding: 0.25rem 0.65rem;
    border-radius: 999px;
    font-size: 0.78rem;
    font-weight: 700;
  }

  .chip.price {
    background: var(--color-primary);
    color: #fff;
  }

  .chip.rebate {
    background: var(--color-accent-bg);
    color: var(--color-accent);
  }

  .tile-selected {
    font-weight: 600;
    color: var(--color-accent);
    font-size: 0.9rem;
  }
</style>
