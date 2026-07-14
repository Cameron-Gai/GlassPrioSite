<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { CategoryDetails, IssueDetails, WindowAccessInfo } from '$lib/types/intake';
  import type { JobType } from '$lib/data/jobTypes';

  export let value: IssueDetails;
  export let job: JobType | null;

  $: category = job?.category ?? '';

  function update<K extends keyof IssueDetails>(field: K, raw: IssueDetails[K]) {
    intakeStore.updateIssueDetails({ [field]: raw } as Partial<IssueDetails>);
  }

  function updateWindowAccess<K extends keyof WindowAccessInfo>(field: K, raw: WindowAccessInfo[K]) {
    intakeStore.updateWindowAccess({ [field]: raw } as Partial<WindowAccessInfo>);
  }

  function updateCategory<K extends keyof CategoryDetails>(field: K, raw: CategoryDetails[K]) {
    intakeStore.updateCategoryDetails({ [field]: raw } as Partial<CategoryDetails>);
  }

  const doorOperationalOptions: Array<'yes' | 'no' | 'unsure'> = ['yes', 'no', 'unsure'];
  const blockedOptions: Array<{ value: 'no' | 'yes' | 'unsure'; label: string }> = [
    { value: 'no', label: 'No' },
    { value: 'yes', label: 'Yes' },
    { value: 'unsure', label: 'Unsure' }
  ];

  $: details = value.categoryDetails;

  // Progressive disclosure: the description is the hero; the typed secondary
  // fields (where / when / window access) live behind "Add more detail".
  // Auto-open when any of them already hold values (draft restore, back
  // navigation, edit-from-review) so nothing ever looks lost.
  let showMore =
    value.serviceLocation.trim() !== '' ||
    value.happenedAt.trim() !== '' ||
    value.windowAccess.floors.trim() !== '' ||
    value.windowAccess.blocked !== 'no';

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
  <!-- Hero: the one field that matters most. Everything on this step is optional. -->
  <div>
    <label for="description">Describe the issue</label>
    <textarea
      id="description"
      class="hero"
      rows="4"
      placeholder={descriptionPrompt}
      value={value.description}
      on:input={(event) => update('description', event.currentTarget.value)}
    ></textarea>
    <p class="hint">
      Details help us send the right person with the right materials.
    </p>
  </div>

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

  <!-- Tap-only safety flags stay visible — they matter for dispatch. -->
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

  <!-- Everything typed-and-optional folds away here. -->
  <div class="more">
    <button
      type="button"
      class="more-toggle"
      aria-expanded={showMore}
      on:click={() => (showMore = !showMore)}
    >
      <span class="more-chev" aria-hidden="true" data-open={showMore}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </span>
      <span class="more-label">
        {showMore ? 'Hide extra detail' : 'Add more detail'}
        <span class="more-sub">where it is, when it happened, window access — all optional</span>
      </span>
    </button>

    {#if showMore}
      <div class="more-body fade-in">
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
          <legend>Window location &amp; access</legend>
          <div>
            <label for="floors">What floor(s) is the window on?</label>
            <input
              id="floors"
              type="text"
              placeholder="e.g. ground floor, 2nd story, floors 3–4"
              value={value.windowAccess.floors}
              on:input={(event) => updateWindowAccess('floors', event.currentTarget.value)}
            />
          </div>
          <div>
            <span class="pseudo-label">Is there anything blocking access to it/them?</span>
            <div class="segmented" role="radiogroup" aria-label="Anything blocking access">
              {#each blockedOptions as opt (opt.value)}
                <button
                  type="button"
                  role="radio"
                  aria-checked={value.windowAccess.blocked === opt.value}
                  class:active={value.windowAccess.blocked === opt.value}
                  on:click={() => updateWindowAccess('blocked', opt.value)}
                >
                  {opt.label}
                </button>
              {/each}
            </div>
          </div>
          {#if value.windowAccess.blocked === 'yes'}
            <div>
              <label for="blockedNotes">What's blocking access?</label>
              <input
                id="blockedNotes"
                type="text"
                placeholder="e.g. landscaping, furniture, locked gate, parked vehicles"
                value={value.windowAccess.blockedNotes}
                on:input={(event) => updateWindowAccess('blockedNotes', event.currentTarget.value)}
              />
            </div>
          {:else if value.windowAccess.blocked === 'unsure'}
            <p class="legend-help">
              No problem — a photo of the area helps our team plan access. You can add one on the next step.
            </p>
          {/if}
        </fieldset>
      </div>
    {/if}
  </div>
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

  textarea.hero {
    min-height: 120px;
  }

  .hint {
    margin: 0.4rem 0 0;
    color: var(--color-muted);
    font-size: 0.86rem;
    line-height: 1.45;
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

  .more {
    display: grid;
    gap: 0.85rem;
  }

  .more-toggle {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    text-align: left;
    padding: 0.75rem 0.9rem;
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface-tint);
    transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
  }

  .more-toggle:hover {
    border-color: var(--color-primary);
  }

  .more-toggle:active {
    transform: scale(0.99);
  }

  .more-chev {
    display: inline-flex;
    color: var(--color-primary);
    margin-top: 0.15rem;
    transition: transform 0.18s ease;
  }

  .more-chev[data-open='true'] {
    transform: rotate(90deg);
  }

  .more-label {
    display: grid;
    gap: 0.1rem;
    font-weight: 700;
    color: var(--color-primary);
    font-size: 0.95rem;
  }

  .more-sub {
    font-weight: 500;
    font-size: 0.82rem;
    color: var(--color-muted);
  }

  .more-body {
    display: grid;
    gap: 1.05rem;
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
