import { describe, expect, it } from "vitest";

import { resolveEntitlementChange } from "./subscription-entitlement";

const PERIOD_END_UNIX = 1_767_225_600; // 2026-01-01T00:00:00Z
const PERIOD_END_ISO = new Date(PERIOD_END_UNIX * 1000).toISOString();

describe("resolveEntitlementChange — granting statuses set Plus until period end", () => {
  it("active grants Plus until the current period end", () => {
    const change = resolveEntitlementChange({ status: "active", currentPeriodEndUnixSeconds: PERIOD_END_UNIX });
    expect(change.grant).toBe(true);
    expect(change.plusUntil?.toISOString()).toBe(PERIOD_END_ISO);
  });

  it("trialing grants Plus until the current period end", () => {
    const change = resolveEntitlementChange({ status: "trialing", currentPeriodEndUnixSeconds: PERIOD_END_UNIX });
    expect(change.grant).toBe(true);
    expect(change.plusUntil?.toISOString()).toBe(PERIOD_END_ISO);
  });
});

describe("resolveEntitlementChange — non-granting statuses clear Plus (cancel-easy)", () => {
  for (const status of ["canceled", "unpaid", "past_due", "incomplete", "incomplete_expired", "paused"]) {
    it(`${status} clears Plus back to free`, () => {
      const change = resolveEntitlementChange({ status, currentPeriodEndUnixSeconds: PERIOD_END_UNIX });
      expect(change).toEqual({ grant: false, plusUntil: null });
    });
  }

  it("an unknown status fails closed to free", () => {
    expect(resolveEntitlementChange({ status: "who-knows", currentPeriodEndUnixSeconds: PERIOD_END_UNIX })).toEqual({
      grant: false,
      plusUntil: null,
    });
  });
});

describe("resolveEntitlementChange — fails closed on a missing/invalid period end", () => {
  it("active with no period end does NOT grant", () => {
    expect(resolveEntitlementChange({ status: "active" })).toEqual({ grant: false, plusUntil: null });
    expect(resolveEntitlementChange({ status: "active", currentPeriodEndUnixSeconds: null })).toEqual({
      grant: false,
      plusUntil: null,
    });
  });

  it("active with a non-positive or non-finite period end does NOT grant", () => {
    expect(resolveEntitlementChange({ status: "active", currentPeriodEndUnixSeconds: 0 }).grant).toBe(false);
    expect(resolveEntitlementChange({ status: "active", currentPeriodEndUnixSeconds: -1 }).grant).toBe(false);
    expect(resolveEntitlementChange({ status: "active", currentPeriodEndUnixSeconds: Number.NaN }).grant).toBe(false);
  });
});
