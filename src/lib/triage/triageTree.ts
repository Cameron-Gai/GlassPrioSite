import type { JobType } from '$lib/data/jobTypes';
import { getPublicJobType } from '$lib/data/jobTypes';

export type SystemAction = 'checkBusinessHours';

export interface TriageOption {
  id: string;
  label: string;
  helperText?: string;
  nextNodeId?: string;
  routeJobTypeName?: string;
  systemAction?: SystemAction;
  isEmergency?: boolean;
}

export interface TriageNode {
  id: string;
  question: string;
  helperText?: string;
  options: TriageOption[];
}

export const triageTree: Record<string, TriageNode> = {
  emergency: {
    id: 'emergency',
    question: 'Is this an emergency or safety issue?',
    helperText:
      'This helps us prioritize urgent issues like broken glass, unsecured doors, or weather entering the building.',
    options: [
      {
        id: 'emergency-broken-glass',
        label: 'Broken glass creating a safety hazard',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-unsecure',
        label: 'Door or window cannot secure the building',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-business-entrance',
        label: 'Business entrance is unusable',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-weather',
        label: 'Water or weather is entering the property',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'no-emergency',
        label: 'This is not an emergency',
        nextNodeId: 'warranty'
      }
    ]
  },

  warranty: {
    id: 'warranty',
    question: 'Is this related to a previous job or warranty?',
    options: [
      {
        id: 'warranty-assessment',
        label: 'Yes, I need someone to inspect the issue',
        routeJobTypeName: 'Warranty Assessment'
      },
      {
        id: 'warranty-repair',
        label: 'Yes, I already know it needs repair',
        routeJobTypeName: 'Warranty Repair'
      },
      {
        id: 'warranty-none',
        label: 'No',
        nextNodeId: 'service-category'
      }
    ]
  },

  'service-category': {
    id: 'service-category',
    question: 'What do you need help with?',
    options: [
      {
        id: 'cat-glass',
        label: 'Broken or fogged glass pane replacement',
        nextNodeId: 'glass-panes'
      },
      {
        id: 'cat-window-frame',
        label: 'Window frame replacement',
        nextNodeId: 'window-frames'
      },
      {
        id: 'cat-storefront',
        label: 'Storefront or commercial door',
        nextNodeId: 'storefront'
      },
      {
        id: 'cat-patio-pet',
        label: 'Patio door or pet door',
        nextNodeId: 'patio-pet'
      },
      {
        id: 'cat-shower-mirror',
        label: 'Shower glass or mirrors',
        nextNodeId: 'shower-mirror'
      },
      {
        id: 'cat-hardware',
        label: 'Door or window hardware',
        nextNodeId: 'hardware'
      },
      {
        id: 'cat-multiservice',
        label: 'Multiple services',
        nextNodeId: 'multiservice'
      },
      {
        id: 'cat-measurement',
        label: 'Measurement or install requirements',
        nextNodeId: 'measurement'
      },
      {
        id: 'cat-other',
        label: 'Something else',
        routeJobTypeName: 'Other'
      }
    ]
  },

  'glass-panes': {
    id: 'glass-panes',
    question: 'How many panes need service?',
    options: [
      {
        id: 'glass-1-4',
        label: '1–4 panes',
        routeJobTypeName: 'Glass Replacement (1-4 Panes) - Consultation'
      },
      {
        id: 'glass-5-plus',
        label: '5+ panes',
        routeJobTypeName: 'Glass Replacement (5+ Panes) - Consultation'
      },
      {
        id: 'glass-unsure',
        label: "I'm not sure",
        routeJobTypeName: 'Glass Replacement (1-4 Panes) - Consultation'
      }
    ]
  },

  'window-frames': {
    id: 'window-frames',
    question: 'How many window frames need replacement?',
    options: [
      {
        id: 'window-1-2',
        label: '1–2 frames',
        routeJobTypeName: 'New Window Replacement (1-2 Frames) - Consultation'
      },
      {
        id: 'window-3-plus',
        label: '3+ frames',
        routeJobTypeName: 'New Window Replacement (3+ Frames) - Consultation'
      },
      {
        id: 'window-unsure',
        label: "I'm not sure",
        routeJobTypeName: 'New Window Replacement (1-2 Frames) - Consultation'
      }
    ]
  },

  storefront: {
    id: 'storefront',
    question: 'Is this for a business, storefront, or commercial entry?',
    options: [
      {
        id: 'storefront-yes',
        label: 'Yes',
        routeJobTypeName: 'Storefront & Door Replacement - Consultation'
      },
      {
        id: 'storefront-no',
        label: "No / I'm not sure",
        routeJobTypeName: 'Storefront & Door Replacement - Consultation'
      }
    ]
  },

  'patio-pet': {
    id: 'patio-pet',
    question: 'What type of door do you need help with?',
    options: [
      {
        id: 'patio-only',
        label: 'Patio door',
        routeJobTypeName: 'Patio and Pet Door - Consultation'
      },
      {
        id: 'pet-only',
        label: 'Pet door',
        routeJobTypeName: 'Patio and Pet Door - Consultation'
      },
      {
        id: 'patio-pet-both',
        label: 'Both',
        routeJobTypeName: 'Patio and Pet Door - Consultation'
      }
    ]
  },

  'shower-mirror': {
    id: 'shower-mirror',
    question: 'What do you need help with?',
    options: [
      {
        id: 'shower-only',
        label: 'Shower glass',
        routeJobTypeName: 'Custom Shower Enclosure Or Mirrors - Consultation'
      },
      {
        id: 'mirror-only',
        label: 'Mirror',
        routeJobTypeName: 'Custom Shower Enclosure Or Mirrors - Consultation'
      },
      {
        id: 'shower-mirror-both',
        label: 'Both',
        routeJobTypeName: 'Custom Shower Enclosure Or Mirrors - Consultation'
      }
    ]
  },

  hardware: {
    id: 'hardware',
    question: 'Is this residential or commercial?',
    options: [
      {
        id: 'hardware-residential',
        label: 'Residential',
        routeJobTypeName: 'Hardware Service Consultation - Residential'
      },
      {
        id: 'hardware-commercial',
        label: 'Commercial',
        routeJobTypeName: 'Hardware Service Consultation - Commercial'
      },
      {
        id: 'hardware-unsure',
        label: "I'm not sure",
        routeJobTypeName: 'Hardware Service Consultation - Residential'
      }
    ]
  },

  multiservice: {
    id: 'multiservice',
    question: 'Do you need help with more than one type of glass, window, door, or hardware issue?',
    options: [
      {
        id: 'multiservice-yes',
        label: 'Yes',
        routeJobTypeName: 'Multiservice Consultation'
      },
      {
        id: 'multiservice-no',
        label: "No / I'm not sure",
        nextNodeId: 'service-category'
      }
    ]
  },

  measurement: {
    id: 'measurement',
    question: 'What type of measurement help is needed?',
    options: [
      {
        id: 'measurement-ams',
        label: 'Advanced measurement system',
        routeJobTypeName: 'Advanced Measurement System (AMS)'
      },
      {
        id: 'measurement-critical',
        label: 'Critical measurement or installation requirement',
        routeJobTypeName: 'Critical - Measure and Installation Requirements'
      },
      {
        id: 'measurement-unsure',
        label: "I'm not sure",
        routeJobTypeName: 'Critical - Measure and Installation Requirements'
      }
    ]
  }
};

export const TRIAGE_ROOT_ID = 'emergency';

export interface TriageRoute {
  jobType: JobType;
  isEmergency: boolean;
}

/**
 * Resolve the public-facing job type for a given option. Throws if the
 * referenced job type is missing or not public-intake enabled, which would
 * indicate a misconfigured tree.
 */
export function resolveRoute(option: TriageOption): TriageRoute | null {
  if (!option.routeJobTypeName) return null;
  return {
    jobType: getPublicJobType(option.routeJobTypeName),
    isEmergency: option.isEmergency ?? false
  };
}

export function getNode(nodeId: string): TriageNode {
  const node = triageTree[nodeId];
  if (!node) {
    throw new Error(`Unknown triage node: ${nodeId}`);
  }
  return node;
}
