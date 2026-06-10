import type { IntakePayload } from '$lib/types/intake';
import type { ServiceTitanConfig } from './config';
import { resolveJobTypeId } from './jobTypeMap';
import { ServiceTitanError, stRequest } from './client';

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
  /**
   * Customer photos attached to the booking. EXACT FORMAT UNVERIFIED — the
   * bookings POST contract for uploadedImages lives behind ServiceTitan's
   * login-gated OpenAPI spec. Current best guess: an array of raw base64
   * strings (no data: prefix). If the verify-first test booking shows photos
   * not rendering, adjust `buildUploadedImages` below.
   */
  uploadedImages?: string[];
}

/**
 * Convert our data-URL photos to whatever the bookings API expects.
 * NOTE: format unverified — see uploadedImages above. Today we strip the
 * `data:image/...;base64,` prefix and send raw base64 strings.
 */
function buildUploadedImages(payload: IntakePayload): string[] {
  return payload.issueDetails.photos
    .map((photo) => {
      const comma = photo.dataUrl.indexOf(',');
      return comma >= 0 ? photo.dataUrl.slice(comma + 1) : photo.dataUrl;
    })
    .filter((value) => value.length > 0);
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

function buildBookingSummary(payload: IntakePayload): string {
  const lines: string[] = [];
  lines.push(`[AUTOMATIC — PLEASE REVIEW] Web intake submission.`);
  lines.push(`Selected service: ${payload.selectedJobType.name}`);
  if (payload.routing.isEmergency) {
    lines.push(
      payload.routing.isDuringBusinessHours
        ? '⚠ EMERGENCY during business hours — customer expects priority dispatch (2-hour promise)'
        : '⚠ EMERGENCY after hours — customer expects emergency dispatch (3-hour promise)'
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
  if (payload.issueDetails.ladder.required) {
    lines.push(`Ladder required: ${payload.issueDetails.ladder.story || 'height not noted'}`);
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
    for (const line of access) lines.push(`  • ${line}`);
  }

  const flags: string[] = [];
  if (!payload.issueDetails.isSecure) flags.push('Opening NOT secure');
  if (payload.issueDetails.hasBrokenGlass) flags.push('Broken glass on site');
  if (payload.issueDetails.hasWaterOrWeatherEntry) flags.push('Water / weather entering');
  if (flags.length) lines.push(`Site flags: ${flags.join(', ')}`);

  if (payload.schedulingPreference) {
    lines.push(`Customer prefers: ${payload.schedulingPreference}`);
  }
  if (payload.issueDetails.photos.length) {
    lines.push(`${payload.issueDetails.photos.length} photo(s) attached to this booking.`);
  }
  return lines.join('\n');
}

export interface IntakeSubmissionResult {
  bookingId: number;
  externalId: string;
}

export async function submitIntakeToServiceTitan(
  config: ServiceTitanConfig,
  payload: IntakePayload
): Promise<IntakeSubmissionResult> {
  // Web Crypto global (Node 19+) — avoids needing @types/node for node:crypto.
  const externalId = `glass-intake-${crypto.randomUUID()}`;
  const fullName = `${payload.customer.firstName} ${payload.customer.lastName}`.trim();

  // Optional jobTypeId pre-fill — the CSR confirms/overrides at conversion, so
  // a missing mapping is not a blocker in this flow.
  const resolution = resolveJobTypeId(payload.selectedJobType.name, config.jobTypeIdOverrides);
  const uploadedImages = buildUploadedImages(payload);

  const booking: STCreateBookingRequest = {
    source: 'customer-intake-site',
    name: fullName || 'Web intake customer',
    summary: buildBookingSummary(payload),
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
    ...(uploadedImages.length ? { uploadedImages } : {})
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
