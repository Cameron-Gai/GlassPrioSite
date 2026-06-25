import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { ServiceTitanConfig } from '$lib/server/servicetitan/config';
import { stRequest, ServiceTitanError } from '$lib/server/servicetitan/client';
import { jobTypes as intakeJobTypes } from '$lib/data/jobTypes';

/**
 * TEMPORARY admin helper — discovers tenant-specific ServiceTitan IDs and
 * matches them against our intake job types, so the remaining Railway env
 * vars can be copy-pasted instead of hand-hunted.
 *
 * Usage (after deploy, with ADMIN_DISCOVERY_TOKEN set in Railway):
 *   GET /api/admin/st-discovery?token=<ADMIN_DISCOVERY_TOKEN>
 *
 * Security: requires ADMIN_DISCOVERY_TOKEN to be set AND matched; otherwise
 * responds 404 as if the route doesn't exist. Only needs the four core
 * ServiceTitan creds (tenant/app key/client id/secret) — it works before
 * SERVICETITAN_BOOKING_PROVIDER_ID is configured, since finding that ID is
 * part of the point.
 *
 * DELETE THIS ROUTE (or unset ADMIN_DISCOVERY_TOKEN) once the env vars are
 * filled in.
 */

interface ListEnvelope<T> {
  page?: number;
  pageSize?: number;
  hasMore?: boolean;
  data?: T[];
}

interface STJobType {
  id: number;
  name: string;
  active?: boolean;
}

interface STCampaign {
  id: number;
  name: string;
  active?: boolean;
  isDefaultCampaign?: boolean;
}

interface STProviderTag {
  id: number;
  tagName?: string;
  name?: string;
  active?: boolean;
}

interface STBusinessUnit {
  id: number;
  name: string;
  active?: boolean;
}

function buildDiscoveryConfig(): ServiceTitanConfig | null {
  const tenantId = env.SERVICETITAN_TENANT_ID;
  const appKey = env.SERVICETITAN_APP_KEY;
  const clientId = env.SERVICETITAN_CLIENT_ID;
  const clientSecret = env.SERVICETITAN_CLIENT_SECRET;
  if (!tenantId || !appKey || !clientId || !clientSecret) return null;

  const envRaw = (env.SERVICETITAN_ENVIRONMENT ?? env.SERVICETITAN_ENV ?? 'integration').toLowerCase();
  const isProd = envRaw === 'production';
  return {
    environment: isProd ? 'production' : 'integration',
    tenantId,
    appKey,
    clientId,
    clientSecret,
    // Not used by stRequest — placeholder so the discovery call can run
    // before the booking provider is configured.
    bookingProviderId: 0,
    campaignId: null,
    jobTypeIdOverrides: null,
    authBaseUrl: isProd ? 'https://auth.servicetitan.io' : 'https://auth-integration.servicetitan.io',
    apiBaseUrl: isProd ? 'https://api.servicetitan.io' : 'https://api-integration.servicetitan.io'
  };
}

async function fetchAll<T>(
  config: ServiceTitanConfig,
  namespace: string,
  resource: string
): Promise<T[]> {
  const collected: T[] = [];
  const pageSize = 200;
  let page = 1;
  // Defensive page cap + short-page stop, per the GlassReports pagination guidance.
  while (page <= 25) {
    const envelope = await stRequest<ListEnvelope<T>>(config, namespace, resource, {
      query: { page, pageSize }
    });
    const items = Array.isArray(envelope?.data) ? envelope.data : [];
    collected.push(...items);
    if (items.length < pageSize || envelope?.hasMore === false) break;
    page += 1;
  }
  return collected;
}

