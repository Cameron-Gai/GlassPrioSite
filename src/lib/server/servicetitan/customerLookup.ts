import type { ServiceTitanConfig } from './config';
import { stRequest, ServiceTitanError } from './client';

/**
 * Returning-customer lookup for the intake form's autofill + account linking.
 *
 * PRIVACY: this backs a PUBLIC endpoint, so it requires a TWO-FACTOR match — a
 * customer is only "recognized" when at least 2 of 4 identifying fields (phone,
 * email, name, service address) match the SAME ServiceTitan customer record.
 * One field alone (e.g. a phone number) never reveals anything, which defeats
 * simple enumeration. The endpoints add per-IP rate limiting, the first-name is
 * the only thing surfaced on the initial lookup, and the customer/location ids
 * used for booking linkage are only returned after an explicit "yes, that's me".
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

// TODO(memberships): this operation sells ServiceTitan Memberships, but the intake
// neither checks for nor surfaces a matched customer's membership status. A
// returning member currently gets no recognition, member pricing, or member
// benefit here. Future work: on a confirmed match, fetch memberships
// (memberships/v2 customers/{id}/memberships) and surface active-member status +
// any member OSC/pricing to the customer and onto the booking. Coordinate with the
// GlassReports OSC/zone pipeline so member pricing is authoritative server-side.

export interface ReturningLookupInput {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  address: { street: string; city: string; state: string; zip: string };
}

export interface ReturningCustomerMatch {
  customerId: number;
  /** The location whose address matched, else the customer's primary active location. */
  locationId: number | null;
  firstName: string;
  lastName: string;
}

/** How many distinct customers we're willing to inspect per lookup (bounds API calls). */
const MAX_CANDIDATES = 12;
/** Minimum identifying fields that must match the same record to count as returning. */
const MIN_MATCHING_FIELDS = 2;

function normalizePhone(raw: string): string {
  const digits = (raw ?? '').replace(/[^0-9]/g, '');
  return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
}

const STREET_SUFFIXES: Record<string, string> = {
  st: 'street', str: 'street', ave: 'avenue', av: 'avenue', blvd: 'boulevard',
  rd: 'road', dr: 'drive', ln: 'lane', ct: 'court', pl: 'place', ter: 'terrace',
  hwy: 'highway', pkwy: 'parkway', cir: 'circle', apt: 'apartment', ste: 'suite',
  n: 'north', s: 'south', e: 'east', w: 'west', ne: 'northeast', nw: 'northwest',
  se: 'southeast', sw: 'southwest'
};

