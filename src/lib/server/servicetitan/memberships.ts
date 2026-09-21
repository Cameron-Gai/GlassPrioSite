/**
 * Active-membership lookup for a matched ServiceTitan customer.
 *
 * SCOPE, deliberately narrow: RECOGNITION ONLY. A confirmed returning customer
 * who holds an active plan is greeted as a member and flagged on the booking
 * so the office honors their benefits. This module does NOT change what the
 * site charges, for two reasons:
 *   1. There is no member price to apply — as of 2026-09-21 the tenant defines
 *      one plan ("Advantage Plan") and has sold ZERO memberships, and no
 *      member OSC exists in the GlassReports zone map.
 *   2. ServiceTitan applies a plan's discount itself at invoice time, so
 *      discounting here too would double-count.
 * If a member on-site charge is ever introduced, it belongs in the zone map
 * (server-authoritative, shared by every channel) — not in this file.
 *
 * Never throws: a lookup failure means "not a member", never a failed intake.
 */
import type { ServiceTitanConfig } from './config';
import { ServiceTitanError, stRequest } from './client';

interface ListEnvelope<T> {
  data?: T[];
}

interface STMembership {
  id: number;
  status?: string;
  membershipTypeId?: number;
}

interface STMembershipType {
  id: number;
  name?: string;
  displayName?: string | null;
}

export interface ActiveMembership {
  /** Customer-facing plan name, e.g. "Advantage Plan". */
  planName: string;
}

// Plan names barely change — cache them so a lookup costs one call, not two.
const TYPE_TTL_MS = 60 * 60 * 1000;
let typeCache: { at: number; names: Map<number, string> } | null = null;

async function membershipTypeNames(config: ServiceTitanConfig): Promise<Map<number, string>> {
  if (typeCache && Date.now() - typeCache.at < TYPE_TTL_MS) return typeCache.names;
  const res = await stRequest<ListEnvelope<STMembershipType>>(config, 'memberships/v2', 'membership-types', {
    query: { pageSize: 200 }
  });
  const names = new Map<number, string>();
  for (const t of res.data ?? []) {
    const name = (t.displayName ?? '').trim() || (t.name ?? '').trim();
    if (name) names.set(t.id, name);
  }
  typeCache = { at: Date.now(), names };
  return names;
}

export async function getActiveMembership(
  config: ServiceTitanConfig,
  customerId: number | null | undefined
): Promise<ActiveMembership | null> {
  if (!customerId || !Number.isFinite(customerId)) return null;
  try {
    const res = await stRequest<ListEnvelope<STMembership>>(config, 'memberships/v2', 'memberships', {
      query: { customerIds: String(customerId), status: 'Active', pageSize: 5 }
    });
    const active = (res.data ?? []).find((m) => (m.status ?? '').toLowerCase() === 'active');
    if (!active) return null;
    const names = await membershipTypeNames(config).catch(() => new Map<number, string>());
    const planName = (active.membershipTypeId != null ? names.get(active.membershipTypeId) : undefined) ?? 'Membership';
    return { planName };
  } catch (error) {
    if (error instanceof ServiceTitanError && error.status === 403) {
      console.warn('[memberships] 403 — Memberships: Read scope missing; treating as non-member.');
    } else {
      console.error('[memberships] lookup failed (treating as non-member)', error);
    }
    return null;
  }
}
