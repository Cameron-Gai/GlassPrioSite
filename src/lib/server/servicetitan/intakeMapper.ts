// CHANNEL PARITY — the booking-summary/externalData semantics here are
// mirrored in GlassReports/src/lib/intake/booking.ts (the employee phone-
// intake tool). When booking semantics change in either repo, consider the
// sibling — port the change or leave a dated comment on the divergence.
import { env } from '$env/dynamic/private';
import type { IntakePayload } from '$lib/types/intake';
import type { ServiceTitanConfig } from './config';
import { resolveJobTypeId } from './jobTypeMap';
import { ServiceTitanError, stRequest } from './client';
import { buildBookingStart } from './bookingSchedule';

/** On-site-charge context resolved from the GlassReports zone map, attached to the booking. */
export interface BookingFeeContext {
  osc: number;
  serviced: boolean;
  zoneId: string | null;
  zoneName: string | null;
  /** True when the OSC was collected (captured) online via Stripe. */
  paid: boolean;
  paymentIntentId: string | null;
  /** Dollars actually collected online — base OSC + WA sales tax when quoted. */
  paidTotal?: number | null;
  /** Diagnostic reason when the OSC was not collected online. */
  flag: string;
  /** Resolved ServiceTitan business-unit id for the ZIP + customer type (pre-fills the booking). */
  businessUnitId?: number | null;
  /** ST job-type id the zone map resolved for this quote — booking jobTypeId
   *  fallback when SERVICETITAN_JOB_TYPE_IDS has no entry (prefills the
   *  conversion screen's Job Type dropdown). */
  jobTypeId?: string | null;
  /** Customer chose "Pay later": the OSC is collected by a texted Stripe link once
   *  the booking is converted to a scheduled job (the GlassReports OSC pipeline). */
  deferred?: boolean;
  /** Where the pay-later link is texted (may differ from the contact phone). */
  payLaterPhone?: string | null;
  /** Customer opted into a remote (virtual) consultation: the OSC is waived until
   *  we roll a truck, so nothing is collected online and the booking notes say so. */
  remoteConsult?: boolean;
  /** Facility maintenance company: nothing is collected upfront — the job bills
   *  against their work order (same model as the phone channel). */
  facilityMaintenance?: boolean;
}

/**
 * Bookings-first intake write (the GlassReports guide's recommended flow):
 * one POST creates a Booking that lands on ServiceTitan's Job Booking screen,
 * where a CSR converts it — ST's native workflow then handles customer
 * dedupe, location creation, job booking, and scheduling with full UI
 * validation. No job/customer/location records are created by us directly,
 * so a failed submission leaves nothing dangling in ServiceTitan.
 *
 * Prerequisite (one-time, in the ST UI): a Booking Provider Tag under
 * Settings → Integrations → Booking Provider Tags. Its ID is
 * SERVICETITAN_BOOKING_PROVIDER_ID.
 *
 * Idempotency: every submission carries a unique externalId. ServiceTitan
 * does NOT dedupe bookings server-side; the externalId is our marker for
 * later closed-loop polling (GET bookings → status/jobId) and replay safety.
 */

interface STBookingAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface STBookingContact {
  type: 'Phone' | 'MobilePhone' | 'Email';
  value: string;
  /** Contact note shown in ServiceTitan; labels the on-site contact entry. */
  memo?: string;
}

interface STCreateBookingRequest {
  source: string;
  name: string;
  summary: string;
  address: STBookingAddress;
  contacts: STBookingContact[];
  customerType: 'Residential' | 'Commercial';
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  isFirstTimeClient: boolean;
  externalId: string;
  // Requested service datetime (RFC3339). Prefills the Start Date on the
  // booking-conversion screen (otherwise it renders a null date); derived from
  // the customer's scheduling preference + preferred arrival window.
  start?: string;
  isSendConfirmationEmail: boolean;
  campaignId?: number;
  jobTypeId?: number;
  bookingProviderId?: number;
  // Structured key/value pairs ServiceTitan stores on the booking. We use it to
  // carry the on-site charge + Stripe payment reference. Toggle off with
  // SERVICETITAN_BOOKING_EXTERNALDATA=0 if a tenant's bookings endpoint rejects
  // it (the same info is always in `summary` as a fallback).
  externalData?: Array<{ key: string; value: string }>;
  // NOTE: no uploadedImages — verified live that the bookings POST stores the
  // value as an opaque string the ST UI can't render (and no integration in
  // the tenant uses it). Photos are self-hosted; their URLs go in `summary`.
}

interface STBookingResponse {
  id: number;
}

