import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '$env/dynamic/private';
import type { UploadedPhoto } from '$lib/types/intake';

/**
 * Self-hosted photo storage for intake submissions.
 *
 * ServiceTitan's public bookings API cannot carry images (verified live:
 * uploadedImages stores opaque strings the UI can't render, and no existing
 * integration in the tenant uses it). Instead we persist compressed JPEGs to
 * disk — a Railway volume in production — at unguessable UUID paths and put
 * the public URLs in the booking summary for the CSR to click.
 */

const STORAGE_DIR = env.PHOTO_STORAGE_DIR || 'data/photos';

/** Strict id check — serving path rejects anything but our UUID names. */
const PHOTO_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export interface StoredPhoto {
  id: string;
  url: string;
  originalName: string;
}

function decodeDataUrl(dataUrl: string): Buffer | null {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return null;
  try {
    return Buffer.from(dataUrl.slice(comma + 1), 'base64');
  } catch {
    return null;
  }
}

/** Public origin for photo links: Railway domain when present, else the request origin. */
export function publicOrigin(requestOrigin: string): string {
  const domain = env.RAILWAY_PUBLIC_DOMAIN;
  return domain ? `https://${domain}` : requestOrigin;
}

export async function savePhotos(
  photos: UploadedPhoto[],
  origin: string
): Promise<StoredPhoto[]> {
  if (photos.length === 0) return [];
  await mkdir(STORAGE_DIR, { recursive: true });

  const stored: StoredPhoto[] = [];
  for (const photo of photos) {
    const bytes = decodeDataUrl(photo.dataUrl);
    if (!bytes || bytes.length === 0) continue;
    const id = crypto.randomUUID();
    await writeFile(join(STORAGE_DIR, `${id}.jpg`), bytes);
    stored.push({
      id,
      url: `${origin}/photos/${id}`,
      originalName: photo.name
    });
  }
  return stored;
}

export async function readPhoto(id: string): Promise<Buffer | null> {
  if (!PHOTO_ID_PATTERN.test(id)) return null;
  try {
    return await readFile(join(STORAGE_DIR, `${id}.jpg`));
  } catch {
    return null;
  }
}
