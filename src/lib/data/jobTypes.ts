export type JobPriority = 'Urgent' | 'High' | 'Normal' | 'Low';

export type ConsultationFormat = 'on-site' | 'virtual' | 'none';

export interface PricingInfo {
  /** Short customer-facing price line, e.g. "$45 trip charge" or "Free consultation". */
  display: string;
  /** Longer explanation of what the fee covers and how it applies. */
  detail?: string;
  /** Optional rebate / credit shown as a positive callout. */
  rebate?: string;
}

export interface JobType {
  name: string;
  priority: JobPriority;
  duration: string;
  category: string;
  customerFacing: boolean;
  publicIntakeEnabled: boolean;
  /** Short, plain-language label shown to the customer (no internal jargon). */
  customerLabel?: string;
  /** One-line summary of what we'll do. */
  summary?: string;
  /** Bullet points of what's included / what to expect. */
  includes?: string[];
  pricing?: PricingInfo;
  consultationFormat?: ConsultationFormat;
  /**
   * When true, the intake requires at least one photo before the customer can
   * continue past the site step. Used for services that always begin with a
   * remote consultation (shower enclosures). Mirrors are virtual too but photos
   * are optional there — they can send them later.
   */
  requiresPhoto?: boolean;
}

export const jobTypes: JobType[] = [
  {
    name: 'Advanced Measurement System (AMS)',
    priority: 'High',
    duration: '2 hours',
    category: 'measurement',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Preemptive Measurement',
    summary:
      'Measure your windows now — before anything breaks. We document every opening with photos and keep the schedule on file, so any future glass replacement skips the measurement step and is discounted.',
    includes: [
      'Detailed on-site measurement of every window and opening',
      'Documented with photos and kept on file',
      'Future replacements skip the measure — faster and discounted'
    ],
    pricing: {
      display: '$350 per building',
      rebate: 'Future repairs skip the measure fee'
    },
    consultationFormat: 'on-site'
  },
  {
    // Booked internally by a client manager — not exposed in public intake.
    name: 'Critical - Measure and Installation Requirements',
    priority: 'High',
    duration: '1 hour',
    category: 'measurement',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Custom Shower Enclosure - Consultation',
    priority: 'Normal',
    duration: '45 minutes',
    category: 'shower-mirror',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Custom Shower Enclosure — Virtual Consultation',
    summary:
      'We start with a virtual consultation using your photos. We finalize once your tile work is complete.',
    includes: [
      'Virtual consultation reviewing your photos',
      'Rough estimate provided remotely',
      'On-site critical measurement once accepted'
    ],
    pricing: {
      display: '$125 deposit on acceptance',
      detail:
        'A $125 non-refundable deposit is collected when you accept the rough estimate. It is applied toward the final invoice.'
    },
    consultationFormat: 'virtual',
    // Showers always start with a remote consultation, so a photo is required.
    requiresPhoto: true
  },
  {
    name: 'Custom Shower Enclosure - Installation',
    priority: 'Normal',
    duration: '2 hours',
    category: 'shower-mirror',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Custom Mirrors - Consultation',
    priority: 'Normal',
    duration: '45 minutes',
    category: 'shower-mirror',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Custom Mirror — Virtual Consultation',
    summary:
      'We start with a virtual consultation using your photos to scope a custom wall, vanity, or gym mirror.',
    includes: [
      'Virtual consultation reviewing your photos',
      'Rough estimate provided remotely',
      'On-site critical measurement once accepted'
    ],
    pricing: {
      display: '$125 deposit on acceptance',
      detail:
        'A $125 non-refundable deposit is collected when you accept the rough estimate. It is applied toward the final invoice.'
    },
    consultationFormat: 'virtual'
  },
  {
    name: 'Custom Mirrors - Installation',
    priority: 'Normal',
    duration: '2 hours',
    category: 'shower-mirror',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Emergency Services (After Hours)',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'emergency',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Emergency Service — After Hours',
    summary: 'A professional on-site within 3 hours, after business hours.',
    includes: [
      'Up to 1 hour of on-site labor',
      'Materials for one standard board-up',
      'Cleanup of broken glass and debris',
      'Additional work quoted and approved before starting'
    ],
    pricing: { display: '$575' }
  },
  {
    name: 'Glass Replacement (1-4 Panes) - Consultation',
    priority: 'Normal',
    duration: '30 minutes',
    category: 'glass-replacement',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Glass Replacement (1–4 panes) — Consultation',
    summary: 'On-site assessment and quote for replacing one to four panes / IG units.',
    includes: ['On-site assessment', 'Measurements taken', 'Written quote provided'],
    pricing: {
      display: '$45 trip charge',
      detail: 'Credited toward the repair when you proceed.',
      rebate: 'Credited toward repair'
    },
    consultationFormat: 'on-site'
  },
  {
    name: 'Glass Replacement (1-4 Panes) - Installation',
    priority: 'Normal',
    duration: '1 hour',
    category: 'glass-replacement',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Glass Replacement (5+ Panes) - Consultation',
    priority: 'High',
    duration: '1 hour',
    category: 'glass-replacement',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Glass Replacement (5+ panes) — Consultation',
    summary: 'On-site assessment and quote for replacing five or more panes / IG units.',
    includes: ['On-site assessment', 'Measurements for all panes', 'Written quote provided'],
    pricing: {
      display: 'Free consultation'
    },
    consultationFormat: 'on-site'
  },
  {
    name: 'Glass Replacement (5+ Panes) - Installation',
    priority: 'High',
    duration: '4 hours',
    category: 'glass-replacement',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Hardware Service Consultation - Commercial',
    priority: 'Normal',
    duration: '1 hour 30 minutes',
    category: 'hardware',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Hardware Service — Commercial',
    summary:
      'Assessment and diagnostic for commercial window or door hardware. The $350 fee covers the first hour of work.',
    includes: [
      'Diagnostic and assessment',
      'First hour of labor',
      'Proposal for any additional parts or labor'
    ],
    pricing: {
      display: '$350',
      detail:
        'Covers diagnostic + first hour. If we can’t offer a solution, only the $125 site assessment fee applies.',
      rebate: 'Applied toward the repair'
    },
    consultationFormat: 'on-site'
  },
  {
    name: 'Hardware Service Consultation - Residential',
    priority: 'Normal',
    duration: '1 hour 30 minutes',
    category: 'hardware',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Hardware Service — Residential',
    summary:
      'Assessment and diagnostic for residential window or door hardware. The $350 fee covers the first hour of work.',
    includes: [
      'Diagnostic and assessment',
      'First hour of labor',
      'Proposal for any additional parts or labor'
    ],
    pricing: {
      display: '$350',
      detail:
        'Covers diagnostic + first hour. If we can’t offer a solution, only the $125 site assessment fee applies.',
      rebate: 'Applied toward the repair'
    },
    consultationFormat: 'on-site'
  },
  {
    name: 'Multiservice Consultation',
    priority: 'High',
    duration: '1 hour 30 minutes',
    category: 'multiservice',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Multi-Service Consultation',
    summary: 'A single appointment that reviews several different services for your property.',
    includes: ['Review of each service requested', 'Combined measurements and quote'],
    pricing: { display: 'Quoted on-site' },
    consultationFormat: 'on-site'
  },
  {
    name: 'Multiservice Installation',
    priority: 'High',
    duration: '4 hours',
    category: 'multiservice',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'New Construction - Install (Jobs over $10,000) Only Used For Invoicing',
    priority: 'Normal',
    duration: '2 hours',
    category: 'new-construction',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'New Window Replacement (1-2 Frames) - Consultation',
    priority: 'Normal',
    duration: '45 minutes',
    category: 'window-replacement',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Full Window Replacement (1–2 windows) — Consultation',
    summary:
      'On-site assessment and quote to replace 1–2 brand-new windows — frames and glass included (not glass-only).',
    includes: ['New window (frame + glass) assessment', 'Measurements', 'Written quote'],
    pricing: { display: 'Free consultation' },
    consultationFormat: 'on-site'
  },
  {
    name: 'New Window Replacement (1-2 Frames) - Installation',
    priority: 'Normal',
    duration: '1 hour',
    category: 'window-replacement',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'New Window Replacement (3+ Frames) - Consultation',
    priority: 'High',
    duration: '1 hour',
    category: 'window-replacement',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Full Window Replacement (3+ windows) — Consultation',
    summary:
      'On-site assessment and quote to replace 3 or more brand-new windows — frames and glass included (not glass-only).',
    includes: ['New window (frame + glass) assessment for each opening', 'Measurements', 'Written quote'],
    pricing: { display: 'Free consultation' },
    consultationFormat: 'on-site'
  },
  {
    name: 'New Window Replacement (3+ Frames) - Installation',
    priority: 'High',
    duration: '8 hours',
    category: 'window-replacement',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Other',
    priority: 'Low',
    duration: '15 minutes',
    category: 'other',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Other request — Client manager review',
    summary:
      'For requests outside our standard services (such as shop fabrication or carryout). A client manager will review and follow up.',
    includes: [
      'Reviewed by a client manager',
      'You’ll hear back about whether we send a consultant, quote remotely, or refer you elsewhere'
    ],
    pricing: { display: 'No charge to submit' },
    consultationFormat: 'none'
  },
  {
    name: 'Patio Door - Consultation',
    priority: 'High',
    duration: '30 minutes',
    category: 'patio-pet-door',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Patio Door — Consultation',
    summary: 'On-site assessment and quote for patio door installation or repair.',
    includes: ['On-site assessment', 'Measurements', 'Written quote'],
    pricing: { display: 'Quoted on-site' },
    consultationFormat: 'on-site'
  },
  {
    name: 'Patio Door - Installation',
    priority: 'High',
    duration: '4 hours',
    category: 'patio-pet-door',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Pet Door - Consultation',
    priority: 'High',
    duration: '30 minutes',
    category: 'patio-pet-door',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Pet Door — Consultation',
    summary: 'On-site assessment and quote for pet door installation or repair.',
    includes: ['On-site assessment', 'Measurements', 'Written quote'],
    pricing: { display: 'Quoted on-site' },
    consultationFormat: 'on-site'
  },
  {
    name: 'Pet Door - Installation',
    priority: 'High',
    duration: '4 hours',
    category: 'patio-pet-door',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Priority Service (Business Hours)',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'emergency',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Priority Service — Business Hours',
    summary: 'A professional on-site within 2 hours during business hours.',
    includes: [
      'Up to 1 hour of on-site labor',
      'Materials for one standard board-up',
      'Cleanup of broken glass and debris'
    ],
    pricing: {
      display: '$399',
      rebate: '$199 rebate if you proceed with the repair'
    }
  },
  {
    name: 'Storefront & Door Replacement - Consultation',
    priority: 'High',
    duration: '45 minutes',
    category: 'storefront-door',
    customerFacing: true,
    publicIntakeEnabled: true,
    customerLabel: 'Storefront / Door System — Consultation',
    summary:
      'Replacement of a storefront system: new metal framing, doors, and glass. (Applies to residential properties too.)',
    includes: [
      'On-site assessment of framing, doors, and glass',
      'Measurements',
      'Written quote'
    ],
    pricing: { display: 'Quoted on-site' },
    consultationFormat: 'on-site'
  },
  {
    name: 'Storefront & Door Replacement - Installation',
    priority: 'High',
    duration: '1 hour 30 minutes',
    category: 'storefront-door',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    // Warranty work is handled outside of the public intake site.
    name: 'Warranty Assessment',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'warranty',
    customerFacing: false,
    publicIntakeEnabled: false
  },
  {
    name: 'Warranty Repair',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'warranty',
    customerFacing: false,
    publicIntakeEnabled: false
  }
];

export function getJobType(name: string): JobType {
  const job = jobTypes.find((entry) => entry.name === name);
  if (!job) {
    throw new Error(`Unknown ServiceTitan job type: ${name}`);
  }
  return job;
}

export function getPublicJobType(name: string): JobType {
  const job = getJobType(name);
  if (!job.publicIntakeEnabled) {
    throw new Error(`Job type "${name}" is not enabled for public intake.`);
  }
  return job;
}
