/**
 * Client-side error detection for the intake wizard.
 *
 * A small in-memory log of everything that went wrong in this session —
 * uncaught exceptions, unhandled promise rejections, and errors the wizard
 * catches itself (submit failures, payment setup failures). The bug-report
 * button subscribes to it: when anything lands here the button lights up, and
 * the entries ride along on the report so the office sees the actual failure,
 * not just the customer's description of it.
 *
 * Deliberately NOT a telemetry pipeline — nothing is sent anywhere until the
 * customer chooses to send a report.
 */
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

export interface ClientErrorEntry {
  /** ISO timestamp, client clock. */
  at: string;
  /** Where it came from: 'window' | 'promise' | 'submit' | 'payment' | ... */
  source: string;
  message: string;
}

/** Keep the log small — the first errors are the interesting ones, and the
 *  report payload must stay bounded. */
const MAX_ENTRIES = 20;
const MAX_MESSAGE = 500;

export const errorLog = writable<ClientErrorEntry[]>([]);

export const hasClientErrors = derived(errorLog, (log) => log.length > 0);

/** Record an error the wizard caught itself. Safe to call from anywhere. */
export function reportClientError(source: string, message: unknown): void {
  const text = String(
    message instanceof Error ? message.message : (message ?? 'Unknown error')
  ).slice(0, MAX_MESSAGE);
  if (!text.trim()) return;
  errorLog.update((log) => {
    // Collapse exact repeats (a re-render loop must not flood the log).
    if (log.length && log[log.length - 1].source === source && log[log.length - 1].message === text) {
      return log;
    }
    const next = [...log, { at: new Date().toISOString(), source, message: text }];
    return next.length > MAX_ENTRIES ? next.slice(next.length - MAX_ENTRIES) : next;
  });
}

let installed = false;

/**
 * Global listeners for the failures nothing catches: uncaught exceptions and
 * unhandled rejections (e.g. Stripe.js failing to load, a render error).
 * Idempotent — the wizard mounts once, but hot reload must not stack them.
 */
export function installGlobalErrorListeners(): void {
  if (!browser || installed) return;
  installed = true;
  window.addEventListener('error', (event) => {
    // Resource-load errors (img/script tags) surface as plain Events with no
    // message — report those by target instead of dropping them.
    if (event.message) {
      reportClientError('window', event.message);
    } else {
      const el = event.target as Element | null;
      const what = el?.tagName ? `${el.tagName.toLowerCase()} failed to load` : 'resource failed to load';
      reportClientError('resource', what);
    }
  }, true);
  window.addEventListener('unhandledrejection', (event) => {
    reportClientError('promise', event.reason instanceof Error ? event.reason.message : String(event.reason ?? 'Unhandled rejection'));
  });
}
