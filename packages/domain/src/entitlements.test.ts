import { describe, expect, it } from "vitest";

import {
  ALWAYS_FREE_CAPABILITIES,
  canUsePlusCapability,
  isPlus,
  isPlusGatedCapability,
  memberEntitlements,
  PLUS_CAPABILITIES,
  type PlusCapability,
} from "./entitlements";

const NOW = new Date("2026-07-01T12:00:00.000Z");
const FUTURE = new Date("2026-08-01T12:00:00.000Z");
const PAST = new Date("2026-06-01T12:00:00.000Z");

describe("isPlus — Plus only while not expired", () => {
  it("is Plus when plusUntil is in the future", () => {
    expect(isPlus({ plusUntil: FUTURE }, NOW)).toBe(true);
  });

  it("accepts a future timestamp string (as it arrives from the DB row)", () => {
    expect(isPlus({ plusUntil: FUTURE.toISOString() }, NOW)).toBe(true);
  });

  it("is free once plusUntil has passed", () => {
    expect(isPlus({ plusUntil: PAST }, NOW)).toBe(false);
  });

  it("is free at the exact expiry instant (strictly-future required)", () => {
    expect(isPlus({ plusUntil: NOW }, NOW)).toBe(false);
  });
});

describe("isPlus — fails closed to free on missing / null / malformed", () => {
  it("null plusUntil is free", () => {
    expect(isPlus({ plusUntil: null }, NOW)).toBe(false);
  });

  it("absent plusUntil is free", () => {
    expect(isPlus({}, NOW)).toBe(false);
  });

  it("null / undefined input is free", () => {
    expect(isPlus(null, NOW)).toBe(false);
    expect(isPlus(undefined, NOW)).toBe(false);
  });

  it("a non-object input is free", () => {
    // Deliberately abusing the boundary the way a bad DB row might.
    expect(isPlus("plus" as unknown as null, NOW)).toBe(false);
    expect(isPlus(42 as unknown as null, NOW)).toBe(false);
  });

  it("a malformed / unparseable timestamp is free", () => {
    expect(isPlus({ plusUntil: "not-a-date" }, NOW)).toBe(false);
    expect(isPlus({ plusUntil: new Date("nonsense") }, NOW)).toBe(false);
  });

  it("an invalid `now` fails closed to free (never accidentally Plus)", () => {
    expect(isPlus({ plusUntil: FUTURE }, new Date("nonsense"))).toBe(false);
  });
});

describe("canUsePlusCapability — sample Plus-only convenience", () => {
  const sample: PlusCapability = "advanced-discovery-filters";

  it("a free member cannot use a Plus-only convenience", () => {
    expect(canUsePlusCapability({ plusUntil: null }, sample, NOW)).toBe(false);
    expect(canUsePlusCapability({ plusUntil: PAST }, sample, NOW)).toBe(false);
    expect(canUsePlusCapability(null, sample, NOW)).toBe(false);
  });

  it("a Plus member can use a Plus-only convenience", () => {
    expect(canUsePlusCapability({ plusUntil: FUTURE }, sample, NOW)).toBe(true);
  });

  it("an expired Plus member cannot use it (clean lapse to free)", () => {
    expect(canUsePlusCapability({ plusUntil: PAST }, sample, NOW)).toBe(false);
  });
});

describe("memberEntitlements capability object", () => {
  it("free member: plus=false and can() denies", () => {
    const ent = memberEntitlements({ plusUntil: null }, NOW);
    expect(ent.plus).toBe(false);
    expect(ent.can("advanced-discovery-filters")).toBe(false);
  });

  it("Plus member: plus=true and can() allows the declared capability", () => {
    const ent = memberEntitlements({ plusUntil: FUTURE }, NOW);
    expect(ent.plus).toBe(true);
    expect(ent.can("advanced-discovery-filters")).toBe(true);
  });
});

describe("HARD GUARDRAIL — safety & core capabilities are never Plus-gated", () => {
  it("no always-free (safety/core) capability is a Plus capability", () => {
    for (const cap of ALWAYS_FREE_CAPABILITIES) {
      expect(isPlusGatedCapability(cap)).toBe(false);
    }
  });

  it("the Plus and always-free capability sets are disjoint", () => {
    const plusSet = new Set<string>(PLUS_CAPABILITIES);
    const overlap = ALWAYS_FREE_CAPABILITIES.filter((cap) => plusSet.has(cap));
    expect(overlap).toEqual([]);
  });

  it("every safety capability is present in the always-free set (regression guard)", () => {
    // If a future edit removed one of these from the always-free set (e.g. to gate
    // it), this fails — the safety floor is asserted by name.
    for (const safety of [
      "report",
      "block",
      "leave-event",
      "emergency-guidance",
      "approximate-location-privacy",
      "safety-center",
      "moderation",
      "appeals",
    ]) {
      expect((ALWAYS_FREE_CAPABILITIES as readonly string[]).includes(safety)).toBe(true);
      expect(isPlusGatedCapability(safety)).toBe(false);
    }
  });

  it("every core participation capability is always free (regression guard)", () => {
    for (const core of [
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
    ]) {
      expect((ALWAYS_FREE_CAPABILITIES as readonly string[]).includes(core)).toBe(true);
      expect(isPlusGatedCapability(core)).toBe(false);
    }
  });

  it("no forbidden perk is ever a Plus capability", () => {
    // These must never be gate-able. If any is added to PLUS_CAPABILITIES this fails.
    for (const forbidden of [
      "boost",
      "priority-visibility",
      "see-who-viewed-you",
      "see-who-rated-you",
      "see-who-skipped-you",
      "paid-likes",
      "unlimited-photos",
      "attractiveness-score",
      "popularity",
    ]) {
      expect(isPlusGatedCapability(forbidden)).toBe(false);
    }
  });
});
