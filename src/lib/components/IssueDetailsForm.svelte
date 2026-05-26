<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { IssueDetails } from '$lib/types/intake';

  export let value: IssueDetails;
  export let showErrors = false;

  function update<K extends keyof IssueDetails>(field: K, raw: IssueDetails[K]) {
    intakeStore.updateIssueDetails({ [field]: raw } as Partial<IssueDetails>);
  }

  $: errors = {
    description: value.description.trim().length < 5,
    happenedAt: !value.happenedAt.trim()
  };
</script>

<div class="grid">
  <div>
    <label for="description">Short description of the issue</label>
    <textarea
      id="description"
      rows="3"
      placeholder="What is going on? Where on the property?"
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
    {#if showErrors && errors.happenedAt}<p class="error">Required</p>{/if}
  </div>

  <fieldset>
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
    padding: 0.75rem 1rem 0.5rem;
    background: var(--color-surface);
  }

  legend {
    font-weight: 600;
    color: var(--color-text);
    padding: 0 0.4rem;
  }

  .check {
    display: flex;
    gap: 0.6rem;
    font-weight: 500;
    margin-bottom: 0.45rem;
    color: var(--color-text);
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
