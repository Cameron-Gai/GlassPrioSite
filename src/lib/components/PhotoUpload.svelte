<script lang="ts">
  import { intakeStore } from '$lib/stores/intakeStore';
  import type { UploadedPhoto } from '$lib/types/intake';

  export let photos: UploadedPhoto[];

  // Keep request bodies sane: phone photos are multi-MB, so downscale + JPEG
  // compress in the browser before they ever hit our server or ServiceTitan.
  const MAX_DIMENSION = 1600; // px on the longest edge
  const JPEG_QUALITY = 0.72;
  const MAX_PHOTOS = 6;

  let working = false;
  let errorMessage = '';

  function loadImage(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not read image'));
      };
      img.src = url;
    });
  }

  async function compress(file: File): Promise<string> {
    const img = await loadImage(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  }

  async function handleFiles(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    errorMessage = '';
    working = true;
    try {
      for (const file of Array.from(files)) {
        if (photos.length >= MAX_PHOTOS) {
          errorMessage = `You can add up to ${MAX_PHOTOS} photos.`;
          break;
        }
        if (!file.type.startsWith('image/')) {
          errorMessage = 'Only image files are supported.';
          continue;
        }
        const dataUrl = await compress(file);
        // Unique id, not the file name — camera rolls hand every pick "image.jpg".
        intakeStore.addPhoto({ id: crypto.randomUUID(), name: file.name, dataUrl });
      }
    } catch {
      errorMessage = 'One of those photos could not be processed. Try another.';
    } finally {
      working = false;
      input.value = '';
    }
  }

  function remove(id: string) {
    intakeStore.removePhoto(id);
  }
</script>

<div class="upload">
  <label class="dropzone" for="photoInput" class:busy={working}>
    <span class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3.2" />
        <path d="M8 5l1.5-2h5L16 5" />
      </svg>
    </span>
    <strong>{working ? 'Processing…' : 'Tap to add photos'}</strong>
    <span class="hint">Use your camera or library</span>
    <input
      id="photoInput"
      type="file"
      accept="image/*"
      multiple
      capture="environment"
      disabled={working}
      on:change={handleFiles}
    />
  </label>

  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  {#if photos.length > 0}
    <ul class="list">
      {#each photos as photo (photo.id)}
        <li>
          <img class="thumb" src={photo.dataUrl} alt={photo.name} />
          <span class="name" title={photo.name}>{photo.name}</span>
          <button type="button" class="remove" on:click={() => remove(photo.id)}>Remove</button>
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

  .dropzone.busy {
    cursor: progress;
    opacity: 0.8;
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
    gap: 0.65rem;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface);
  }

  .thumb {
    width: 40px;
    height: 40px;
    object-fit: cover;
    border-radius: 6px;
    flex-shrink: 0;
  }

  .name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .remove {
    color: var(--color-emergency);
    font-weight: 600;
    padding: 0.35rem 0.5rem;
  }

  .error {
    margin: 0;
    color: var(--color-emergency);
    font-size: 0.85rem;
  }
</style>
