/**
 * Booking `start` derivation: turns the intake's soft scheduling answers
 * ("This week" / "Next week" / "Flexible" + a preferred arrival window) into
 * the earliest consistent RFC3339 instant, in the shop's time zone. Advisory —
 * the CSR confirms the real appointment at conversion — but it prefills the
 * Start Date on ServiceTitan's booking screen instead of a null date.
 *
 * Kept free of SvelteKit-only imports so it can be executed directly.
 */

/** The shop's time zone; ServiceTitan expects real instants, customers pick wall-clock windows. */
const PACIFIC_TZ = 'America/Los_Angeles';

/** Wall-clock parts of `instant` in the shop's time zone. */
function pacificParts(instant: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: PACIFIC_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short'
  });
  const parts = Object.fromEntries(fmt.formatToParts(instant).map((p) => [p.type, p.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: parts.hour === '24' ? 0 : Number(parts.hour),
    minute: Number(parts.minute),
    weekday
  };
}

/** UTC instant for a Pacific wall-clock time (iterative offset resolution handles PST/PDT). */
function pacificToUtc(year: number, month: number, day: number, hour: number, minute: number): Date {
  const want = Date.UTC(year, month - 1, day, hour, minute);
  let guess = want;
  for (let i = 0; i < 2; i++) {
    const p = pacificParts(new Date(guess));
    const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += want - wall;
  }
  return new Date(guess);
}

/** Local start time (hour, minute) for the intake's preferred-window options. */
function windowStartTime(preferredWindow: string): [number, number] {
  if (preferredWindow.startsWith('Midday')) return [11, 0];
  if (preferredWindow.startsWith('Afternoon')) return [14, 0];
  // Morning, First available, Weekend, and "no preference" all open the day.
  return [8, 0];
}

/**
 * Earliest slot consistent with the customer's scheduling preference and
 * preferred arrival window, as an RFC3339 UTC string. Undefined when the
 * customer expressed no timing preference at all.
 */
export function buildBookingStart(schedulingPreference: string, preferredWindow: string, now: Date = new Date()): string | undefined {
  if (!schedulingPreference && !preferredWindow) return undefined;

  const today = pacificParts(now);
  // Anchor date arithmetic on the Pacific calendar date at UTC midnight, so
  // getUTCDay() below is the Pacific weekday and DST can't skew day steps.
  const base = Date.UTC(today.year, today.month - 1, today.day);
  const dayMs = 24 * 60 * 60 * 1000;
  const wantWeekend = preferredWindow === 'Weekend';
  // Weeks run Mon–Sun: "Next week" skips every day through this coming Sunday.
  const skipDays = schedulingPreference === 'Next week' ? (7 - today.weekday) % 7 : 0;

  for (let i = 1; i <= 21; i++) {
    if (i <= skipDays) continue;
    const candidate = new Date(base + i * dayMs);
    const wd = candidate.getUTCDay();
    const dayMatches = wantWeekend ? wd === 6 : wd >= 1 && wd <= 5;
    if (!dayMatches) continue;
    const [hour, minute] = windowStartTime(preferredWindow);
    return pacificToUtc(candidate.getUTCFullYear(), candidate.getUTCMonth() + 1, candidate.getUTCDate(), hour, minute).toISOString();
  }
  return undefined;
}