/** ServiceTitan stores 10-digit US numbers; strip "+1" and punctuation. */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function buildAddress(payload: IntakePayload): STBookingAddress {
  return {
    street: payload.address.street.trim(),
    city: payload.address.city.trim(),
    state: payload.address.state.trim(),
    zip: payload.address.zip.trim(),
    country: 'USA'
  };
}

function buildContacts(payload: IntakePayload): STBookingContact[] {
  const contacts: STBookingContact[] = [];
  const phone = normalizePhone(payload.customer.phone);
  if (phone) contacts.push({ type: 'MobilePhone', value: phone });
  if (payload.customer.email.trim()) {
    contacts.push({ type: 'Email', value: payload.customer.email.trim() });
  }
  // The person who'll actually be at the property, when different from the
  // requester — labeled via memo so the CSR can copy it into the job's
  // On-Site Contact field at conversion.
  const oc = payload.onSiteContact;
  if (oc.differs) {
    const ocPhone = normalizePhone(oc.phone);
    if (ocPhone && ocPhone !== phone) {
      contacts.push({
        type: 'Phone',
        value: ocPhone,
        memo: toAscii(`On-site contact${oc.name.trim() ? `: ${oc.name.trim()}` : ''}`)
      });
    }
  }
  return contacts;
}

/** Map a property type to the ServiceTitan customer type. Business, multi-family,
 *  and facility-maintenance callers are Commercial. */
export function customerTypeForPropertyType(propertyType: IntakePayload['propertyType']): 'Residential' | 'Commercial' {
  if (propertyType === 'Business') return 'Commercial';
  if (propertyType === 'Multi-family') return 'Commercial';
  if (propertyType === 'Facility maintenance') return 'Commercial';
  return 'Residential';
}

function inferCustomerType(payload: IntakePayload): 'Residential' | 'Commercial' {
  return customerTypeForPropertyType(payload.propertyType);
}

/**
 * ServiceTitan mangles non-ASCII into U+FFFD on the bookings endpoint
 * (verified live). Transliterate typographic punctuation phone keyboards
 * insert; drop anything else non-ASCII rather than ship � to dispatch.
 */
function toAscii(text: string): string {
  return text
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—―]/g, '-')
    .replace(/…/g, '...')
    .replace(/ /g, ' ')
    .replace(/[^\x20-\x7E\n]/g, '');
}

/** One-line on-site consultation charge summary for the CSR (always present in the booking notes). */
function feeLine(feeCtx?: BookingFeeContext): string | null {
  if (!feeCtx) return null;
  const zone = feeCtx.zoneName ? ` (Zone ${feeCtx.zoneName})` : '';
  if (feeCtx.serviced && feeCtx.osc > 0) {
    if (feeCtx.facilityMaintenance) {
      return `On-site consultation charge: $${feeCtx.osc}${zone} - FACILITY MAINTENANCE: do NOT collect upfront. Bills against the caller's work order (see the work order line below).`;
    }
    if (feeCtx.remoteConsult) {
      return `On-site consultation charge: $${feeCtx.osc}${zone} - WAIVED, customer opted into a REMOTE consultation. Review the attached photos first; the charge applies only if/when a truck is rolled.`;
    }
    if (feeCtx.paid) {
      const total = feeCtx.paidTotal ?? feeCtx.osc;
      const tax = Math.round((total - feeCtx.osc) * 100) / 100;
      const taxNote = tax > 0 ? ` incl. $${tax.toFixed(2)} sales tax` : '';
      return `On-site consultation charge: $${feeCtx.osc}${zone} - PAID online via Stripe (${feeCtx.paymentIntentId}): $${total.toFixed(2)} collected${taxNote}. Do NOT collect again.`;
    }
    if (feeCtx.deferred) {
      const to = feeCtx.payLaterPhone ? ` to ${feeCtx.payLaterPhone}` : '';
      return `On-site consultation charge: $${feeCtx.osc}${zone} - customer chose PAY LATER (texting consent given). On conversion to a job, the "OSC Collection" tag is applied and a Stripe payment link is texted${to} to collect before the appointment.`;
    }
    return `On-site consultation charge: $${feeCtx.osc}${zone} - NOT collected online (${feeCtx.flag}); office to collect at scheduling.`;
  }
  if (!feeCtx.serviced) {
    return `On-site consultation charge: ZIP not found in the service-area map - office to confirm coverage and quote the fee.`;
  }
  return `On-site consultation charge: none for this service.`;
}

