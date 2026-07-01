import { getServiceTitanConfig } from './config';
import { pingServiceTitanAuth } from './client';

/**
 * "Is ServiceTitan reachable right now?" gate for the intake form. The operator's
 * rule: if ServiceTitan is down, don't let anyone fill out the form — route them
 * to the phone instead. We cache the result briefly so we don't ping auth on
 * every page load.
 *
 * When ServiceTitan isn't configured at all (local dev / preview), we report
 * ready:true so the mock-booking path still works.
 */
const HEALTH_TTL_MS = 60_000;
let cache: { ready: boolean; checkedAtMs: number } | null = null;

export async function isServiceTitanReady(nowMs: number = Date.now()): Promise<boolean> {
  const config = getServiceTitanConfig();
  if (!config) return true; // not configured → dev/preview; don't block the form

  if (cache && nowMs - cache.checkedAtMs < HEALTH_TTL_MS) return cache.ready;

  const ready = await pingServiceTitanAuth(config);
  cache = { ready, checkedAtMs: nowMs };
  return ready;
}
