import { env } from '$env/dynamic/private';

export type STEnvironment = 'production' | 'integration';

export interface ServiceTitanConfig {
  environment: STEnvironment;
  tenantId: string;
  appKey: string;
  clientId: string;
  clientSecret: string;
  /** Required for /jpm/v2/.../jobs — the business unit the job is filed under. */
  businessUnitId: number;
  /**
   * Required for /jpm/v2/.../jobs in this tenant. Production has verified that
   * Job creation returns 400 without a campaignId, even though the field
   * documentation reads "optional". Treat it as required.
   */
  campaignId: number;
  /**
   * Required hold reason ID for the create→hold sequence. Intake submissions
   * are not real bookings — we always place them on hold immediately so the
   * customer is not notified before dispatch reviews. Find at:
   *   Settings → Hold reasons (typical name: "Needs review" / "Waiting for materials")
   */
  holdReasonId: number;
  /**
   * Required review tag applied to every job this tool creates or touches.
   * Operations standard: use the "Automatic, Please Review" tag — same one
   * GlassReports' estimate automation uses. Find at:
   *   ServiceTitan → Settings → Tags → Tag Types
   * or via GET /settings/v2/tenant/{tenant}/tag-types.
   */
  reviewTagId: number;
  /** Optional JSON map of our job type name → ServiceTitan job type ID. Overrides the default map in jobTypeMap.ts. */
  jobTypeIdOverrides: Record<string, number> | null;
  authBaseUrl: string;
  apiBaseUrl: string;
}

function readInt(name: string): number | null {
  const raw = env[name];
  if (!raw) return null;
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? value : null;
}

function readJson(name: string): Record<string, number> | null {
  const raw = env[name];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const out: Record<string, number> = {};
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'number') out[key] = value;
      }
      return out;
    }
  } catch {
    // Ignore malformed JSON — caller treats as null.
  }
  return null;
}

// Match the GlassReports convention so a shared Railway env reads identically
// across projects. Accept the older SERVICETITAN_ENV name as a fallback so we
// don't break local .env files set up earlier.
const envRaw = (env.SERVICETITAN_ENVIRONMENT ?? env.SERVICETITAN_ENV ?? 'integration').toLowerCase();
const envName: STEnvironment = envRaw === 'production' ? 'production' : 'integration';

const authBaseUrl =
  envName === 'production'
    ? 'https://auth.servicetitan.io'
    : 'https://auth-integration.servicetitan.io';

const apiBaseUrl =
  envName === 'production'
    ? 'https://api.servicetitan.io'
    : 'https://api-integration.servicetitan.io';

function buildConfig(): ServiceTitanConfig | null {
  const tenantId = env.SERVICETITAN_TENANT_ID;
  const appKey = env.SERVICETITAN_APP_KEY;
  const clientId = env.SERVICETITAN_CLIENT_ID;
  const clientSecret = env.SERVICETITAN_CLIENT_SECRET;
  const businessUnitId = readInt('SERVICETITAN_BUSINESS_UNIT_ID');
  const campaignId = readInt('SERVICETITAN_CAMPAIGN_ID');
  const holdReasonId = readInt('SERVICETITAN_HOLD_REASON_ID');
  const reviewTagId = readInt('SERVICETITAN_REVIEW_TAG_ID');

  if (
    !tenantId ||
    !appKey ||
    !clientId ||
    !clientSecret ||
    businessUnitId === null ||
    campaignId === null ||
    holdReasonId === null ||
    reviewTagId === null
  ) {
    return null;
  }

  return {
    environment: envName,
    tenantId,
    appKey,
    clientId,
    clientSecret,
    businessUnitId,
    campaignId,
    holdReasonId,
    reviewTagId,
    jobTypeIdOverrides: readJson('SERVICETITAN_JOB_TYPE_IDS'),
    authBaseUrl,
    apiBaseUrl
  };
}

let cached: ServiceTitanConfig | null | undefined;

export function getServiceTitanConfig(): ServiceTitanConfig | null {
  if (cached === undefined) {
    cached = buildConfig();
  }
  return cached;
}

export function isServiceTitanConfigured(): boolean {
  return getServiceTitanConfig() !== null;
}