/** Structured key/value pairs mirrored onto the booking (toggle with SERVICETITAN_BOOKING_EXTERNALDATA). */
function buildExternalData(payload: IntakePayload, feeCtx?: BookingFeeContext): Array<{ key: string; value: string }> | undefined {
  if (env.SERVICETITAN_BOOKING_EXTERNALDATA === '0') return undefined;
  const data: Array<{ key: string; value: string }> = [];
  if (feeCtx) {
    data.push({ key: 'osc_amount', value: String(feeCtx.osc) });
    data.push({ key: 'osc_serviced', value: String(feeCtx.serviced) });
    if (feeCtx.zoneId) data.push({ key: 'osc_zone', value: feeCtx.zoneId });
    if (feeCtx.paid && feeCtx.paymentIntentId) {
      data.push({ key: 'osc_paid', value: 'true' });
      data.push({ key: 'stripe_payment_intent', value: feeCtx.paymentIntentId });
      if (feeCtx.paidTotal != null) data.push({ key: 'osc_paid_total', value: String(feeCtx.paidTotal) });
    }
    if (feeCtx.deferred) {
      data.push({ key: 'osc_paylater', value: 'true' });
      if (feeCtx.payLaterPhone) data.push({ key: 'osc_paylater_phone', value: feeCtx.payLaterPhone });
    }
    if (feeCtx.remoteConsult) data.push({ key: 'osc_remote_consult', value: 'true' });
  }
  // Facility-maintenance linkage: the work order is what the job bills against.
  if (payload.propertyType === 'Facility maintenance') {
    data.push({ key: 'facility_maintenance', value: 'true' });
    if (payload.propertyDetails.facilityCompany) {
      data.push({ key: 'fm_company', value: payload.propertyDetails.facilityCompany });
    }
    if (payload.propertyDetails.workOrderNumber) {
      data.push({ key: 'work_order', value: payload.propertyDetails.workOrderNumber });
    }
  }
  // Returning-customer linkage — lets the CSR (or an integration) attach this
  // booking to the existing ServiceTitan record deterministically at conversion,
  // instead of relying only on ServiceTitan's native dedupe.
  const rc = payload.returningCustomer;
  if (rc?.matched) {
    data.push({ key: 'returning_customer', value: 'true' });
    if (rc.customerId) data.push({ key: 'st_customer_id', value: String(rc.customerId) });
    if (rc.locationId) data.push({ key: 'st_location_id', value: String(rc.locationId) });
  }
  return data.length ? data : undefined;
}

/** Human-readable timing line for the CSR. The preference is a concrete date
 *  (YYYY-MM-DD from the day picker), 'flexible', or a legacy phrase. */
function schedulingLine(pref: string): string | null {
  if (!pref) return null;
  if (pref === 'flexible' || pref === 'Flexible') return 'Customer timing: flexible - first available works.';
  if (/^\d{4}-\d{2}-\d{2}$/.test(pref)) {
    return `Customer requested day: ${pref} (advisory - customer was told we will confirm, and reach out if it does not work)`;
  }
  return `Customer prefers: ${pref}`;
}

