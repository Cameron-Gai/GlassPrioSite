import type { JobType } from '$lib/data/jobTypes';
import { getPublicJobType } from '$lib/data/jobTypes';

export type SystemAction = 'checkBusinessHours';

export type ServiceIcon =
  | 'glass'
  | 'window'
  | 'storefront'
  | 'patio'
  | 'shower'
  | 'hardware'
  | 'multi'
  | 'measure'
  | 'other'
  | 'emergency-glass'
  | 'emergency-door'
  | 'emergency-storefront'
  | 'emergency-weather'
  | 'safe'
  | 'yes'
  | 'no';

export interface TriageOption {
  id: string;
  label: string;
  helperText?: string;
  icon?: ServiceIcon;
  nextNodeId?: string;
  routeJobTypeName?: string;
  systemAction?: SystemAction;
  isEmergency?: boolean;
}

export type LayoutHint = 'list' | 'cards' | 'yesno';

export interface TriageNode {
  id: string;
  question: string;
  helperText?: string;
  layout?: LayoutHint;
  options: TriageOption[];
}

export const triageTree: Record<string, TriageNode> = {
  emergency: {
    id: 'emergency',
    question: 'Is this an emergency or safety issue?',
    helperText:
      "Examples: broken glass, an unsecured door or window, weather entering the building, an unusable business entrance. If any of those apply, we'll route you to fast-response service.",
    layout: 'yesno',
    options: [
      {
        id: 'emergency-yes',
        label: 'Yes — it’s urgent',
        helperText: 'We’ll dispatch a same-day priority response',
        icon: 'yes',
        nextNodeId: 'emergency-which'
      },
      {
        id: 'emergency-no',
        label: 'No — not urgent',
        helperText: 'Continue to the normal service request',
        icon: 'no',
        nextNodeId: 'service-category'
      }
    ]
  },

  'emergency-which': {
    id: 'emergency-which',
    question: 'Which best describes the emergency?',
    helperText: "This helps the responder come prepared. We'll still treat it as urgent.",
    layout: 'list',
    options: [
      {
        id: 'emergency-broken-glass',
        label: 'Broken glass creating a safety hazard',
        icon: 'emergency-glass',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-unsecure',
        label: 'A door or window cannot secure the building',
        icon: 'emergency-door',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-business-entrance',
        label: 'A business entrance is unusable',
        icon: 'emergency-storefront',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      },
      {
        id: 'emergency-weather',
        label: 'Water or weather is entering the property',
        icon: 'emergency-weather',
        systemAction: 'checkBusinessHours',
        isEmergency: true
      }
    ]
  },

  'service-category': {
    id: 'service-category',
    question: 'What do you need help with?',
    helperText: "Pick the closest match — we'll fine-tune the details next.",
    layout: 'cards',
    options: [
      {
        id: 'cat-glass',
        label: 'Glass replacement',
        helperText: 'Broken or fogged pane / IG unit',
        icon: 'glass',
        nextNodeId: 'glass-panes'
      },
      {
        id: 'cat-window-frame',
        label: 'Full window replacement',
        helperText: 'Brand-new windows (frame + glass)',
        icon: 'window',
        nextNodeId: 'window-frames'
      },
      {
        id: 'cat-storefront',
        label: 'Storefront or door system',
        helperText: 'Metal framing, doors, and glass',
        icon: 'storefront',
        nextNodeId: 'storefront'
      },
      {
        id: 'cat-patio-pet',
        label: 'Patio or pet door',
        helperText: 'Sliding doors, pet doors',
        icon: 'patio',
        nextNodeId: 'patio-pet-scope'
      },
      {
        id: 'cat-shower-mirror',
        label: 'Shower glass or mirrors',
        helperText: 'Custom enclosures and mirrors',
        icon: 'shower',
        nextNodeId: 'shower-mirror'
      },
      {
        id: 'cat-hardware',
        label: 'Door or window hardware',
        helperText: 'Locks, hinges, rollers, closers',
        icon: 'hardware',
        nextNodeId: 'hardware'
      },
      {
        id: 'cat-multiservice',
        label: 'Multiple services',
        helperText: 'More than one of the above',
        icon: 'multi',
        nextNodeId: 'multiservice'
      },
      {
        id: 'cat-measurement',
        label: 'Preemptive measurement',
        helperText: 'Measure now, save on future repairs',
        icon: 'measure',
        routeJobTypeName: 'Advanced Measurement System (AMS)'
      },
      {
        id: 'cat-other',
        label: 'Something else',
        helperText: "A client manager will review",
        icon: 'other',
        routeJobTypeName: 'Other'
      }
    ]
  },

  'glass-panes': {
    id: 'glass-panes',
    question: 'How many panes or IG units need service?',
    helperText: 'An IG (insulated glass) unit counts as one pane.',
    layout: 'list',
    options: [
      {
        id: 'glass-1-4',
        label: '1–4 panes',
        routeJobTypeName: 'Glass Replacement (1-4 Panes) - Consultation'
      },
      {
        id: 'glass-5-plus',
        label: '5 or more panes',
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
    question: 'How many brand-new windows do you need?',
    helperText:
      "This is for replacing whole windows — frame and glass. If you only need the glass replaced (frame stays), go back and pick glass replacement.",
    layout: 'list',
    options: [
      {
        id: 'window-1-2',
        label: '1–2 windows',
        routeJobTypeName: 'New Window Replacement (1-2 Frames) - Consultation'
      },
      {
        id: 'window-3-plus',
        label: '3 or more windows',
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
    question: 'What does the project involve?',
    helperText: 'These services cover residential and commercial — they all use the full storefront system (metal framing, doors, and glass).',
    layout: 'list',
    options: [
      {
        id: 'storefront-full',
        label: 'Replace the full storefront system',
        helperText: 'Metal framing + doors + glass',
        routeJobTypeName: 'Storefront & Door Replacement - Consultation'
      },
      {
        id: 'storefront-door',
        label: 'Replace or upgrade a door',
        helperText: 'Entry, side, or office door',
        routeJobTypeName: 'Storefront & Door Replacement - Consultation'
      },
      {
        id: 'storefront-framing',
        label: 'Replace damaged framing or glass',
        helperText: 'Within an existing storefront',
        routeJobTypeName: 'Storefront & Door Replacement - Consultation'
      }
    ]
  },

  'patio-pet-scope': {
    id: 'patio-pet-scope',
    question: 'Is this glass-only, or does the door itself need work?',
    helperText: 'If only the glass needs replacing, we route it through Glass Replacement instead.',
    layout: 'list',
    options: [
      {
        id: 'patio-pet-glass-only',
        label: 'Just the glass needs replacing',
        routeJobTypeName: 'Glass Replacement (1-4 Panes) - Consultation'
      },
      {
        id: 'patio-pet-door',
        label: 'The door itself needs install or repair',
        nextNodeId: 'patio-pet'
      }
    ]
  },

  'patio-pet': {
    id: 'patio-pet',
    question: 'Which type of door?',
    layout: 'list',
    options: [
      {
        id: 'patio-only',
        label: 'Patio door',
        routeJobTypeName: 'Patio Door - Consultation'
      },
      {
        id: 'pet-only',
        label: 'Pet door',
        routeJobTypeName: 'Pet Door - Consultation'
      },
      {
        // Both in one visit: book under the patio door (the larger job) — the
        // consult covers the pet door too; details carry it for the CSR.
        id: 'patio-pet-both',
        label: 'Both',
        routeJobTypeName: 'Patio Door - Consultation'
      }
    ]
  },

  'shower-mirror': {
    id: 'shower-mirror',
    question: 'Shower glass, mirrors, or both?',
    helperText:
      "We'll start with a virtual consultation. Photos help us provide a rough estimate before any on-site visit.",
    layout: 'list',
    options: [
      {
        id: 'shower-only',
        label: 'Shower glass',
        helperText: 'Frameless, semi-frameless, or framed',
        routeJobTypeName: 'Custom Shower Enclosure - Consultation'
      },
      {
        id: 'mirror-only',
        label: 'Mirror',
        helperText: 'Wall, vanity, or gym mirror',
        routeJobTypeName: 'Custom Mirrors - Consultation'
      },
      {
        // No combined shower+mirror job type exists (split for ACP); the shower
        // enclosure consultation is the broader scope and the consultant covers
        // mirrors on the same virtual visit.
        id: 'shower-mirror-both',
        label: 'Both',
        routeJobTypeName: 'Custom Shower Enclosure - Consultation'
      }
    ]
  },

  hardware: {
    id: 'hardware',
    question: 'Is the property residential or business?',
    helperText: 'The process is the same for both — we just file the job under the right category.',
    layout: 'list',
    options: [
      {
        id: 'hardware-residential',
        label: 'Residential',
        routeJobTypeName: 'Hardware Service Consultation - Residential'
      },
      {
        id: 'hardware-commercial',
        label: 'Business',
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
    question: 'You need help with more than one service?',
    helperText: "We'll review all of them in a single appointment.",
    layout: 'list',
    options: [
      {
        id: 'multiservice-yes',
        label: 'Yes — combine them into one visit',
        routeJobTypeName: 'Multiservice Consultation'
      },
      {
        id: 'multiservice-no',
        label: 'Actually, just one service',
        nextNodeId: 'service-category'
      }
    ]
  }
};

export const TRIAGE_ROOT_ID = 'emergency';

export interface TriageRoute {
  jobType: JobType;
  isEmergency: boolean;
}

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

/** Categories where we offer the Priority Service upsell after triage. */
export const PRIORITY_UPGRADE_BLOCKED_CATEGORIES = new Set(['emergency', 'other']);

export function canUpgradeToPriority(jobType: JobType | null): boolean {
  if (!jobType) return false;
  return !PRIORITY_UPGRADE_BLOCKED_CATEGORIES.has(jobType.category);
}
