import type { IntakePayload } from '$lib/types/intake';
import type { ServiceTitanConfig } from './config';
import { resolveJobTypeId } from './jobTypeMap';
import { ServiceTitanError, stRequest } from './client';

/**
 * Production-verified write sequence, mirroring the GlassReports pattern:
 *   1. POST customer
 *   2. POST location
 *   3. POST job  (with required campaignId, optional review tag, placeholder appt)
 *   4. PUT hold  (immediately, so the placeholder appointment never notifies)
 *
 * Step 4 (hold) is critical: without it, ServiceTitan can dispatch
 * notifications about the placeholder appointment we sent on step 3 before
 * dispatch has reviewed the request. The GlassReports production guide marks
 * this CRITICAL.
 */

interface STAddress {
  street: string;
  unit?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface STContactInput {
  type: 'Phone' | 'MobilePhone' | 'Email';
  value: string;
  memo?: string;
}

interface STCreateCustomerRequest {
  name: string;
  type: 'Residential' | 'Commercial';
  doNotMail: boolean;
  doNotService: boolean;
  address: STAddress;
  contacts: STContactInput[];
}

interface STCreateLocationRequest {
  customerId: number;
  name: string;
  address: STAddress;
  contacts?: STContactInput[];
}

interface STAppointmentInput {
  start: string;
  end: string;
}

interface STCreateJobRequest {
  customerId: number;
  locationId: number;
  jobTypeId: number;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  businessUnitId: number;
  /** Required by the Jobs API in this tenant — production-verified 400 without it. */
  campaignId: number;
  summary: string;
  /** Always includes the "Automatic, Please Review" tag — every job we touch is tagged for ops review. */
  tagTypeIds: number[];
  appointments?: STAppointmentInput[];
}

interface STHoldRequest {
  reasonId: number;
  memo: string;
}

interface STIdResponse {
  id: number;
}

/**
 * Phone normalization: ServiceTitan stores 10-digit US numbers; strip "+1",
 * punctuation, and spaces so contacts don't reject on format. Matches the
 * GlassReports production normalization.
 */
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return digits;
}

function buildAddress(payload: IntakePayload): STAddress {
  return {
    street: payload.address.street.trim(),
    city: payload.address.city.trim(),
    state: payload.address.state.trim(),
    zip: payload.address.zip.trim(),
    country: 'USA'
  };
}

function buildContacts(payload: IntakePayload): STContactInput[] {
  const contacts: STContactInput[] = [];
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
 * Placeholder appointment window (~next morning Pacific). The job is held
 * immediately after creation, so the slot is just a value the dispatcher
 * adjusts when they review. Matches the GlassReports pattern.
 */
function placeholderAppointmentWindow(): STAppointmentInput {
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  start.setUTCHours(17, 0, 0, 0); // ~9am Pacific
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString() };
}