/** Loosely normalize a street so "123 Main St" and "123 Main Street" compare equal. */
function normalizeStreet(raw: string): string {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[.,#]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => STREET_SUFFIXES[word] ?? word)
    .join(' ')
    .trim();
}

/** Tokens of a name, lowercased and stripped of punctuation. */
function nameTokens(raw: string): string[] {
  return (raw ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** A name matches when the customer record's name contains both the entered
 *  first and last name tokens (handles "First M Last", "Last, First", etc.). */
function nameMatches(customerName: string | undefined, firstName: string, lastName: string): boolean {
  const first = firstName.trim().toLowerCase();
  const last = lastName.trim().toLowerCase();
  if (!first || !last) return false;
  const tokens = new Set(nameTokens(customerName ?? ''));
  return tokens.has(first) && tokens.has(last);
}

function splitName(full: string): { firstName: string; lastName: string } {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { firstName: '', lastName: '' };
  const space = trimmed.indexOf(' ');
  if (space < 0) return { firstName: trimmed, lastName: '' };
  return { firstName: trimmed.slice(0, space), lastName: trimmed.slice(space + 1) };
}

function addressMatches(loc: STLocationAddress | undefined, wantStreet: string, wantZip: string): boolean {
  if (!loc) return false;
  const zip = (loc.zip ?? '').trim().slice(0, 5);
  const wantZip5 = wantZip.slice(0, 5);
  const street = normalizeStreet(loc.street ?? '');
  if (!wantStreet || !wantZip5) return false;
  // Zip must agree, and the street must match (loose) — same normalized street,
  // or the same leading house number + first street word.
  if (zip !== wantZip5) return false;
  if (street === wantStreet) return true;
  const a = street.split(' ');
  const b = wantStreet.split(' ');
  return a[0] === b[0] && a[1] === b[1];
}

/** Query customers by a single filter, tolerating a missing scope (403 → []). */
async function queryCustomers(
  config: ServiceTitanConfig,
  query: Record<string, string | number>
): Promise<STCustomer[]> {
  try {
    const res = await stRequest<ListEnvelope<STCustomer>>(config, 'crm/v2', 'customers', { query });
    return res.data ?? [];
  } catch (error) {
    if (error instanceof ServiceTitanError) {
      if (error.status === 403) {
        console.warn('[customerLookup] 403 from customers query — CRM Customers: Read scope missing or not yet approved.');
      }
      return [];
    }
    throw error;
  }
}

/**
 * Find a customer where at least 2 of {phone, email, name, address} match. We
 * gather candidates by phone AND by name (bounded + de-duped), then score each,
 * fetching contacts/locations lazily and returning on the FIRST record that
 * clears the 2-field bar. Returns null on no match, missing scope, or any error.
 */
export async function findReturningCustomer(
  config: ServiceTitanConfig,
  input: ReturningLookupInput
): Promise<ReturningCustomerMatch | null> {
  const phone = normalizePhone(input.phone);
  const email = input.email.trim().toLowerCase();
  const hasName = !!input.firstName.trim() && !!input.lastName.trim();
  const fullName = `${input.firstName} ${input.lastName}`.trim();
  const wantStreet = normalizeStreet(input.address.street);
  const wantZip = (input.address.zip ?? '').trim();

  // Need at least 2 identifying fields present to even attempt a 2-of-4 match —
  // guards the public endpoint against single-field probing.
  const presentFields = [phone.length >= 10, !!email, hasName, !!(wantStreet && wantZip)].filter(Boolean).length;
  if (presentFields < MIN_MATCHING_FIELDS) return null;

  // Gather candidates. We can only cheaply search by phone and by name; email/
  // address are verified per-candidate. De-dupe by id and remember how each was
  // found so we can credit the corresponding field without an extra call.
  const candidates = new Map<number, STCustomer>();
  const foundByPhone = new Set<number>();

  if (phone.length >= 10) {
    for (const c of await queryCustomers(config, { phone, pageSize: 10, active: 'True' })) {
      candidates.set(c.id, c);
      foundByPhone.add(c.id);
    }
  }
  if (hasName && candidates.size < MAX_CANDIDATES) {
    for (const c of await queryCustomers(config, { name: fullName, pageSize: 10, active: 'True' })) {
      if (!candidates.has(c.id)) candidates.set(c.id, c);
    }
  }
  if (candidates.size === 0) return null;

  for (const customer of [...candidates.values()].slice(0, MAX_CANDIDATES)) {
    const factors = new Set<string>();
    if (foundByPhone.has(customer.id)) factors.add('phone');
    if (nameMatches(customer.name, input.firstName, input.lastName)) factors.add('name');

    // If the free checks already clear the bar, no network calls needed.
    if (factors.size < MIN_MATCHING_FIELDS && (email || (phone.length >= 10 && !factors.has('phone')))) {
      try {
        const res = await stRequest<ListEnvelope<STContact>>(
          config,
          'crm/v2',
          `customers/${customer.id}/contacts`,
          { query: { pageSize: 100 } }
        );
        const contacts = res.data ?? [];
        if (email && contacts.some((c) => (c.type ?? '').toLowerCase() === 'email' && (c.value ?? '').trim().toLowerCase() === email)) {
          factors.add('email');
        }
        if (phone.length >= 10 && contacts.some((c) => normalizePhone(c.value ?? '') === phone)) {
          factors.add('phone');
        }
      } catch {
        // Contacts unavailable for this candidate — fall through to address.
      }
    }

    // Address is both a matching factor AND the source of the location id we link
    // the booking to, so we always resolve locations here (even when the record
    // already cleared the bar, so we can attach the right location id).
    let matchedLocationId: number | null = null;
    let primaryLocationId: number | null = null;
    try {
      const res = await stRequest<ListEnvelope<STLocation>>(config, 'crm/v2', 'locations', {
        query: { customerId: customer.id, pageSize: 25, active: 'True' }
      });
      const locations = res.data ?? [];
      primaryLocationId = locations[0]?.id ?? null;
      for (const loc of locations) {
        if (addressMatches(loc.address, wantStreet, wantZip)) {
          factors.add('address');
          matchedLocationId = loc.id;
          break;
        }
      }
    } catch {
      // Locations best-effort; a match on other factors still stands.
    }

    if (factors.size >= MIN_MATCHING_FIELDS) {
      const { firstName, lastName } = splitName(customer.name ?? '');
      // Prefer the location that matched the entered address; else the primary.
      return {
        customerId: customer.id,
        locationId: matchedLocationId ?? primaryLocationId,
        firstName,
        lastName
      };
    }
  }

  return null;
}
