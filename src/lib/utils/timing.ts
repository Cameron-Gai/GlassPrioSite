import type { IntakeState } from '$lib/stores/intakeStore';

/** Human-readable requested timing: a picked date, 'flexible', or
 *  priority/emergency. Shared by the review screen and the summary rail. */
export function describeTiming(s: IntakeState): string {
  if (s.priorityUpgrade) return 'Priority Service — within 2 hours';
  if (s.isEmergency) return 'Emergency — immediate dispatch';
  const pref = s.schedulingPreference;
  if (!pref) return '—';
  if (pref === 'flexible') return 'Flexible — first available';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pref);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const window = s.specialInstructions.preferredWindow;
    return window ? `${day} · ${window}` : day;
  }
  return pref;
}
