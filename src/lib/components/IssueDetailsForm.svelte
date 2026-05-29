<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { IssueDetails, LadderInfo } from '$lib/types/intake';

  export let value: IssueDetails;
  export let showErrors = false;

  function update<K extends keyof IssueDetails>(field: K, raw: IssueDetails[K]) {
    intakeStore.updateIssueDetails({ [field]: raw } as Partial<IssueDetails>);
  }

  function updateLadder<K extends keyof LadderInfo>(field: K, raw: LadderInfo[K]) {
    intakeStore.updateLadder({ [field]: raw } as Partial<LadderInfo>);
  }

  $: errors = {
    serviceLocation: !value.serviceLocation.trim(),
    description: value.description.trim().length < 5,
    happenedAt: !value.happenedAt.trim(),
    ladderStory: value.ladder.required && !value.ladder.story.trim()
  };
</script>

<div class="grid">
  <div>
    <label for="serviceLocation">Where is the issue?</label>
    <input
      id="serviceLocation"
      type="text"
      placeholder="e.g. bedroom right sash, front entrance door"
      value={value.serviceLocation}
      on:input={(event) => update('serviceLocation', event.currentTarget.value)}
    />
    {#if showErrors && errors.serviceLocation}<p class="error">Please describe where the issue is</p>{/if}
  </div>

  <div>
    <label for="description">Describe the damage or scope of work</label>
    <textarea
      id="description"
      rows="3"
      placeholder="What needs to be repaired, replaced, measured, or inspected?"
      value={value.description}
      on:input={(event) => update('description', event.currentTarget.value)}
    ></textarea>
    {#if showErrors && errors.description}<p class="error">Please describe the issue</p>{/if}
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
    {#if showErrors && errors.happenedAt}<p class="error">Please provide a rough timing</p>{/if}
  </div>

  <fieldset class="ladder">
    <legend>Ladder access</legend>
    <p class="legend-help">Will a ladder be needed to reach the work area?</p>
    <div class="toggle">
      <button
        type="button"
        class:active={!value.ladder.required}
        on:click={() => updateLadder('required', false)}
      >
        No
      </button>
      <button
        type="button"
        class:active={value.ladder.required}
        on:click={() => updateLadder('required', true)}
      >
        Yes
      </button>
    </div>
    {#if value.ladder.required}
      <div class="story">
        <label for="story">What story or height?</label>
        <input
          id="story"
          type="text"
          placeholder="e.g. 2nd story, ~15 ft"
          value={value.ladder.story}
          on:input={(event) => updateLadder('story', event.currentTarget.value)}
        />
        {#if showErrors && errors.ladderStory}<p class="error">Please add an approximate height</p>{/if}
      </div>
    {/if}
  </fieldset>

  <fieldset class="conditions">
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
    gap: 1rem;
  }

  textarea {
    resize: vertical;
    min-height: 96px;
  }

  fieldset {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 0.85rem 1rem 0.65rem;
    background: var(--color-surface);
    display: grid;
    gap: 0.5rem;
  }

  legend {
    font-weight: 600;
    color: var(--color-text);
    padding: 0 0.4rem;
  }

  .legend-help {
    margin: 0;
    color: var(--color-muted);
    font-size: 0.88rem;
  }

  .toggle {
    display: inline-flex;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: 3px;
    width: fit-content;
  }

  .toggle button {
    padding: 0.4rem 1.1rem;
    border-radius: 9px;
    font-weight: 600;
    color: var(--color-muted);
    transition: background 0.15s ease, color 0.15s ease;
  }

  .toggle button.active {
    background: var(--color-primary);
    color: #fff;
    box-shadow: var(--shadow-sm);
  }

  .story label {
    margin-bottom: 0.25rem;
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

  .error {
    color: var(--color-emergency);
    margin: 0.3rem 0 0;
    font-size: 0.85rem;
  }
</style>
