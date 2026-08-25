/**
 * Why pay-by-text must NOT be offered for this request — or null when it's fine.
 *
 * CHANNEL PARITY — mirrors payByTextBlockedReason in
 * GlassReports/src/lib/intake/booking.ts (2026-08-05). The two channels must
 * agree about when a customer can be promised a payment text, because they feed
 * the same OSC collection pipeline.
 *
 * One module, called from BOTH /api/payment/intent (which tells the wizard
 * whether to show the option) and /api/intake (which decides authoritatively
 * whether to register the deferred OSC), so the two can never disagree about
 * whether a customer was promised a text.
 *
 * The emergency rule is the load-bearing one: a Priority/Emergency fee is
 * settled against the booking itself — a card at intake during business hours,
 * the on-call tech after hours. Registering a deferred OSC as well would text
 * the customer a link and set up a second collection for a job already being
 * paid for, a live double-charge, and the link would arrive after a visit that
 * dispatch sends out immediately. It is reachable without any customer mistake:
 * pick a normal job, choose pay-by-text, then accept the Priority Service
 * upgrade on the scheduling step — the pay-later choice survives the swap.
 *
 * Note this is deliberately NOT the rule for paying by card. An urgent job IS
 * collectable now; it just can't be collected later.
 */
import { getJobType, type JobType } from '$lib/data/jobTypes';

export interface PayByTextInput {
  /** ServiceTitan job type NAME from the shared catalog. The urgency verdict is
   *  derived from the catalog rather than a client flag, so a crafted payload
   *  can't re-enable the option. */
  jobTypeName: string;
  /** The intake's property type ('' when not yet chosen / not sent). */
  propertyType: string;
  /** GlassReports' OSC collection pipeline master switch (from the zone quote). */
  oscTextingEnabled: boolean;
}

/**
 * True for the Priority/Emergency job types. Both live in the 'emergency'
 * category, so that alone would do — the 'Urgent' priority is a deliberate
 * second net, so a new urgent job type added to the catalog without that
 * category fails CLOSED (no pay-by-text) rather than opening a double-charge.
 * The only other Urgent entries today are the warranty jobs, which are internal
 * (publicIntakeEnabled: false) and never reach this intake.
 */
function isUrgentJobType(job: JobType | null): boolean {
  return !!job && (job.category === 'emergency' || job.priority === 'Urgent');
}

export function payByTextBlockedReason(input: PayByTextInput): string | null {
  let job: JobType | null = null;
  try {
    job = getJobType(input.jobTypeName);
  } catch {
    // Unknown job type — no urgency or fee semantics to read. The remaining
    // rules still apply.
  }
  if (isUrgentJobType(job)) {
    return 'the priority/emergency fee is settled on the booking, and a text would arrive after the visit';
  }
  if (input.propertyType === 'Facility maintenance') {
    return 'facility-maintenance jobs bill against the work order';
  }
  if (job?.pricing?.billedAfter) {
    return 'this service is billed after the visit (net-30)';
  }
  if (!input.oscTextingEnabled) {
    return 'the payment-text pipeline is currently off';
  }
  return null;
}
