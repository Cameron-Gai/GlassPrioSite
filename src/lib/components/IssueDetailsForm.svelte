<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { CategoryDetails, IssueDetails, LadderInfo } from '$lib/types/intake';
  import type { JobType } from '$lib/data/jobTypes';

  export let value: IssueDetails;
  export let job: JobType | null;

  $: category = job?.category ?? '';

  function update<K extends keyof IssueDetails>(field: K, raw: IssueDetails[K]) {
    intakeStore.updateIssueDetails({ [field]: raw } as Partial<IssueDetails>);
  }

  function updateLadder<K extends keyof LadderInfo>(field: K, raw: LadderInfo[K]) {
    intakeStore.updateLadder({ [field]: raw } as Partial<LadderInfo>);
  }

  function updateCategory<K extends keyof CategoryDetails>(field: K, raw: CategoryDetails[K]) {
    intakeStore.updateCategoryDetails({ [field]: raw } as Partial<CategoryDetails>);
  }

  const doorOperationalOptions: Array<'yes' | 'no' | 'unsure'> = ['yes', 'no', 'unsure'];
  const ladderOptions: Array<{ value: 'no' | 'yes' | 'unsure'; label: string }> = [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
    { value: 'unsure', label: 'Unsure' }
  ];

  $: details = value.categoryDetails;

  $: locationPlaceholder = (() => {
    switch (category) {
      case 'storefront-door':
        return 'e.g. front entrance, side entry door, office storefront';
      case 'shower-mirror':
        return 'e.g. master bathroom shower, guest bath vanity mirror';
      case 'patio-pet-door':
        return 'e.g. back patio, mudroom';
      case 'hardware':
        return 'e.g. front door deadbolt, bedroom window lock';
      default:
        return 'e.g. bedroom right sash, front entrance door';
    }
  })();

  $: descriptionPrompt = (() => {
    switch (category) {
      case 'glass-replacement':
        return 'Describe the damage and how the glass broke or fogged.';
      case 'window-replacement':
        return 'Describe the windows and what condition they’re in.';
      case 'storefront-door':
        return 'Describe the storefront, doors, glass, and any damage.';
      case 'hardware':
        return 'Describe what the hardware is doing (or not doing).';
      case 'shower-mirror':
        return 'Describe your current setup and what you want.';
      case 'multiservice':
        return 'A short summary of what needs to be done overall.';
      default:
        return 'What needs to be repaired, replaced, measured, or inspected?';
    }
  })();

</script>

