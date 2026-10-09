/**
 * Lead attribution — where a booking came from, for the advertiser's
 * matchback (Mancini Digital's Google Ads landing pages first).
 *
 * Read from the page's query string (the embed snippet forwards the landing
 * page's own UTM tags and Google click ids), carried on the submission, and
 * written onto the ServiceTitan booking as externalData + one summary line.
 * Every value is re-cleaned on the server: it arrives from the open web.
 */
import { writable } from 'svelte/store';

export const ATTRIBUTION_KEYS = [
  'src',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'gclid',
  'gbraid',
  'wbraid'
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];
export type Attribution = Partial<Record<AttributionKey, string>>;

/** Printable, single-line, length-capped. Anything else is dropped. */
function clean(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.replace(/[^\w\-.~:@/+ ]/g, '').trim().slice(0, 150);
  return v || null;
}

export function sanitizeAttribution(raw: unknown): Attribution | null {
  if (!raw || typeof raw !== 'object') return null;
  const out: Attribution = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = clean((raw as Record<string, unknown>)[key]);
    if (v) out[key] = v;
  }
  return Object.keys(out).length ? out : null;
}

export function readAttribution(params: URLSearchParams): Attribution | null {
  const raw: Record<string, string> = {};
  for (const key of ATTRIBUTION_KEYS) {
    const v = params.get(key);
    if (v) raw[key] = v;
  }
  return sanitizeAttribution(raw);
}

/** One readable line for the CSR: "mancini / cpc / roof-glass (Google click id on file)". */
export function describeAttribution(a: Attribution | null | undefined): string | null {
  if (!a) return null;
  const parts = [a.src ?? a.utm_source, a.utm_medium, a.utm_campaign].filter(Boolean);
  const click = a.gclid || a.gbraid || a.wbraid ? ' (Google click id on file)' : '';
  if (!parts.length && !click) return null;
  return `${parts.join(' / ') || 'ad click'}${click}`;
}

/** Set once per page load from the URL; read when the intake is submitted. */
export const attribution = writable<Attribution | null>(null);
