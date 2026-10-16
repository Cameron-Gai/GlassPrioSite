import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

/**
 * The ad partner's tracking code (Mancini Digital's conversion snippet), pasted
 * verbatim into the AD_TRACKING_SNIPPET env var and rendered unaltered in this
 * page's <head> — Mike's code counts the lead when the visitor lands here, and
 * it must not be edited. Env, not source, so it can go live (or be swapped)
 * without a code change. It's server-rendered, so its scripts run on load.
 */
export const load: PageServerLoad = () => ({
  trackingSnippet: env.AD_TRACKING_SNIPPET?.trim() || ''
});
