/**
 * Inbound ad leads — the contact details a partner's landing page collected
 * BEFORE sending the visitor to /book (Mancini Digital first, decided with
 * Mike and Jim 2026-10-09). Mike's short form (name / phone / email) pushes
 * each lead here through Zapier, then redirects the visitor to /book with a
 * matching key on the URL; /book polls for the lead and prefills the contact
 * step so nobody types their details twice.
 *
 * The match key is the partner's own lead id (`lid` on the URL) and/or the
 * Google click id the landing page already carries. Keys are only good for
 * prefill: short ones are refused (an enumerable id would leak contact info),
 * and leads expire after a few hours.
 *
 * In-memory on purpose: GlassPrioSite has no database, and a lead only needs
 * to live long enough for its visitor to reach the contact step. A restart
 * just means that visitor types their details — Mike's Google sheet still has
 * every lead either way.
 */

export interface InboundLead {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  zip: string;
  receivedAt: number;
}

const TTL_MS = 3 * 60 * 60 * 1000;
const MAX_LEADS = 5000;
/** Shortest key we'll match on. Google click ids run ~50–100 chars; a partner
 *  lead id must be at least this long (a random id, not a running number). */
export const MIN_KEY_LENGTH = 12;

const leads = new Map<string, InboundLead>();

function prune(now: number) {
  for (const [key, lead] of leads) {
    if (now - lead.receivedAt > TTL_MS) leads.delete(key);
  }
  // Map keeps insertion order, so the oldest go first.
  while (leads.size > MAX_LEADS) {
    const oldest = leads.keys().next().value;
    if (oldest === undefined) break;
    leads.delete(oldest);
  }
}

export function cleanKey(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const key = raw.trim();
  if (key.length < MIN_KEY_LENGTH || key.length > 200) return null;
  return /^[\w\-.~]+$/.test(key) ? key : null;
}

export function saveInboundLead(keys: string[], lead: Omit<InboundLead, 'receivedAt'>): number {
  const now = Date.now();
  prune(now);
  const usable = [...new Set(keys.map(cleanKey).filter((k): k is string => !!k))];
  for (const key of usable) {
    leads.delete(key); // re-insert so a resend counts as newest
    leads.set(key, { ...lead, receivedAt: now });
  }
  return usable.length;
}

export function findInboundLead(key: string): InboundLead | null {
  const k = cleanKey(key);
  if (!k) return null;
  const lead = leads.get(k);
  if (!lead) return null;
  if (Date.now() - lead.receivedAt > TTL_MS) {
    leads.delete(k);
    return null;
  }
  return lead;
}

// ---------------------------------------------------------------------------
// Reading a Zapier payload. We don't control Mike's field names, so accept the
// usual spellings, case- and punctuation-insensitively.
// ---------------------------------------------------------------------------

const FIELD_ALIASES = {
  lid: ['lid', 'leadid', 'ref', 'reference', 'submissionid', 'entryid'],
  gclid: ['gclid'],
  gbraid: ['gbraid'],
  wbraid: ['wbraid'],
  firstName: ['firstname', 'first', 'fname', 'givenname'],
  lastName: ['lastname', 'last', 'lname', 'surname', 'familyname'],
  fullName: ['name', 'fullname', 'yourname', 'contactname'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'cell', 'telephone', 'tel'],
  email: ['email', 'emailaddress', 'mail'],
  zip: ['zip', 'zipcode', 'postalcode', 'postal', 'postcode']
} as const;

type Field = keyof typeof FIELD_ALIASES;

const squash = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, '');

function text(v: unknown, max: number): string {
  if (typeof v === 'number') v = String(v);
  if (typeof v !== 'string') return '';
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export interface ParsedInboundLead {
  keys: string[];
  lead: Omit<InboundLead, 'receivedAt'>;
}

export function parseInboundLead(raw: Record<string, unknown>): ParsedInboundLead {
  const byKey = new Map<string, unknown>();
  for (const [k, v] of Object.entries(raw)) byKey.set(squash(k), v);
  const get = (field: Field, max = 120) => {
    for (const alias of FIELD_ALIASES[field]) {
      const v = text(byKey.get(alias), max);
      if (v) return v;
    }
    return '';
  };

  let firstName = get('firstName', 60);
  let lastName = get('lastName', 60);
  const fullName = get('fullName', 120);
  if (!firstName && fullName) {
    const [first, ...rest] = fullName.split(' ');
    firstName = first;
    lastName = lastName || rest.join(' ');
  }
  const email = get('email', 120);
  const zipMatch = get('zip', 20).match(/\d{5}/);

  return {
    keys: [get('lid', 200), get('gclid', 200), get('gbraid', 200), get('wbraid', 200)].filter(Boolean),
    lead: {
      firstName,
      lastName,
      phone: get('phone', 40),
      email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '',
      zip: zipMatch ? zipMatch[0] : ''
    }
  };
}