<div class="grid">
  <!-- Category-specific scope (storefront / shower-mirror / multi / hardware) -->
  {#if category === 'storefront-door'}
    <fieldset class="block">
      <legend>Storefront scope</legend>
      <div>
        <label for="storefrontScope">What needs to be replaced or upgraded?</label>
        <input
          id="storefrontScope"
          type="text"
          placeholder="Framing, doors, glass, hardware, or the full system"
          value={details.storefrontScope ?? ''}
          on:input={(event) => updateCategory('storefrontScope', event.currentTarget.value)}
        />
      </div>
      <div>
        <span class="pseudo-label">Is the door currently operational?</span>
        <div class="segmented" role="radiogroup" aria-label="Door operational">
          {#each doorOperationalOptions as opt (opt)}
            <button
              type="button"
              role="radio"
              aria-checked={details.doorOperational === opt}
              class:active={details.doorOperational === opt}
              on:click={() => updateCategory('doorOperational', opt)}
            >
              {opt === 'yes' ? 'Yes' : opt === 'no' ? 'No' : 'Not sure'}
            </button>
          {/each}
        </div>
      </div>
    </fieldset>
  {/if}

  {#if category === 'shower-mirror'}
    <fieldset class="block">
      <legend>Shower / mirror details</legend>
      <div>
        <label for="showerMirrorType">Type wanted</label>
        <input
          id="showerMirrorType"
          type="text"
          placeholder="Frameless, semi-frameless, or framed shower / wall, vanity, gym mirror"
          value={details.showerMirrorType ?? ''}
          on:input={(event) => updateCategory('showerMirrorType', event.currentTarget.value)}
        />
      </div>
      <div>
        <label for="approximateSize">Approximate size</label>
        <input
          id="approximateSize"
          type="text"
          placeholder="e.g. 60in x 72in, full wall, vanity-width"
          value={details.approximateSize ?? ''}
          on:input={(event) => updateCategory('approximateSize', event.currentTarget.value)}
        />
      </div>
      <p class="virtual-note">
        <span aria-hidden="true">📷</span>
        We’ll do a virtual consultation using your photos. Make sure to upload a few clear shots on the
        next step.
      </p>
    </fieldset>
  {/if}

  {#if category === 'multiservice'}
    <fieldset class="block">
      <legend>Services to include</legend>
      <div>
        <label for="multiServiceList">Which services should we combine?</label>
        <textarea
          id="multiServiceList"
          rows="2"
          placeholder="e.g. 1) Front door hardware, 2) Master bath shower, 3) Patio glass"
          value={details.multiServiceList ?? ''}
          on:input={(event) => updateCategory('multiServiceList', event.currentTarget.value)}
        ></textarea>
      </div>
    </fieldset>
  {/if}

  {#if category === 'hardware'}
    <fieldset class="block">
      <legend>Hardware problem</legend>
      <div>
        <label for="hardwareProblem">What is the hardware doing (or not doing)?</label>
        <textarea
          id="hardwareProblem"
          rows="2"
          placeholder="e.g. won't latch, lock spins freely, roller is broken"
          value={details.hardwareProblem ?? ''}
          on:input={(event) => updateCategory('hardwareProblem', event.currentTarget.value)}
        ></textarea>
      </div>
    </fieldset>
  {/if}

  <!-- Standard intake -->
  <p class="nudge">
    The more you can share, the faster we can help — details and photos let us send the right person
    with the right materials. None of the fields below are required.
  </p>

  <div>
    <label for="serviceLocation">Where is the issue?</label>
    <input
      id="serviceLocation"
      type="text"
      placeholder={locationPlaceholder}
      value={value.serviceLocation}
      on:input={(event) => update('serviceLocation', event.currentTarget.value)}
    />
  </div>

  <div>
    <label for="description">Tell us more</label>
    <textarea
      id="description"
      rows="3"
      placeholder={descriptionPrompt}
      value={value.description}
      on:input={(event) => update('description', event.currentTarget.value)}
    ></textarea>
  </div>

  <div>
    <label for="happenedAt">When did this happen?</label>
    <input
      id="happenedAt"
      type="text"
      placeholder="Today around 2pm, last night, last week..."
      value={value.happenedAt}
      on:input={(event) => update('happenedAt', event.currentTarget.value)}
    />
  </div>

  <fieldset class="block">
    <legend>Ladder access</legend>
    <p class="legend-help">Will a ladder be needed to reach the work area?</p>
    <div class="segmented" role="radiogroup" aria-label="Ladder needed">
      {#each ladderOptions as opt (opt.value)}
        <button
          type="button"
          role="radio"
          aria-checked={value.ladder.access === opt.value}
          class:active={value.ladder.access === opt.value}
          on:click={() => updateLadder('access', opt.value)}
        >
          {opt.label}
        </button>
      {/each}
    </div>
    {#if value.ladder.access === 'yes'}
      <div>
        <label for="story">What story or height?</label>
        <input
          id="story"
          type="text"
          placeholder="e.g. 2nd story, ~15 ft"
          value={value.ladder.story}
          on:input={(event) => updateLadder('story', event.currentTarget.value)}
        />
      </div>
    {:else if value.ladder.access === 'unsure'}
      <p class="legend-help">
        No problem — a photo of the area from outside helps us judge the reach. You can add one on
        the next step.
      </p>
    {/if}
  </fieldset>

  <fieldset class="block">
    <legend>Site conditions</legend>
    <label class="check">
      <input
        type="checkbox"
        checked={value.isSecure}
        on:change={(event) => update('isSecure', event.currentTarget.checked)}
      />
      <span>The opening is currently secure</span>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={value.hasBrokenGlass}
        on:change={(event) => update('hasBrokenGlass', event.currentTarget.checked)}
      />
      <span>There is broken glass on site</span>
    </label>
    <label class="check">
      <input
        type="checkbox"
        checked={value.hasWaterOrWeatherEntry}
        on:change={(event) => update('hasWaterOrWeatherEntry', event.currentTarget.checked)}
      />
      <span>Water or weather is entering the property</span>
    </label>
  </fieldset>
</div>

<style>
  .grid {
    display: grid;
    gap: 1.05rem;
  }

  textarea {
    resize: vertical;
    min-height: 96px;
  }

  fieldset.block {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.95rem 1.1rem 0.85rem;
    background: var(--color-surface);
    display: grid;
    gap: 0.65rem;
  }

  legend {
    font-weight: 700;
    color: var(--color-text);
    padding: 0 0.4rem;
    font-size: 0.92rem;
  }

  .legend-help {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.88rem;
  }

  .pseudo-label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: var(--color-text);
    margin-bottom: 0.4rem;
  }

  .segmented {
    display: inline-flex;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 3px;
    width: fit-content;
    gap: 2px;
  }

  .segmented button {
    padding: 0.45rem 1.1rem;
    border-radius: 10px;
    font-weight: 600;
    color: var(--color-muted);
    transition: background 0.18s ease, color 0.18s ease;
  }

  .segmented button.active {
    background: var(--color-primary);
    color: #fff;
    box-shadow: var(--shadow-sm);
  }

  .check {
    display: flex;
    gap: 0.6rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0;
  }

  .check input {
    width: auto;
    margin: 0;
  }

  .nudge {
    margin: 0;
    padding: 0.7rem 0.85rem;
    background: var(--color-primary-soft);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .virtual-note {
    margin: 0;
    padding: 0.55rem 0.7rem;
    background: var(--color-primary-soft);
    border-radius: var(--radius-sm);
    color: var(--color-text);
    font-size: 0.88rem;
  }
</style>
