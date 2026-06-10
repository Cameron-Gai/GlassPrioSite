import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import type { ServiceTitanConfig } from '$lib/server/servicetitan/config';
import { stRequest, ServiceTitanError } from '$lib/server/servicetitan/client';

/**
 * TEMPORARY admin helper — read bookings back from ServiceTitan so we can
 * inspect what the API actually stored (especially uploadedImages format).
 *
 *   GET /api/admin/st-booking?token=<ADMIN_DISCOVERY_TOKEN>&id=<bookingId>
 *   GET /api/admin/st-booking?token=<...>            → last 25 bookings
 *
 * Same guard as st-discovery: 404 unless ADMIN_DISCOVERY_TOKEN matches.
 * Delete alongside st-discovery when setup is done.
 */

function buildConfig(): ServiceTitanConfig | null {
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
    bookingProviderId: 0,
    campaignId: null,
    jobTypeIdOverrides: null,
    authBaseUrl: isProd ? 'https://auth.servicetitan.io' : 'https://auth-integration.servicetitan.io',
    apiBaseUrl: isProd ? 'https://api.servicetitan.io' : 'https://api-integration.servicetitan.io'
  };
}

export const GET: RequestHandler = async ({ url }) => {
  const expected = env.ADMIN_DISCOVERY_TOKEN;
  const provided = url.searchParams.get('token');
  if (!expected || !provided || provided !== expected) {
    return json({ error: 'Not found' }, { status: 404 });
  }

  const config = buildConfig();
  if (!config) return json({ error: 'ServiceTitan creds missing' }, { status: 503 });

  const id = url.searchParams.get('id');
  try {
    if (id) {
      const booking = await stRequest<unknown>(config, 'crm/v2', `bookings/${encodeURIComponent(id)}`);
      return json({ booking });
    }
    const list = await stRequest<unknown>(config, 'crm/v2', 'bookings', {
      query: { page: 1, pageSize: 25 }
    });
    return json({ bookings: list });
  } catch (error) {
    if (error instanceof ServiceTitanError) {
      return json(
        { error: error.message, title: error.problem.title, traceId: error.problem.traceId },
        { status: 502 }
      );
    }
    return json({ error: String(error) }, { status: 500 });
  }
};
