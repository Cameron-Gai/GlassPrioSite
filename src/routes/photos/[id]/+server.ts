import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readPhoto } from '$lib/server/photoStorage';

/**
 * Serve a stored intake photo. IDs are unguessable UUIDs generated at save
 * time; the id pattern is validated in readPhoto, so no path traversal.
 */
export const GET: RequestHandler = async ({ params }) => {
  const bytes = await readPhoto(params.id);
  if (!bytes) {
    throw error(404, 'Photo not found');
  }
  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
};
