export type JobPriority = 'Urgent' | 'High' | 'Normal' | 'Low';

export interface JobType {
  name: string;
  priority: JobPriority;
  duration: string;
  category: string;
  customerFacing: boolean;
  publicIntakeEnabled: boolean;
}

export const jobTypes: JobType[] = [
  {
    name: 'Advanced Measurement System (AMS)',
    priority: 'High',
    duration: '2 hours',
    category: 'measurement',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Critical - Measure and Installation Requirements',
    priority: 'High',
    duration: '1 hour',
    category: 'measurement',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Custom Shower Enclosure Or Mirrors - Consultation',
    priority: 'Normal',
    duration: '45 minutes',
    category: 'shower-mirror',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Custom Shower Enclosure Or Mirrors - Installation',
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
    publicIntakeEnabled: true
  },
  {
    name: 'Glass Replacement (1-4 Panes) - Consultation',
    priority: 'Normal',
    duration: '30 minutes',
    category: 'glass-replacement',
    customerFacing: true,
    publicIntakeEnabled: true
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
    publicIntakeEnabled: true
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
    publicIntakeEnabled: true
  },
  {
    name: 'Hardware Service Consultation - Residential',
    priority: 'Normal',
    duration: '1 hour 30 minutes',
    category: 'hardware',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Multiservice Consultation',
    priority: 'High',
    duration: '1 hour 30 minutes',
    category: 'multiservice',
    customerFacing: true,
    publicIntakeEnabled: true
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
    publicIntakeEnabled: true
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
    publicIntakeEnabled: true
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
    publicIntakeEnabled: true
  },
  {
    name: 'Patio and Pet Door - Consultation',
    priority: 'High',
    duration: '30 minutes',
    category: 'patio-pet-door',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Patio and Pet Door - Installation',
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
    publicIntakeEnabled: true
  },
  {
    name: 'Storefront & Door Replacement - Consultation',
    priority: 'High',
    duration: '45 minutes',
    category: 'storefront-door',
    customerFacing: true,
    publicIntakeEnabled: true
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
    name: 'Warranty Assessment',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'warranty',
    customerFacing: true,
    publicIntakeEnabled: true
  },
  {
    name: 'Warranty Repair',
    priority: 'Urgent',
    duration: '2 hours',
    category: 'warranty',
    customerFacing: true,
    publicIntakeEnabled: true
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
