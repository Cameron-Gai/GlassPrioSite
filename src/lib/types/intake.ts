import type { JobPriority } from '$lib/data/jobTypes';

export type PropertyType =
  | 'Residential'
  | 'Business'
  | 'Multi-family'
  | 'Facility maintenance'
  | 'Other'
  | '';

/** Customer-facing labels. Stored values stay stable ('Multi-family' predates
 *  the "Apartments/Multifamily" label) so old drafts and the ServiceTitan
 *  mapping never break. */
export const PROPERTY_TYPE_LABELS: Record<Exclude<PropertyType, ''>, string> = {
  Residential: 'Residential',
  Business: 'Business',
  'Multi-family': 'Apartments/Multifamily',
  'Facility maintenance': 'Facility maintenance company',
  Other: 'Other'
};

export function propertyTypeLabel(t: PropertyType): string {
  return t ? PROPERTY_TYPE_LABELS[t] : '';
}

/**
 * The customer's requested service day:
 *   ''         — not picked yet
 *   'flexible' — first available / no preference
 *   YYYY-MM-DD — a concrete calendar date picked from the next business days
 * The arrival window (Morning/Midday/Afternoon) is stored separately in
 * SpecialInstructions.preferredWindow. Both are advisory — the office confirms
 * the real appointment — and the form says so.
 * (Legacy values 'This week'/'Next week'/'Flexible' may exist in old drafts and
 * are still understood by the server's booking-start derivation.)
 */
export type SchedulingPreference = string;

/** Who the submitter is relative to the property (options depend on property type). */
export type PropertyContactRole =
  | ''
  | 'Manager'
  | 'Employee'
  | 'Other'
  | 'Maintenance'
  | 'Tenant';

/** Property-type-specific details collected on the property-type step. */
export interface PropertyDetails {
  /** Business / company name (when property type is Business), or the business
   *  being serviced (when property type is Facility maintenance). */
  businessName: string;
  /** Apartment or complex name (when property type is Multi-family). */
  complexName: string;
  /** The submitter's role at the property. */
  role: PropertyContactRole;
  /** Facility maintenance only: the maintenance company's own name (they call
   *  on behalf of businessName). Mirrors the GoSameDay phone-script questions. */
  facilityCompany: string;
  /** Facility maintenance only: the work order the job bills against. Optional —
   *  blank means "pending; confirm with the caller". */
  workOrderNumber: string;
}

/** The person who'll be at the property, when different from the requester. */
export interface OnSiteContact {
  differs: boolean;
  name: string;
  phone: string;
}

export interface CustomerInfo {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export type BlockedAccess = 'no' | 'yes' | 'unsure';

export interface WindowAccessInfo {
  /** What floor(s) the window/work area is on. */
  floors: string;
  /** Whether anything is blocking access to it/them. */
  blocked: BlockedAccess;
  /** Description of the obstruction (when blocked === 'yes'). */
  blockedNotes: string;
}

export interface SpecialInstructions {
  gateCode: string;
  hasDog: boolean;
  parkingNotes: string;
  preferredWindow: string;
  other: string;
}

export interface CategoryDetails {
  /** Storefront only: what part is being replaced/upgraded. */
  storefrontScope?: string;
  /** Storefront only: is the door currently operational? */
  doorOperational?: 'yes' | 'no' | 'unsure' | '';
  /** Shower/mirror only: type wanted (frameless / semi / framed; wall / vanity / gym). */
  showerMirrorType?: string;
  /** Shower/mirror only: approximate size. */
  approximateSize?: string;
  /** Hardware only: a short description of the hardware problem. */
  hardwareProblem?: string;
  /** Multi-service only: services they want combined. */
  multiServiceList?: string;
}

export interface UploadedPhoto {
  /** Client-generated unique id — the list key and removal handle. (File names
   *  collide: camera rolls hand every pick the same "image.jpg".) */
  id: string;
  /** Original file name, for display + the booking summary. */
  name: string;
  /** Compressed JPEG as a data URL (data:image/jpeg;base64,...). */
  dataUrl: string;
}

export interface IssueDetails {
  serviceLocation: string;
  description: string;
  happenedAt: string;
  isSecure: boolean;
  hasBrokenGlass: boolean;
  hasWaterOrWeatherEntry: boolean;
  windowAccess: WindowAccessInfo;
  photos: UploadedPhoto[];
  categoryDetails: CategoryDetails;
}

export interface SelectedJobTypeSummary {
  name: string;
  priority: JobPriority | '';
  duration: string;
  category: string;
}

export interface RoutingSummary {
  isEmergency: boolean;
  isDuringBusinessHours: boolean;
  businessHoursTimezone: string;
  routedBy: 'triage-tree';
  priorityUpgrade: boolean;
}

export interface IntakePayload {
  source: 'customer-intake-site';
  selectedJobType: SelectedJobTypeSummary;
  routing: RoutingSummary;
  customer: CustomerInfo;
  address: AddressInfo;
  propertyType: PropertyType;
  propertyDetails: PropertyDetails;
  onSiteContact: OnSiteContact;
  answers: Record<string, string>;
  issueDetails: IssueDetails;
  specialInstructions: SpecialInstructions;
  schedulingPreference: SchedulingPreference;
  /** Stripe PaymentIntent id for the authorized on-site charge, when one was collected. */
  paymentIntentId?: string | null;
  /** True when the customer chose "Pay later" — book unpaid; GlassReports texts the
   *  OSC payment link once the booking is converted to a scheduled job. */
  payLater?: boolean;
  /** The number the OSC payment link is texted to (pay-later only). Defaults to
   *  the contact phone but the customer can point it at a different number. */
  payLaterPhone?: string;
  /** Explicit opt-in to receive the payment-link text. Pay-later is only honored
   *  when this is true — without consent we can't collect the OSC by text. */
  textConsent?: boolean;
  /** True when the customer opted into a remote (virtual) consultation instead of an
   *  on-site visit: the OSC is waived until we roll a truck, and a photo is required. */
  remoteConsult?: boolean;
  /** Set when the returning-customer lookup matched an existing ServiceTitan record.
   *  Lets the booking flag first-time correctly and link to the right customer at
   *  conversion instead of relying solely on ServiceTitan's native dedupe. */
  returningCustomer?: {
    matched: boolean;
    customerId: number | null;
    locationId: number | null;
  };
  createdAt: string;
}
