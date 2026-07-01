// Membership entitlements — the single, fail-closed source of truth for "is this
// member Plus?" and "may this member use capability X?"
// (CX-20260701-plus-tier-entitlement-model-and-gating).
//
// This module is PURE (no I/O, no DB, no time source other than an injected
// `now`) so it can be unit-tested exhaustively and reused by the server lib layer
// and any surface without re-implementing gating. It mirrors the "one isolated,
// tested seam" discipline of photo-storage / reliability.
//
// PRODUCT GUARDRAILS baked into the type system, not just convention:
//   * The FREE tier is fully usable FOREVER. Every SAFETY feature and ALL CORE
//     participation are UNGATED for everyone. Those capabilities are simply not
//     members of `PlusCapability` — there is no way to route them through the
//     gate, so a future edit that tried to gate one would not typecheck.
//   * Plus is CONVENIENCE / RICHNESS only. Forbidden perks (paid boosts / likes /
//     priority visibility, paid access to people, "see who rated/skipped/viewed
//     you", unlimited or per-tier photos, any attractiveness/popularity mechanic)
//     are NOT and must NEVER be added to `PlusCapability`.
//   * FAIL CLOSED: unknown / missing / null / expired entitlement resolves to
//     FREE (least privilege). A member is Plus ONLY while `plusUntil > now`.
//   * NO billing here. This is entitlement STATE, never a payment record.

/**
 * The minimal entitlement state we read for a member. `plusUntil` is the instant
 * their Plus access lapses; anything falsy / non-Date / in the past means FREE.
 * Deliberately accepts `unknown`-ish shapes at the boundary so a malformed row
 * fails closed rather than throwing.
 */
export type MemberEntitlementInput = {
  readonly plusUntil?: Date | string | null;
};

/**
 * The ONLY capabilities the Plus gate may guard. These are convenience/richness
 * conveniences — never safety, never core participation, never a forbidden perk.
 *
 * `advanced-discovery-filters` is the first real consumer (its own P2 ticket).
 * The others are honest placeholders for the approved Plus line; adding a NEW
 * entry here is the deliberate, reviewable act of declaring something Plus-only.
 *
 * DO NOT add any safety capability (report, block, leave, emergency guidance,
 * approximate-location privacy, Safety Center, moderation, appeals), any core
 * capability (discover, request, cancel, attend, host baseline, message, sign
 * out, basic profile, reflection, photos), or any forbidden perk.
 */
export const PLUS_CAPABILITIES = [
  // Richer discovery controls (e.g. save filter presets, more filter facets).
  "advanced-discovery-filters",
] as const;

export type PlusCapability = (typeof PLUS_CAPABILITIES)[number];

/**
 * SAFETY and CORE-PARTICIPATION capabilities. These exist ONLY so the regression
 * guard can assert, by name, that none of them is ever a `PlusCapability`. They
 * are always available to every member regardless of tier. If a future change
 * moved any of these into `PLUS_CAPABILITIES`, the guard test (and the type,
 * since the sets are asserted disjoint) fails.
 */
export const ALWAYS_FREE_CAPABILITIES = [
  // Safety — never gated.
  "report",
  "block",
  "leave-event",
  "emergency-guidance",
  "approximate-location-privacy",
  "safety-center",
  "moderation",
  "appeals",
  // Core participation — never gated.
  "discover",
  "request-place",
  "cancel-request",
  "attend",
  "host-baseline",
  "message",
  "sign-out",
  "basic-profile",
  "reflection",
  "profile-photos",
] as const;

export type AlwaysFreeCapability = (typeof ALWAYS_FREE_CAPABILITIES)[number];

/**
 * The capability object surfaces read. Computed once from the entitlement state.
 * `plus` is the boolean tier; `can` answers a Plus-gated convenience check.
 */
export type MemberEntitlements = Readonly<{
  plus: boolean;
  can: (capability: PlusCapability) => boolean;
}>;

/**
 * Coerce a stored `plusUntil` value into a valid future Date, or null. Any
 * malformed / unparseable / non-future value fails closed to null (= FREE).
 */
function parsePlusUntil(value: Date | string | null | undefined, now: Date): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  const ms = date.getTime();
  if (!Number.isFinite(ms)) return null; // malformed -> free
  if (ms <= now.getTime()) return null; // expired / exactly-now -> free
  return date;
}

/**
 * Is this member currently Plus? True ONLY while a valid `plusUntil` is strictly
 * in the future. Fails closed to FREE for null / missing / malformed / expired
 * input, or a missing/invalid `now`.
 */
export function isPlus(input: MemberEntitlementInput | null | undefined, now: Date = new Date()): boolean {
  if (!input || typeof input !== "object") return false;
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) return false;
  return parsePlusUntil(input.plusUntil ?? null, now) !== null;
}

/**
 * May this member use a specific Plus-gated convenience? Only `PlusCapability`
 * values are accepted at the type level, so safety/core paths can never call
 * this. Returns true iff the member is currently Plus AND the capability is a
 * real declared Plus capability (defence in depth against a bad cast at a JS
 * boundary). Fails closed otherwise.
 */
export function canUsePlusCapability(
  input: MemberEntitlementInput | null | undefined,
  capability: PlusCapability,
  now: Date = new Date(),
): boolean {
  if (!(PLUS_CAPABILITIES as readonly string[]).includes(capability)) return false;
  return isPlus(input, now);
}

/**
 * Build the capability object a surface holds. `plus` is resolved once; `can`
 * closes over the same `now` so every check in a request is consistent.
 */
export function memberEntitlements(
  input: MemberEntitlementInput | null | undefined,
  now: Date = new Date(),
): MemberEntitlements {
  const plus = isPlus(input, now);
  return {
    plus,
    can: (capability: PlusCapability) => plus && canUsePlusCapability(input, capability, now),
  };
}

/**
 * True iff `capability` is one the Plus gate is allowed to guard. Used by the
 * regression guard to prove the two capability sets are disjoint (no safety/core
 * capability has leaked into the gate).
 */
export function isPlusGatedCapability(capability: string): capability is PlusCapability {
  return (PLUS_CAPABILITIES as readonly string[]).includes(capability);
}
