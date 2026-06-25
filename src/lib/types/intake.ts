import type { JobPriority } from '$lib/data/jobTypes';

export type PropertyType =
  | 'Residential'
  | 'Business'
  | 'Multi-family'
  | 'Other'
  | '';

export type SchedulingPreference =
  | 'As soon as possible'
  | 'Today'
  | 'Tomorrow'
  | 'This week'
  | 'Next week'
  | 'Flexible'
  | '';

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
  /** Business / company name (when property type is Business). */
  businessName: string;
  /** Apartment or complex name (when property type is Multi-family). */
  complexName: string;
  /** The submitter's role at the property. */
  role: PropertyContactRole;
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
  createdAt: string;
}
