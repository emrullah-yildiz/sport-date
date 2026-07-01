// Pure mapping from a Stripe subscription's status → the member's Plus entitlement
// change (CX-20260701-stripe-subscription-integration-test-mode).
//
// This module is PURE (no Stripe SDK, no I/O, no DB) so the "which statuses grant
// Plus, and until when" rule is exhaustively unit-testable and cannot drift. The
// server lib feeds it the two fields it reads off a verified Stripe subscription
// event (status + current_period_end) and applies the returned change to the
// existing `plus_until` entitlement column (migration 025). It mirrors the
// fail-closed spirit of entitlements.ts: any unrecognised / missing input clears
// Plus (least privilege) rather than granting it.
//
// GUARDRAIL: the ONLY thing a subscription grants is the Plus entitlement window.
// It never grants a forbidden perk — this helper returns a date or null, nothing
// else. Cancel-easy: a canceled/unpaid/incomplete/paused status clears Plus back
// to free with no lingering half-state.

/** The subset of Stripe subscription statuses we act on. Others fail closed. */
export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

/**
 * The entitlement change to apply. `plusUntil` is the instant Plus should lapse
 * (from the subscription's current period end) when granting, or null to clear
 * Plus back to free.
 */
export type EntitlementChange =
  | { grant: true; plusUntil: Date }
  | { grant: false; plusUntil: null };

/** Statuses that keep a member Plus (Plus stays on until the current period ends). */
const GRANTING_STATUSES: ReadonlySet<string> = new Set(["active", "trialing"]);

/**
 * Resolve a subscription (status + current period end, in Unix SECONDS as Stripe
 * sends it) into the entitlement change to apply.
 *
 *   * active / trialing WITH a valid future-or-any period end → grant Plus until
 *     that instant. `plus_until > now` in the entitlement helper then decides
 *     whether the member is currently Plus, so a period end works uniformly.
 *   * everything else (canceled, unpaid, past_due, incomplete*, paused, unknown
 *     status, or a missing/invalid period end) → clear Plus (grant: false).
 *
 * Fails closed: a granting status with no usable period end does NOT grant.
 */
export function resolveEntitlementChange(input: {
  status: string;
  currentPeriodEndUnixSeconds?: number | null;
}): EntitlementChange {
  if (!GRANTING_STATUSES.has(input.status)) {
    return { grant: false, plusUntil: null };
  }
  const seconds = input.currentPeriodEndUnixSeconds;
  if (typeof seconds !== "number" || !Number.isFinite(seconds) || seconds <= 0) {
    return { grant: false, plusUntil: null };
  }
  const date = new Date(seconds * 1000);
  if (!Number.isFinite(date.getTime())) {
    return { grant: false, plusUntil: null };
  }
  return { grant: true, plusUntil: date };
}
