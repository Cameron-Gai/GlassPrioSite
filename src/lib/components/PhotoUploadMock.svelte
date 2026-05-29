<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';

  export let photos: string[];

  function handleFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      // Mock: store the filename only. Real upload would post to storage and save a URL.
      intakeStore.addPhoto(file.name);
    }
    input.value = '';
  }

  function remove(name: string) {
    intakeStore.removePhoto(name);
  }
</script>

<div class="upload">
  <label class="dropzone" for="photoInput">
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3.2" />
        <path d="M8 5l1.5-2h5L16 5" />
      </svg>
    </span>
    <strong>Tap to add photos</strong>
    <span class="hint">Use your camera or library</span>
    <input
      id="photoInput"
      type="file"
      accept="image/*"
      multiple
      capture="environment"
      on:change={handleFiles}
    />
  </label>

  {#if photos.length > 0}
    <ul class="list">
      {#each photos as photo (photo)}
        <li>
          <span class="name" title={photo}>{photo}</span>
          <button type="button" class="remove" on:click={() => remove(photo)}>Remove</button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .upload {
    display: grid;
    gap: 0.65rem;
  }

  .dropzone {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    padding: 1.4rem 1rem;
    border: 1.5px dashed var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-muted);
    text-align: center;
    cursor: pointer;
    transition: border-color 0.15s ease, background 0.15s ease;
  }

  .dropzone:hover {
    border-color: var(--color-primary);
    background: var(--color-surface-tint);
  }

  .dropzone .icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    margin-bottom: 0.3rem;
  }

  .dropzone strong {
    color: var(--color-primary);
  }

  .hint {
    font-size: 0.85rem;
  }

  .dropzone input {
    position: absolute;
    inset: 0;
    opacity: 0;
    cursor: pointer;
  }

  .list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.4rem;
  }

  .list li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 0.75rem;
  }

  .remove {
    color: var(--color-emergency);
    font-weight: 600;
    padding: 0.35rem 0.5rem;
  }
</style>