function buildJobSummary(payload: IntakePayload): string {
  const lines: string[] = [];
  lines.push(`Selected: ${payload.selectedJobType.name}`);
  if (payload.routing.isEmergency) {
    lines.push(
      payload.routing.isDuringBusinessHours
        ? '⚠ Emergency during business hours — priority dispatch'
        : '⚠ Emergency after hours — emergency dispatch'
    );
  }
  if (payload.routing.priorityUpgrade) {
    lines.push('Customer accepted Priority Service upgrade ($399).');
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
  if (!payload.issueDetails.isSecure) flags.push('Opening not secure');
  if (payload.issueDetails.hasBrokenGlass) flags.push('Broken glass on site');
  if (payload.issueDetails.hasWaterOrWeatherEntry) flags.push('Water / weather entering');
  if (flags.length) lines.push(`Site flags: ${flags.join(', ')}`);

  if (payload.schedulingPreference) {
    lines.push(`Customer prefers: ${payload.schedulingPreference}`);
  }
  if (payload.issueDetails.photos.length) {
    lines.push(`Photos attached on intake: ${payload.issueDetails.photos.length}`);
  }
  lines.push('');
  lines.push('⚠ Placeholder appointment + on hold — adjust schedule before releasing.');
  lines.push('Submitted via customer intake site.');
  return lines.join('\n');
}

function buildHoldMemo(payload: IntakePayload): string {
  const who = `${payload.customer.firstName} ${payload.customer.lastName}`.trim() || 'web visitor';
  return `Auto-created from web intake (${who}). Held pending dispatch review — adjust schedule and remove hold to release.`;
}

export interface IntakeSubmissionResult {
  customerId: number;
  locationId: number;
  jobId: number;
}

export async function submitIntakeToServiceTitan(
  config: ServiceTitanConfig,
  payload: IntakePayload
): Promise<IntakeSubmissionResult> {
  const jobTypeName = payload.selectedJobType.name;
  const resolution = resolveJobTypeId(jobTypeName, config.jobTypeIdOverrides);
  if (resolution.id === null) {
    throw new ServiceTitanError(
      `No ServiceTitan Job Type ID configured for "${jobTypeName}". Set it in jobTypeMap.ts or via SERVICETITAN_JOB_TYPE_IDS.`,
      { status: 0, title: 'Missing job type mapping', raw: { jobTypeName } }
    );
  }

  const customerType = inferCustomerType(payload);
  const fullName = `${payload.customer.firstName} ${payload.customer.lastName}`.trim();
  const address = buildAddress(payload);
  const contacts = buildContacts(payload);

  // 1) Customer
  const customerRequest: STCreateCustomerRequest = {
    name: fullName || 'Web intake customer',
    type: customerType,
    doNotMail: false,
    doNotService: false,
    address,
    contacts
  };
  const customer = await stRequest<STIdResponse>(
    config,
    'crm/v2',
    'customers',
    { method: 'POST', body: customerRequest }
  );

  // 2) Location
  const locationRequest: STCreateLocationRequest = {
    customerId: customer.id,
    name: 'Service location',
    address,
    contacts
  };
  const location = await stRequest<STIdResponse>(
    config,
    'crm/v2',
    'locations',
    { method: 'POST', body: locationRequest }
  );

  // 3) Job — always carries the "Automatic, Please Review" tag.
  const jobRequest: STCreateJobRequest = {
    customerId: customer.id,
    locationId: location.id,
    jobTypeId: resolution.id,
    priority: (payload.selectedJobType.priority || 'Normal') as STCreateJobRequest['priority'],
    businessUnitId: config.businessUnitId,
    campaignId: config.campaignId,
    summary: buildJobSummary(payload),
    tagTypeIds: [config.reviewTagId],
    appointments: [placeholderAppointmentWindow()]
  };
  const job = await stRequest<STIdResponse>(
    config,
    'jpm/v2',
    'jobs',
    { method: 'POST', body: jobRequest }
  );

  // 4) Hold (CRITICAL — without this the placeholder appointment can notify the customer).
  // If this fails, the job exists and is dangerous. Surface that loudly.
  try {
    const holdRequest: STHoldRequest = {
      reasonId: config.holdReasonId,
      memo: buildHoldMemo(payload)
    };
    await stRequest<void>(config, 'jpm/v2', `jobs/${job.id}/hold`, {
      method: 'PUT',
      body: holdRequest
    });
  } catch (holdError) {
    const wrapped =
      holdError instanceof ServiceTitanError
        ? holdError
        : new ServiceTitanError(
            'ServiceTitan hold step failed',
            { status: 0, title: String(holdError) }
          );
    throw new ServiceTitanError(
      `Job #${job.id} created but HOLD FAILED — customer may receive notifications about the placeholder appointment. ` +
        `Place this job on hold manually in ServiceTitan ASAP. ${wrapped.message}`,
      { ...wrapped.problem, raw: { ...wrapped.problem.raw as object, leakedJobId: job.id } }
    );
  }

  return {
    customerId: customer.id,
    locationId: location.id,
    jobId: job.id
  };
}
