import type { ServiceTitanConfig } from './config';

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  accessToken: string;
  expiresAtMs: number;
}

let tokenCache: CachedToken | null = null;

/** Refresh ~60s before expiry to avoid handing out a token that dies mid-flight. */
const TOKEN_SAFETY_WINDOW_MS = 60_000;

/** ServiceTitan production retry pattern: 1s → 2s → 4s. */
const RETRY_DELAYS_MS = [1_000, 2_000, 4_000];

export interface ServiceTitanProblem {
  status: number;
  title?: string;
  traceId?: string;
  errors?: Record<string, string[]>;
  errorCode?: string;
  raw?: unknown;
}

export class ServiceTitanError extends Error {
  status: number;
  problem: ServiceTitanProblem;
  constructor(message: string, problem: ServiceTitanProblem) {
    super(message);
    this.name = 'ServiceTitanError';
    this.status = problem.status;
    this.problem = problem;
  }
}

function parseProblem(status: number, text: string): ServiceTitanProblem {
  if (!text) return { status };
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const data = (parsed.data as Record<string, unknown> | undefined) ?? undefined;
    // RFC 7807 (most ST resource errors) — `title`, `traceId`, `errors{}`, `data.ErrorCode`.
    // OAuth token endpoint — `error` + `error_description`. Fold both into `title`.
    const rfcTitle = typeof parsed.title === 'string' ? parsed.title : undefined;
    const oauthError = typeof parsed.error === 'string' ? parsed.error : undefined;
    const oauthDescription =
      typeof parsed.error_description === 'string' ? parsed.error_description : undefined;
    const oauthTitle =
      oauthError && oauthDescription
        ? `${oauthError}: ${oauthDescription}`
        : oauthError ?? oauthDescription;
    return {
      status,
      title: rfcTitle ?? oauthTitle,
      traceId: typeof parsed.traceId === 'string' ? parsed.traceId : undefined,
      errors:
        parsed.errors && typeof parsed.errors === 'object'
          ? (parsed.errors as Record<string, string[]>)
          : undefined,
      errorCode:
        typeof data?.ErrorCode === 'string' ? (data.ErrorCode as string) : oauthError,
      raw: parsed
    };
  } catch {
    return { status, title: text.slice(0, 300), raw: text };
  }
}

function retryAfterMs(response: Response): number | null {
  const header = response.headers.get('retry-after');
  if (!header) return null;
  // Retry-After may be a number of seconds OR an HTTP-date — try both.
  const seconds = Number(header);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const parsedDate = Date.parse(header);
  return Number.isFinite(parsedDate) ? Math.max(0, parsedDate - Date.now()) : null;
}

async function fetchAccessToken(config: ServiceTitanConfig, forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.expiresAtMs - TOKEN_SAFETY_WINDOW_MS > now
  ) {
    return tokenCache.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret
  });

  const response = await fetch(`${config.authBaseUrl}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new ServiceTitanError(
      `ServiceTitan auth failed (${response.status})`,
      parseProblem(response.status, text)
    );
  }

  const data = (await response.json()) as TokenResponse;
  // The guide notes ST tokens are 5–15 min; trust expires_in but never go below 60s.
  const ttlSec = Math.max(60, Number(data.expires_in ?? 300));
  tokenCache = {
    accessToken: data.access_token,
    expiresAtMs: now + ttlSec * 1000
  };
  return data.access_token;
}

/** Invalidate the cached token. Useful for tests or after a confirmed 401. */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Lightweight reachability/auth check for health gating: resolves true when we
 * can obtain an access token (ServiceTitan auth is reachable and the credentials
 * are valid). Uses the normal token cache, so it's near-free when already warm.
 */
export async function pingServiceTitanAuth(config: ServiceTitanConfig): Promise<boolean> {
  try {
    await fetchAccessToken(config);
    return true;
  } catch {
    return false;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | undefined>;
  body?: unknown;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated, retry-aware call against a tenant-scoped ServiceTitan
 * endpoint. `namespace` is something like "crm/v2" or "jpm/v2"; the
 * /tenant/{tenantId}/ segment is inserted automatically.
 *
 * Retry policy matches the GlassReports production client:
 *  - 401 → refresh token + retry exactly once
 *  - 429 / 5xx → backoff 1s → 2s → 4s (honor `Retry-After` when present)
 *  - Other 4xx → fail immediately (deterministic; don't waste budget)
 */
export async function stRequest<T>(
  config: ServiceTitanConfig,
  namespace: string,
  resourcePath: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(
    `${config.apiBaseUrl}/${namespace}/tenant/${config.tenantId}/${resourcePath}`
  );
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    }
  }

  const send = async (forceRefreshToken: boolean): Promise<Response> => {
    const accessToken = await fetchAccessToken(config, forceRefreshToken);
    return fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'ST-App-Key': config.appKey,
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {})
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined
    });
  };

  let refreshedAuth = false;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await send(false);
    if (response.ok) {
      return response.status === 204
        ? (undefined as T)
        : ((await response.json()) as T);
    }

    // 401 → refresh token once and retry the exact same request.
    if (response.status === 401 && !refreshedAuth) {
      refreshedAuth = true;
      clearTokenCache();
      const retried = await send(true);
      if (retried.ok) {
        return retried.status === 204
          ? (undefined as T)
          : ((await retried.json()) as T);
      }
      // Re-auth retry also failed — fall through to normal error handling below.
      const text = await retried.text().catch(() => '');
      throw new ServiceTitanError(
        `ServiceTitan ${options.method ?? 'GET'} ${namespace}/${resourcePath} failed (${retried.status})`,
        parseProblem(retried.status, text)
      );
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (retryable && attempt < RETRY_DELAYS_MS.length) {
      const delay = retryAfterMs(response) ?? RETRY_DELAYS_MS[attempt];
      await sleep(delay);
      attempt += 1;
      continue;
    }

    const text = await response.text().catch(() => '');
    throw new ServiceTitanError(
      `ServiceTitan ${options.method ?? 'GET'} ${namespace}/${resourcePath} failed (${response.status})`,
      parseProblem(response.status, text)
    );
  }
}
