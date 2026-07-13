/**
 * Map our customer-facing ServiceTitan job type *name* → the tenant-specific
 * numeric Job Type ID in your ServiceTitan instance.
 *
 * Every public-intake job type listed in `src/lib/data/jobTypes.ts` must have
 * an entry here before that route can be submitted as a real ServiceTitan job.
 * Until you fill these in (or override via the SERVICETITAN_JOB_TYPE_IDS env
 * var), `/api/intake` will return a "missing job type ID" error for that route.
 *
 * Job Type IDs live at:
 *   ServiceTitan → Settings → Operations → Job Types → (open a job type)
 *
 * The env var form lets ops change IDs without a deploy. Example:
 *   SERVICETITAN_JOB_TYPE_IDS='{"Priority Service (Business Hours)":1234, ...}'
 */
export const DEFAULT_JOB_TYPE_ID_MAP: Record<string, number | null> = {
  'Priority Service (Business Hours)': null,
  'Emergency Services (After Hours)': null,
  'Glass Replacement (1-4 Panes) - Consultation': null,
  'Glass Replacement (5+ Panes) - Consultation': null,
  'New Window Replacement (1-2 Frames) - Consultation': null,
  'New Window Replacement (3+ Frames) - Consultation': null,
  'Storefront & Door Replacement - Consultation': null,
  'Patio Door - Consultation': null,
  'Pet Door - Consultation': null,
  'Custom Shower Enclosure - Consultation': null,
  'Custom Mirrors - Consultation': null,
  'Hardware Service Consultation - Residential': null,
  'Hardware Service Consultation - Commercial': null,
  'Multiservice Consultation': null,
  'Advanced Measurement System (AMS)': null,
  Other: null
};

export interface JobTypeResolution {
  id: number | null;
  source: 'env' | 'default' | 'missing';
}

export function resolveJobTypeId(
  jobTypeName: string,
  overrides: Record<string, number> | null
): JobTypeResolution {
  if (overrides && typeof overrides[jobTypeName] === 'number') {
    return { id: overrides[jobTypeName], source: 'env' };
  }
  const fromDefault = DEFAULT_JOB_TYPE_ID_MAP[jobTypeName];
  if (typeof fromDefault === 'number') {
    return { id: fromDefault, source: 'default' };
  }
  return { id: null, source: 'missing' };
}
