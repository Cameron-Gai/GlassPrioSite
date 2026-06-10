import { env } from '$env/dynamic/private';

export type STEnvironment = 'production' | 'integration';

export interface ServiceTitanConfig {
  environment: STEnvironment;
  tenantId: string;
  appKey: string;
  clientId: string;
  clientSecret: string;
  /**
   * Required for the Bookings flow. A Booking Provider Tag must exist in the
   * ServiceTitan UI (Settings → Integrations → Booking Provider Tags); its
   * numeric ID goes here. Discover via:
   *   GET /crm/v2/tenant/{tenant}/booking-provider-tags
   */
  bookingProviderId: number;
  /**
   * Optional — campaign for attribution. Bookings accept a null campaign (the
   * CSR can attribute at conversion), so unlike direct job creation this is
   * not required.
   */
  campaignId: number | null;
  /** Optional JSON map of our job type name → ServiceTitan job type ID. Pre-fills the booking's jobTypeId when present. */
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
// across projects. Accept the older SERVICETITAN_ENV name as a fallback.
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
  const bookingProviderId = readInt('SERVICETITAN_BOOKING_PROVIDER_ID');

  if (!tenantId || !appKey || !clientId || !clientSecret || bookingProviderId === null) {
    return null;
  }

  return {
    environment: envName,
    tenantId,
    appKey,
    clientId,
    clientSecret,
    bookingProviderId,
    campaignId: readInt('SERVICETITAN_CAMPAIGN_ID'),
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
