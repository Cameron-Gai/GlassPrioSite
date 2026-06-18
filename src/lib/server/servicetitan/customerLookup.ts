import type { ServiceTitanConfig } from './config';
import { stRequest, ServiceTitanError } from './client';

/**
 * Returning-customer lookup for the intake form's autofill.
 *
 * PRIVACY: this backs a PUBLIC endpoint, so it deliberately requires a
 * TWO-FACTOR match — the phone AND an email on the same ServiceTitan customer
 * record must both match before we reveal anything. That defeats phone-number
 * enumeration (an attacker would also need each victim's email). The endpoints
 * layer on per-IP rate limiting; this module never returns data on a
 * single-factor (phone-only) match.
 *
 * Requires the ServiceTitan app to have CRM Customers: Read and Locations:
 * Read. If the scope is missing the calls 403 and we fail closed (no match),
 * so the feature simply stays dormant until the scope is granted.
 */

interface STCustomer {
  id: number;
  name?: string;
  active?: boolean;
}

interface STContact {
  type?: string;
  value?: string;
}

interface STLocationAddress {
  street?: string;
  unit?: string;
  city?: string;
  state?: string;
  zip?: string;
}

interface STLocation {
  id: number;
  address?: STLocationAddress;
  active?: boolean;
}

interface ListEnvelope<T> {
  data?: T[];
}

export interface ReturningCustomerMatch {
  firstName: string;
  lastName: string;
  address: { street: string; city: string; state: string; zip: string } | null;
}

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const space = trimmed.indexOf(' ');
  if (space < 0) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}

/**
 * Find a customer whose phone AND email both match. Returns null on no match,
 * on missing scope (403), or on any ServiceTitan error — callers treat all of
 * these as "not a returning customer".
 */
export async function findReturningCustomer(
  config: ServiceTitanConfig,
  phone: string,
  email: string
): Promise<ReturningCustomerMatch | null> {
  const normalizedPhone = normalizePhone(phone);
  const normalizedEmail = email.trim().toLowerCase();
  if (normalizedPhone.length < 10 || !normalizedEmail) return null;

  let customers: STCustomer[];
  try {
    const res = await stRequest<ListEnvelope<STCustomer>>(config, 'crm/v2', 'customers', {
      query: { phone: normalizedPhone, pageSize: 25, active: 'True' }
    });
    customers = res.data ?? [];
  } catch (error) {
    if (error instanceof ServiceTitanError) {
      // Most likely the CRM Customers: Read scope isn't granted/approved yet.
      // Log it so "permissions are set" is verifiable; fail closed otherwise.
      if (error.status === 403) {
        console.warn('[customerLookup] 403 from customers query — CRM Customers: Read scope missing or not yet approved.');
      }
      return null;
    }
    throw error;
  }

  for (const customer of customers) {
    let contacts: STContact[] = [];
    try {
      // pageSize 100 so a customer with many contacts (multiple emails/phones)
      // is fully covered — we match against every email on the record.
      const res = await stRequest<ListEnvelope<STContact>>(
        config,
        'crm/v2',
        `customers/${customer.id}/contacts`,
        { query: { pageSize: 100 } }
      );
      contacts = res.data ?? [];
    } catch {
      continue;
    }

    // A customer can have several email contacts — match if ANY of them equals
    // the entered email (case/whitespace-insensitive).
    const emailMatches = contacts.some(
      (c) => (c.type ?? '').toLowerCase() === 'email' && (c.value ?? '').trim().toLowerCase() === normalizedEmail
    );
    if (!emailMatches) continue;

    // Two-factor match confirmed. Pull the most recent active location address.
    let address: ReturningCustomerMatch['address'] = null;
    try {
      const res = await stRequest<ListEnvelope<STLocation>>(config, 'crm/v2', 'locations', {
        query: { customerId: customer.id, pageSize: 10, active: 'True' }
      });
      const loc = (res.data ?? [])[0];
      if (loc?.address) {
        address = {
          street: loc.address.street ?? '',
          city: loc.address.city ?? '',
          state: loc.address.state ?? '',
          zip: loc.address.zip ?? ''
        };
      }
    } catch {
      // Address is best-effort; a name-only prefill is still useful.
    }

    const { firstName, lastName } = splitName(customer.name ?? '');
    return { firstName, lastName, address };
  }

  return null;
}
