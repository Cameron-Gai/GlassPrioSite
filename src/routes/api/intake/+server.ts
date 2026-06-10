import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IntakePayload } from '$lib/types/intake';
import {
  getServiceTitanConfig,
  ServiceTitanError,
  submitIntakeToServiceTitan
} from '$lib/server/servicetitan';
import { publicOrigin, savePhotos } from '$lib/server/photoStorage';

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validate(payload: IntakePayload): string | null {
  if (!payload || typeof payload !== 'object') return 'Missing payload';

  if (!payload.selectedJobType || !isNonEmptyString(payload.selectedJobType.name)) {
    return 'selectedJobType.name is required';
  }

  const { customer, address, issueDetails } = payload;

  if (
    !customer ||
    !isNonEmptyString(customer.firstName) ||
    !isNonEmptyString(customer.lastName) ||
    !isNonEmptyString(customer.phone) ||
    !isNonEmptyString(customer.email)
  ) {
    return 'customer fields are required';
  }

  if (
    !address ||
    !isNonEmptyString(address.street) ||
    !isNonEmptyString(address.city) ||
    !isNonEmptyString(address.state) ||
    !isNonEmptyString(address.zip)
  ) {
    return 'address fields are required';
  }

  if (
    !issueDetails ||
    !isNonEmptyString(issueDetails.description) ||
    !isNonEmptyString(issueDetails.happenedAt)
  ) {
    return 'issueDetails fields are required';
  }

  return null;
}

function mockConfirmationNumber(): string {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `GLASS-${random}`;
}

export const POST: RequestHandler = async ({ request, url }) => {
  let payload: IntakePayload;
  try {
    payload = (await request.json()) as IntakePayload;
  } catch {
    throw error(400, 'Invalid JSON payload');
  }

  const validationError = validate(payload);
  if (validationError) {
    return json({ success: false, error: validationError }, { status: 400 });
  }

  // Persist photos to local storage (Railway volume in prod) and build the
  // public URLs that go in the booking summary. Best-effort: a storage
  // failure should not block the booking itself.
  let photoUrls: string[] = [];
  try {
    const stored = await savePhotos(payload.issueDetails.photos, publicOrigin(url.origin));
    photoUrls = stored.map((photo) => photo.url);
  } catch (storageError) {
    console.error('[api/intake] photo storage failed — continuing without links', storageError);
  }

  const config = getServiceTitanConfig();

  if (!config) {
    // Dev / unconfigured: keep the mock path so the wizard works end-to-end.
    console.log('[api/intake] ServiceTitan not configured — returning mock confirmation', {
      jobType: payload.selectedJobType.name,
      customer: `${payload.customer.firstName} ${payload.customer.lastName}`,
      photoUrls
    });
    return json({
      success: true,
      confirmationNumber: mockConfirmationNumber(),
      mock: true,
      photoUrls
    });
  }

  try {
    const result = await submitIntakeToServiceTitan(config, payload, photoUrls);
    console.log('[api/intake] ServiceTitan booking created', result);
    return json({
      success: true,
      confirmationNumber: `GLASS-${result.bookingId}`,
      serviceTitan: {
        environment: config.environment,
        bookingId: result.bookingId,
        externalId: result.externalId
      }
    });
  } catch (err) {
    if (err instanceof ServiceTitanError) {
      // RFC 7807 problem-details surface (title + traceId + errors{} + ErrorCode).
      // traceId is what ServiceTitan support asks for when you open a ticket.
      console.error('[api/intake] ServiceTitan error', {
        message: err.message,
        status: err.status,
        title: err.problem.title,
        traceId: err.problem.traceId,
        errorCode: err.problem.errorCode,
        errors: err.problem.errors
      });
      return json(
        {
          success: false,
          error: 'Unable to submit your request to our scheduling system. Please call us directly.'
        },
        { status: 502 }
      );
    }
    console.error('[api/intake] unexpected error', err);
    throw error(500, 'Internal error submitting intake');
  }
};
