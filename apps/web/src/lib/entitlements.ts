import "server-only";

import {
  canUsePlusCapability,
  isPlus as isPlusDomain,
  memberEntitlements as memberEntitlementsDomain,
  type MemberEntitlements,
  type PlusCapability,
} from "@sport-date/domain";

import type { SessionUser } from "@/lib/session";

// Server-side entitlement seam (CX-20260701-plus-tier-entitlement-model-and-gating).
//
// This is the ONE place surfaces ask "is this member Plus?" / "may they use a
// Plus convenience?". All gating logic is the PURE, unit-tested domain helper
// (@sport-date/domain/entitlements); this module only adapts the server
// `SessionUser` shape into it. It fails closed to FREE for a null user or a
// missing/expired entitlement, mirroring photo-storage's fail-closed spirit.
//
// SAFETY & CORE participation are NEVER routed through here — the domain
// `PlusCapability` type has no safety/core member, so those paths cannot call
// `canUse` even by mistake (it would not typecheck).

/**
 * Is the given signed-in member currently Sport Date Plus? Fails closed to false
 * (FREE) for a null user or an absent/expired entitlement.
 */
export function isPlus(user: SessionUser | null | undefined, now: Date = new Date()): boolean {
  if (!user) return false;
  return isPlusDomain({ plusUntil: user.plusUntil ?? null }, now);
}

/**
 * The capability object a page/route holds for a member. Free for a null user.
 */
export function memberEntitlements(
  user: SessionUser | null | undefined,
  now: Date = new Date(),
): MemberEntitlements {
  return memberEntitlementsDomain({ plusUntil: user?.plusUntil ?? null }, now);
}

/**
 * May this member use a specific Plus-gated convenience? Only convenience
 * capabilities are accepted at the type level. Fails closed for free/expired/
 * null. Safety and core participation are not `PlusCapability`s and so can never
 * be passed here.
 */
export function canUse(
  user: SessionUser | null | undefined,
  capability: PlusCapability,
  now: Date = new Date(),
): boolean {
  if (!user) return false;
  return canUsePlusCapability({ plusUntil: user.plusUntil ?? null }, capability, now);
}