function buildBookingSummary(payload: IntakePayload, photoUrls: string[], feeCtx?: BookingFeeContext): string {
  const lines: string[] = [];
  // ASCII only: ServiceTitan mangles non-ASCII (em-dashes etc.) into U+FFFD
  // on this endpoint, verified on live bookings.
  lines.push(`[AUTOMATIC - PLEASE REVIEW] Web intake submission.`);
  lines.push(`Selected service: ${payload.selectedJobType.name}`);
  // ServiceTitan does NOT prefill the Customer Type toggle on the booking
  // conversion screen from the booking's customerType field, so call it out
  // explicitly here for the CSR to set when creating the customer record.
  lines.push(`Customer type: ${inferCustomerType(payload)} (set the Customer Type toggle to match)`);
  const fee = feeLine(feeCtx);
  if (fee) lines.push(fee);
  // Returning-customer linkage note for the CSR (ids also in externalData).
  const rc = payload.returningCustomer;
  if (rc?.matched) {
    const ids: string[] = [];
    if (rc.customerId) ids.push(`customer #${rc.customerId}`);
    if (rc.locationId) ids.push(`location #${rc.locationId}`);
    lines.push(
      `RETURNING CUSTOMER - please link to existing ServiceTitan ${ids.length ? ids.join(', ') : 'record'} on conversion (matched by 2+ of phone/email/name/address).`
    );
  }
  if (payload.routing.isEmergency) {
    lines.push(
      payload.routing.isDuringBusinessHours
        ? '!! EMERGENCY during business hours - customer expects priority dispatch (2-hour promise)'
        : '!! EMERGENCY after hours - customer expects emergency dispatch (3-hour promise)'
    );
  }
  if (payload.routing.priorityUpgrade) {
    lines.push('Customer accepted the Priority Service upgrade ($399).');
  }
  // Property type + type-specific details and the submitter's role.
  if (payload.propertyType === 'Facility maintenance') {
    // Third-party caller: mirrors the GoSameDay phone-script booking note so
    // the CSR handles it the same way regardless of channel. Contact goes to
    // the FM company (the submitter), not the business being serviced.
    const pd = payload.propertyDetails;
    lines.push(
      `THIRD-PARTY FACILITY MAINTENANCE - ${pd.facilityCompany || 'company name not given'} on behalf of ${pd.businessName || 'business name not given'}.`
    );
    lines.push(
      pd.workOrderNumber
        ? `Work order: ${pd.workOrderNumber} - job bills against this work order.`
        : 'Work order number PENDING - confirm with the caller before billing.'
    );
    lines.push('Contact/confirmations go to the facility maintenance caller, not the business.');
  } else if (payload.propertyType) {
    const pd = payload.propertyDetails;
    const name = payload.propertyType === 'Business' ? pd.businessName
      : payload.propertyType === 'Multi-family' ? pd.complexName : '';
    const bits: string[] = [payload.propertyType];
    if (name) bits.push(name);
    if (pd.role) bits.push(`contact is ${pd.role}`);
    lines.push(`Property: ${bits.join(' - ')}`);
  }
  if (payload.issueDetails.serviceLocation) {
    lines.push(`Location on property: ${payload.issueDetails.serviceLocation}`);
  }
  if (payload.issueDetails.description) {
    lines.push('');
    lines.push(payload.issueDetails.description);
  }
  if (payload.issueDetails.happenedAt) {
    lines.push(`When: ${payload.issueDetails.happenedAt}`);
  }
  const wa = payload.issueDetails.windowAccess;
  if (wa.floors) lines.push(`Window floor(s): ${wa.floors}`);
  if (wa.blocked === 'yes') {
    lines.push(`Access blocked: ${wa.blockedNotes || 'yes (details not noted)'}`);
  } else if (wa.blocked === 'unsure') {
    lines.push('Access blocked: customer unsure - check photo if provided.');
  }
  const cd = payload.issueDetails.categoryDetails;
  if (cd.storefrontScope) lines.push(`Storefront scope: ${cd.storefrontScope}`);
  if (cd.doorOperational) lines.push(`Door operational: ${cd.doorOperational}`);
  if (cd.showerMirrorType) lines.push(`Type wanted: ${cd.showerMirrorType}`);
  if (cd.approximateSize) lines.push(`Approximate size: ${cd.approximateSize}`);
  if (cd.hardwareProblem) lines.push(`Hardware problem: ${cd.hardwareProblem}`);
  if (cd.multiServiceList) lines.push(`Services: ${cd.multiServiceList}`);

  const si = payload.specialInstructions;
  const access: string[] = [];
  if (si.gateCode) access.push(`Gate code: ${si.gateCode}`);
  if (si.hasDog) access.push('Dog on property');
  if (si.parkingNotes) access.push(`Parking: ${si.parkingNotes}`);
  if (si.preferredWindow) access.push(`Preferred window: ${si.preferredWindow}`);
  if (payload.onSiteContact.differs) {
    const oc = payload.onSiteContact;
    access.push(`On-site contact: ${oc.name || 'name not given'}${oc.phone ? ` (${oc.phone})` : ''}`);
  }
  if (si.other) access.push(`Notes: ${si.other}`);
  if (access.length) {
    lines.push('');
    lines.push('Access:');
    for (const line of access) lines.push(`  * ${line}`);
  }

  const flags: string[] = [];
  if (!payload.issueDetails.isSecure) flags.push('Opening NOT secure');
  if (payload.issueDetails.hasBrokenGlass) flags.push('Broken glass on site');
  if (payload.issueDetails.hasWaterOrWeatherEntry) flags.push('Water / weather entering');
  if (flags.length) lines.push(`Site flags: ${flags.join(', ')}`);

  const timing = schedulingLine(payload.schedulingPreference);
  if (timing) lines.push(timing);
  if (photoUrls.length) {
    lines.push('');
    lines.push(`Customer photos (${photoUrls.length}):`);
    for (const url of photoUrls) lines.push(`  ${url}`);
  }
  return toAscii(lines.join('\n'));
}

export interface IntakeSubmissionResult {
  bookingId: number;
  externalId: string;
}

