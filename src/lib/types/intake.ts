import type { JobPriority } from '$lib/data/jobTypes';

export type PropertyType =
  | 'Residential'
  | 'Commercial'
  | 'New construction'
  | 'Property management / multifamily'
  | 'Other'
  | '';

export type SchedulingPreference =
  | 'As soon as possible'
  | 'Today'
  | 'Tomorrow'
  | 'This week'
  | 'Flexible'
  | '';

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

export interface IssueDetails {
  description: string;
  happenedAt: string;
  isSecure: boolean;
  hasBrokenGlass: boolean;
  hasWaterOrWeatherEntry: boolean;
  photos: string[];
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
}

export interface IntakePayload {
  source: 'customer-intake-site';
  selectedJobType: SelectedJobTypeSummary;
  routing: RoutingSummary;
  customer: CustomerInfo;
  address: AddressInfo;
  propertyType: PropertyType;
  answers: Record<string, string>;
  issueDetails: IssueDetails;
  schedulingPreference: SchedulingPreference;
  createdAt: string;
}
