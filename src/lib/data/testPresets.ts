/**
 * Test-mode intake presets.
 *
 * Each preset is a complete, valid intake that the wizard can load in one click
 * (see `intakeStore.loadPreset`) and jump straight to the review step, so an
 * operator can exercise the real ServiceTitan booking path without clicking
 * through every screen. Only surfaced when the server reports test mode
 * (STRIPE_MODE !== 'live') via /api/config — never shown to live customers.
 *
 * Every preset is marked TEST in the name/description so the resulting booking
 * is obvious (and deletable) on ServiceTitan's Job Booking screen. ZIPs are
 * chosen to hit specific OSC outcomes against the live GlassReports zone map:
 *   • 98101 (Seattle / Central Zone 1)  → Glass 1-4 resolves to $0  → no card
 *   • 98501 (Olympia / South South Zone)→ Glass 1-4 resolves to $175 → test card
 *   • 98402 (Tacoma)                    → commercial + Tacoma market
 *   • 98052 (Redmond / Eastside Zone 1) → emergency + interior routing
 */
import type {
  AddressInfo,
  CustomerInfo,
  IssueDetails,
  PropertyDetails,
  PropertyType,
  SchedulingPreference,
  SpecialInstructions
} from '$lib/types/intake';

export interface IntakePreset {
  id: string;
  /** Button label. */
  label: string;
  /** One-line note on what this preset exercises. */
  blurb: string;
  /** Must be a public job-type name from $lib/data/jobTypes. */
  jobTypeName: string;
  propertyType: PropertyType;
  propertyDetails?: Partial<PropertyDetails>;
  customer: CustomerInfo;
  address: AddressInfo;
  /** Merged over the default issue details (nested objects merge too). */
  issue?: Partial<IssueDetails>;
  special?: Partial<SpecialInstructions>;
  schedulingPreference: SchedulingPreference;
}

export const testPresets: IntakePreset[] = [
  {
    id: 'seattle-no-charge',
    label: 'Seattle · Glass 1–4 · $0 (no card)',
    blurb: 'Serviced ZIP that resolves to $0 — submits straight to ServiceTitan, no payment step.',
    jobTypeName: 'Glass Replacement (1-4 Panes) - Consultation',
    propertyType: 'Residential',
    customer: { firstName: 'TEST', lastName: 'Seattle (DELETE)', phone: '(206) 555-0101', email: 'test+seattle@example.com' },
    address: { street: '1100 4th Ave', city: 'Seattle', state: 'WA', zip: '98101' },
    issue: {
      serviceLocation: 'Front living-room window',
      description: 'TEST submission — please disregard / delete. Single cracked pane.',
      happenedAt: 'Yesterday',
      isSecure: true
    },
    schedulingPreference: 'This week'
  },
  {
    id: 'olympia-osc-175',
    label: 'Olympia · Glass 1–4 · $175 (test card)',
    blurb: 'Serviced ZIP with a $175 OSC — exercises the full Stripe authorize→capture path. Test card 4242 4242 4242 4242.',
    jobTypeName: 'Glass Replacement (1-4 Panes) - Consultation',
    propertyType: 'Residential',
    customer: { firstName: 'TEST', lastName: 'Olympia (DELETE)', phone: '(206) 555-0102', email: 'test+olympia@example.com' },
    address: { street: '1010 Capitol Way S', city: 'Olympia', state: 'WA', zip: '98501' },
    issue: {
      serviceLocation: 'Back door sidelite',
      description: 'TEST submission — please disregard / delete. Foggy IG unit.',
      happenedAt: 'Last week',
      isSecure: true
    },
    schedulingPreference: 'Flexible'
  },
  {
    id: 'tacoma-storefront',
    label: 'Tacoma · Storefront · Commercial',
    blurb: 'Commercial customer type + Tacoma market routing. Storefront/door system.',
    jobTypeName: 'Storefront & Door Replacement - Consultation',
    propertyType: 'Business',
    propertyDetails: { businessName: 'TEST Storefront Co (DELETE)', role: 'Manager' },
    customer: { firstName: 'TEST', lastName: 'Tacoma (DELETE)', phone: '(206) 555-0103', email: 'test+tacoma@example.com' },
    address: { street: '1102 Pacific Ave', city: 'Tacoma', state: 'WA', zip: '98402' },
    issue: {
      serviceLocation: 'Front entrance',
      description: 'TEST submission — please disregard / delete. Storefront door + glass replacement.',
      categoryDetails: { storefrontScope: 'Full system', doorOperational: 'no' }
    },
    schedulingPreference: 'Next week'
  },
  {
    id: 'redmond-emergency',
    label: 'Redmond · Emergency (after-hours)',
    blurb: 'Emergency routing — board-up urgency flags surface in the booking summary.',
    jobTypeName: 'Emergency Services (After Hours)',
    propertyType: 'Residential',
    customer: { firstName: 'TEST', lastName: 'Emergency (DELETE)', phone: '(206) 555-0104', email: 'test+emergency@example.com' },
    address: { street: '16205 NE 85th St', city: 'Redmond', state: 'WA', zip: '98052' },
    issue: {
      serviceLocation: 'Ground-floor rear window',
      description: 'TEST submission — please disregard / delete. Broken window, weather entering.',
      happenedAt: 'Tonight',
      isSecure: false,
      hasBrokenGlass: true,
      hasWaterOrWeatherEntry: true
    },
    schedulingPreference: 'As soon as possible'
  },
  {
    id: 'redmond-shower-interior',
    label: 'Redmond · Custom Shower (interior)',
    blurb: 'Interior/architectural-glass routing (shower-mirror → interior business unit).',
    jobTypeName: 'Custom Shower Enclosure - Consultation',
    propertyType: 'Residential',
    customer: { firstName: 'TEST', lastName: 'Shower (DELETE)', phone: '(206) 555-0105', email: 'test+shower@example.com' },
    address: { street: '2200 148th Ave NE', city: 'Redmond', state: 'WA', zip: '98052' },
    issue: {
      serviceLocation: 'Primary bathroom',
      description: 'TEST submission — please disregard / delete. Frameless enclosure quote.',
      categoryDetails: { showerMirrorType: 'Frameless shower', approximateSize: '60in x 72in' }
    },
    schedulingPreference: 'Flexible'
  }
];