export async function submitIntakeToServiceTitan(
  config: ServiceTitanConfig,
  payload: IntakePayload,
  photoUrls: string[] = [],
  feeCtx?: BookingFeeContext
): Promise<IntakeSubmissionResult> {
  const externalId = `glass-intake-${crypto.randomUUID()}`;
  const fullName = `${payload.customer.firstName} ${payload.customer.lastName}`.trim();

  // Optional jobTypeId pre-fill — the CSR confirms/overrides at conversion, so
  // a missing mapping is not a blocker in this flow. Env override map first;
  // else the id the zone map already resolved by name (its catalog is keyed by
  // real ST job-type ids). CHANNEL PARITY: same fallback as the employee tool.
  const resolution = resolveJobTypeId(payload.selectedJobType.name, config.jobTypeIdOverrides);
  const zoneMapJobTypeId = feeCtx?.jobTypeId ? Number(feeCtx.jobTypeId) : NaN;
  const jobTypeId =
    resolution.id ?? (Number.isFinite(zoneMapJobTypeId) && zoneMapJobTypeId > 0 ? zoneMapJobTypeId : null);
  const externalData = buildExternalData(payload, feeCtx);

  const start = buildBookingStart(payload.schedulingPreference, payload.specialInstructions.preferredWindow);

  const booking: STCreateBookingRequest = {
    source: 'customer-intake-site',
    name: fullName || 'Web intake customer',
    summary: buildBookingSummary(payload, photoUrls, feeCtx),
    address: buildAddress(payload),
    contacts: buildContacts(payload),
    customerType: inferCustomerType(payload),
    priority: (payload.selectedJobType.priority || 'Normal') as STCreateBookingRequest['priority'],
    // Reflect the returning-customer lookup: a recognized customer must not be
    // flagged first-time (that corrupts first-vs-repeat reporting + attribution).
    isFirstTimeClient: !(payload.returningCustomer?.matched === true),
    externalId,
    // CSR contact comes through ST's own workflow; don't fire an automated
    // confirmation email the office hasn't reviewed.
    isSendConfirmationEmail: false,
    ...(start ? { start } : {}),
    ...(config.campaignId !== null ? { campaignId: config.campaignId } : {}),
    ...(jobTypeId !== null ? { jobTypeId } : {}),
    ...(feeCtx?.businessUnitId ? { businessUnitId: feeCtx.businessUnitId } : {}),
    ...(externalData ? { externalData } : {})
  };

  // The exact route varies by tenant/API version (per the GlassReports guide):
  // some expose a provider-scoped path, others take bookingProviderId in the
  // body. Try candidates in order; 404 "Unable to match incoming request to an
  // operation" means wrong path, so fall through. Any other error is real.
  async function postBooking(body: STCreateBookingRequest): Promise<IntakeSubmissionResult> {
    const candidates: Array<{ resource: string; body: STCreateBookingRequest }> = [
      {
        resource: `booking-provider/${config.bookingProviderId}/bookings`,
        body
      },
      {
        resource: 'bookings',
        body: { ...body, bookingProviderId: config.bookingProviderId }
      }
    ];

    let lastError: ServiceTitanError | null = null;
    for (const candidate of candidates) {
      try {
        const created = await stRequest<STBookingResponse>(config, 'crm/v2', candidate.resource, {
          method: 'POST',
          body: candidate.body
        });
        return { bookingId: created.id, externalId };
      } catch (error) {
        if (error instanceof ServiceTitanError && error.status === 404) {
          // Wrong route shape for this tenant — try the next candidate.
          lastError = error;
          continue;
        }
        throw error;
      }
    }

    throw lastError ??
      new ServiceTitanError('No booking route candidate succeeded', {
        status: 404,
        title: 'No booking route matched'
      });
  }

  // `start` and contact memos are newer additions, not yet verified against
  // every tenant's bookings endpoint. If ST rejects the payload, retry once
  // without them — the same details are always in `summary`, and losing the
  // lead over a prefill nicety is never acceptable.
  const hasStructuredExtras = Boolean(start) || booking.contacts.some((c) => c.memo !== undefined);
  try {
    return await postBooking(booking);
  } catch (error) {
    if (!(error instanceof ServiceTitanError) || error.status !== 400 || !hasStructuredExtras) throw error;
    console.warn(`[intake] bookings POST rejected structured start/contact fields (${error.message}); retrying without them`);
    const fallback: STCreateBookingRequest = {
      ...booking,
      contacts: booking.contacts.filter((c) => c.memo === undefined)
    };
    delete fallback.start;
    return await postBooking(fallback);
  }
}