/** Normalize for name comparison: lowercase, collapse whitespace, strip punctuation variants. */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[‐‑–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Looser form: letters+digits only, for matches that differ in punctuation/spacing. */
function skeleton(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const GET: RequestHandler = async ({ url }) => {
  const expected = env.ADMIN_DISCOVERY_TOKEN;
  const provided = url.searchParams.get('token');
  if (!expected || !provided || provided !== expected) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const config = buildDiscoveryConfig();
  if (!config) {
    return json(
      {
        error:
          'Core ServiceTitan creds missing (SERVICETITAN_TENANT_ID / APP_KEY / CLIENT_ID / CLIENT_SECRET).'
      },
      { status: 503 }
    );
  }

  const errors: Record<string, string> = {};
  const safe = async <T>(label: string, fn: () => Promise<T[]>): Promise<T[]> => {
    try {
      return await fn();
    } catch (error) {
      errors[label] =
        error instanceof ServiceTitanError
          ? `${error.message} — ${error.problem.title ?? ''} (traceId: ${error.problem.traceId ?? 'n/a'})`
          : String(error);
      return [];
    }
  };

  const [stJobTypes, campaigns, providerTags, businessUnits] = await Promise.all([
    safe('jobTypes', () => fetchAll<STJobType>(config, 'jpm/v2', 'job-types')),
    safe('campaigns', () => fetchAll<STCampaign>(config, 'marketing/v2', 'campaigns')),
    safe('bookingProviderTags', () =>
      fetchAll<STProviderTag>(config, 'crm/v2', 'booking-provider-tags')
    ),
    safe('businessUnits', () => fetchAll<STBusinessUnit>(config, 'settings/v2', 'business-units'))
  ]);

  // Match every public intake job type name against the tenant's job types.
  const byNormalized = new Map<string, STJobType>();
  const bySkeleton = new Map<string, STJobType>();
  for (const jt of stJobTypes) {
    if (!jt?.name) continue;
    byNormalized.set(normalize(jt.name), jt);
    bySkeleton.set(skeleton(jt.name), jt);
  }

  const publicNames = intakeJobTypes
    .filter((jt) => jt.publicIntakeEnabled)
    .map((jt) => jt.name);

  const matched: Record<string, number> = {};
  const matchDetails: Array<{
    intakeName: string;
    match: 'exact' | 'loose' | 'none';
    stId: number | null;
    stName: string | null;
    active: boolean | null;
  }> = [];

  for (const name of publicNames) {
    const exact = byNormalized.get(normalize(name));
    const loose = exact ?? bySkeleton.get(skeleton(name));
    const hit = exact ?? loose ?? null;
    if (hit) matched[name] = hit.id;
    matchDetails.push({
      intakeName: name,
      match: exact ? 'exact' : loose ? 'loose' : 'none',
      stId: hit?.id ?? null,
      stName: hit?.name ?? null,
      active: hit?.active ?? null
    });
  }

  const unmatched = matchDetails.filter((d) => d.match === 'none').map((d) => d.intakeName);

  const activeCampaigns = campaigns
    .filter((c) => c?.active !== false)
    .map((c) => ({ id: c.id, name: c.name, isDefault: c.isDefaultCampaign ?? false }));

  const webLikeCampaigns = activeCampaigns.filter((c) =>
    /web|online|internet|site|intake/i.test(c.name ?? '')
  );

  return json({
    environment: config.environment,
    tenantId: config.tenantId,
    counts: {
      stJobTypes: stJobTypes.length,
      campaigns: campaigns.length,
      bookingProviderTags: providerTags.length,
      businessUnits: businessUnits.length
    },
    errors,
    // ── Paste these into Railway ────────────────────────────────────────────
    railwayEnv: {
      SERVICETITAN_JOB_TYPE_IDS: JSON.stringify(matched),
      SERVICETITAN_CAMPAIGN_ID_candidates: webLikeCampaigns,
      SERVICETITAN_BOOKING_PROVIDER_ID_candidates: providerTags.map((t) => ({
        id: t.id,
        name: t.tagName ?? t.name ?? null,
        active: t.active ?? null
      }))
    },
    // ── Detail for review ───────────────────────────────────────────────────
    jobTypeMatches: matchDetails,
    unmatchedIntakeJobTypes: unmatched,
    allStJobTypes: stJobTypes.map((jt) => ({ id: jt.id, name: jt.name, active: jt.active ?? null })),
    allCampaigns: activeCampaigns,
    // Build SERVICETITAN_BUSINESS_UNIT_IDS from these (group by Seattle/Tacoma →
    // residential/commercial/interior).
    allBusinessUnits: businessUnits
      .filter((b) => b?.active !== false)
      .map((b) => ({ id: b.id, name: b.name })),
    note:
      'Temporary helper. After copying values into Railway, unset ADMIN_DISCOVERY_TOKEN (or delete src/routes/api/admin/st-discovery).'
  });
};
