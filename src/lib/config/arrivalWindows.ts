/**
 * The arrival windows a customer can pick — THE single definition.
 *
 * CHANNEL PARITY — mirrored in GlassReports/src/lib/intake/arrivalWindows.ts
 * (the employee phone-intake tool). Both channels must offer the same slots,
 * because dispatch books them off the same ServiceTitan board.
 *
 * These mirror the tenant's real ServiceTitan arrival windows, so the site can
 * only ever offer a slot dispatch can actually book:
 *
 *   GET /dispatch/v2/tenant/{t}/arrival-windows   (verified live 2026-08-07)
 *     08:30 for 03:30  ->  8:30am – 12:00pm
 *     10:00 for 04:00  -> 10:00am –  2:00pm
 *     14:00 for 04:00  ->  2:00pm –  6:00pm
 *
 * Previously this site offered 8–11 / 11–2 / 2–5, derived from shop hours
 * rather than from the board — they matched nothing in ServiceTitan, so a
 * booked "Morning" started at 8:00 when the first real slot was 8:30, and the
 * promise we made the customer was one dispatch could not keep.
 *
 * WHY ONE MODULE: these hours were duplicated in the window picker and in the
 * booking start-time derivation. That duplication is exactly how they drift
 * apart. Everything derives from ARRIVAL_WINDOWS now — if ServiceTitan's
 * windows change, this list is the only edit.
 *
 * Note the windows OVERLAP (8:30–12 and 10–2). That is ServiceTitan's own
 * configuration, not a mistake here. They also run past the 5pm shop close in
 * businessHours.ts — the board is the authority on arrival, not the counter.
 */

export interface ArrivalWindow {
  /** Stable key stored on the intake and matched against later. */
  id: 'morning' | 'midday' | 'afternoon';
  /** What the customer taps, and what dispatch reads back on the booking. */
  label: string;
  /** Previously-used labels, so a saved draft still resolves. */
  aliases: readonly string[];
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
}

/**
 * LABELLED BY TIME, not time of day (owner 2026-08-07).
 *
 * ServiceTitan's windows overlap — 8:30–12 and 10–2 share two hours — so names
 * like "Morning" and "Midday" implied a distinction that does not exist, and a
 * customer offered both had no way to tell them apart. The hours ARE the
 * difference, so the hours are the label.
 */
export const ARRIVAL_WINDOWS: readonly ArrivalWindow[] = [
  {
    id: 'morning',
    label: '8:30am–12pm',
    aliases: ['Morning (8:30am–12pm)', 'Morning (8am–11am)'],
    startHour: 8,
    startMinute: 30,
    endHour: 12,
    endMinute: 0
  },
  {
    id: 'midday',
    label: '10am–2pm',
    aliases: ['Midday (10am–2pm)', 'Midday (11am–2pm)'],
    startHour: 10,
    startMinute: 0,
    endHour: 14,
    endMinute: 0
  },
  {
    id: 'afternoon',
    label: '2pm–6pm',
    aliases: ['Afternoon (2pm–6pm)', 'Afternoon (2pm–5pm)'],
    startHour: 14,
    startMinute: 0,
    endHour: 18,
    endMinute: 0
  }
] as const;

export const ARRIVAL_WINDOW_LABELS: readonly string[] = ARRIVAL_WINDOWS.map((w) => w.label);

/**
 * Resolve a stored window value to its definition.
 *
 * Current label, then a known former label, then the leading word. Drafts live
 * 24h, so an old value only matters for a day after a relabel — but that is the
 * day a customer is mid-form, and silently defaulting to the 8:30 window would
 * book the wrong time.
 */
export function findArrivalWindow(value: string | null | undefined): ArrivalWindow | null {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const exact = ARRIVAL_WINDOWS.find((w) => w.label === raw);
  if (exact) return exact;
  const lower = raw.toLowerCase();
  const aliased = ARRIVAL_WINDOWS.find((w) => w.aliases.some((a) => a.toLowerCase() === lower));
  if (aliased) return aliased;
  return ARRIVAL_WINDOWS.find((w) => lower.startsWith(w.id)) ?? null;
}

/** Canonical label for a stored value, or '' when it resolves to nothing.
 *  Used to heal a draft saved under an older label. */
export function canonicalArrivalWindow(value: string | null | undefined): string {
  return findArrivalWindow(value)?.label ?? '';
}

/** Start time to book for a chosen window. Defaults to the first window. */
export function arrivalWindowStart(value: string | null | undefined): [number, number] {
  const w = findArrivalWindow(value) ?? ARRIVAL_WINDOWS[0];
  return [w.startHour, w.startMinute];
}
