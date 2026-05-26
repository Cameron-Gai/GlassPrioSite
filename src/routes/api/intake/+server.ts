import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { IntakePayload } from '$lib/types/intake';

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

export const POST: RequestHandler = async ({ request }) => {
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

  // Mock: log the payload for now. Real ServiceTitan integration goes here.
  console.log('[api/intake] received payload', payload);

  return json({
    success: true,
    confirmationNumber: mockConfirmationNumber()
  });
};
