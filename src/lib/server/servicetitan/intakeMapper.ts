import { env } from '$env/dynamic/private';
import type { IntakePayload } from '$lib/types/intake';
import type { ServiceTitanConfig } from './config';
import { resolveJobTypeId } from './jobTypeMap';
import { ServiceTitanError, stRequest } from './client';

/** On-site-charge context resolved from the GlassReports zone map, attached to the booking. */
export interface BookingFeeContext {
  osc: number;
  serviced: boolean;
  zoneId: string | null;
  zoneName: string | null;
  /** True when the OSC was collected (captured) online via Stripe. */
  paid: boolean;
  paymentIntentId: string | null;
  /** Diagnostic reason when the OSC was not collected online. */
  flag: string;
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
  return contacts;
}

function inferCustomerType(payload: IntakePayload): 'Residential' | 'Commercial' {
  if (payload.propertyType === 'Commercial') return 'Commercial';
  if (payload.propertyType === 'Property management / multifamily') return 'Commercial';
  return 'Residential';
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

/** One-line on-site-charge summary for the CSR (always present in the booking notes). */
function feeLine(feeCtx?: BookingFeeContext): string | null {
  if (!feeCtx) return null;
  const zone = feeCtx.zoneName ? ` (Zone ${feeCtx.zoneName})` : '';
  if (feeCtx.serviced && feeCtx.osc > 0) {
    return feeCtx.paid
      ? `On-site charge: $${feeCtx.osc}${zone} - PAID online via Stripe (${feeCtx.paymentIntentId}).`
      : `On-site charge: $${feeCtx.osc}${zone} - NOT collected online (${feeCtx.flag}); office to collect at scheduling.`;
  }
  if (!feeCtx.serviced) {
    return `On-site charge: ZIP not found in the service-area map - office to confirm coverage and quote the fee.`;
  }
  return `On-site charge: none for this service.`;
}

/** Structured key/value pairs mirrored onto the booking (toggle with SERVICETITAN_BOOKING_EXTERNALDATA). */
function buildExternalData(feeCtx?: BookingFeeContext): Array<{ key: string; value: string }> | undefined {
  if (env.SERVICETITAN_BOOKING_EXTERNALDATA === '0' || !feeCtx) return undefined;
  const data: Array<{ key: string; value: string }> = [
    { key: 'osc_amount', value: String(feeCtx.osc) },
    { key: 'osc_serviced', value: String(feeCtx.serviced) },
  ];
  if (feeCtx.zoneId) data.push({ key: 'osc_zone', value: feeCtx.zoneId });
  if (feeCtx.paid && feeCtx.paymentIntentId) {
    data.push({ key: 'osc_paid', value: 'true' });
    data.push({ key: 'stripe_payment_intent', value: feeCtx.paymentIntentId });
  }
  return data;
}

function buildBookingSummary(payload: IntakePayload, photoUrls: string[], feeCtx?: BookingFeeContext): string {
  const lines: string[] = [];
  // ASCII only: ServiceTitan mangles non-ASCII (em-dashes etc.) into U+FFFD
  // on this endpoint, verified on live bookings.
  lines.push(`[AUTOMATIC - PLEASE REVIEW] Web intake submission.`);
  lines.push(`Selected service: ${payload.selectedJobType.name}`);
  const fee = feeLine(feeCtx);
  if (fee) lines.push(fee);
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
  if (payload.issueDetails.ladder.access === 'yes') {
    lines.push(`Ladder required: ${payload.issueDetails.ladder.story || 'height not noted'}`);
  } else if (payload.issueDetails.ladder.access === 'unsure') {
    lines.push('Ladder access: customer unsure — check exterior photo if provided.');
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

  if (payload.schedulingPreference) {
    lines.push(`Customer prefers: ${payload.schedulingPreference}`);
  }
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
  // a missing mapping is not a blocker in this flow.
  const resolution = resolveJobTypeId(payload.selectedJobType.name, config.jobTypeIdOverrides);
  const externalData = buildExternalData(feeCtx);

  const booking: STCreateBookingRequest = {
    source: 'customer-intake-site',
    name: fullName || 'Web intake customer',
    summary: buildBookingSummary(payload, photoUrls, feeCtx),
    address: buildAddress(payload),
    contacts: buildContacts(payload),
    customerType: inferCustomerType(payload),
    priority: (payload.selectedJobType.priority || 'Normal') as STCreateBookingRequest['priority'],
    isFirstTimeClient: true,
    externalId,
    // CSR contact comes through ST's own workflow; don't fire an automated
    // confirmation email the office hasn't reviewed.
    isSendConfirmationEmail: false,
    ...(config.campaignId !== null ? { campaignId: config.campaignId } : {}),
    ...(resolution.id !== null ? { jobTypeId: resolution.id } : {}),
    ...(externalData ? { externalData } : {})
  };

  // The exact route varies by tenant/API version (per the GlassReports guide):
  // some expose a provider-scoped path, others take bookingProviderId in the
  // body. Try candidates in order; 404 "Unable to match incoming request to an
  // operation" means wrong path, so fall through. Any other error is real.
  const candidates: Array<{ resource: string; body: STCreateBookingRequest }> = [
    {
      resource: `booking-provider/${config.bookingProviderId}/bookings`,
      body: booking
    },
    {
      resource: 'bookings',
      body: { ...booking, bookingProviderId: config.bookingProviderId }
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
