import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { canUse, isPlus, memberEntitlements } from "./entitlements";
import type { SessionUser } from "./session";

const NOW = new Date("2026-07-01T12:00:00.000Z");
const FUTURE = "2026-08-01T12:00:00.000Z";
const PAST = "2026-06-01T12:00:00.000Z";

function user(plusUntil: string | null): SessionUser {
  return {
    id: "1",
    email: "member@example.com",
    age: 30,
    firstName: "Member",
    lastName: "Example",
    location: "Bucharest",
    bio: "",
    languages: [],
    seeking: "friendship",
    emailVerified: true,
    sports: [],
    prompts: [],
    plusUntil,
  };
}

describe("web entitlement seam over SessionUser", () => {
  it("a free (null plusUntil) member is not Plus and cannot use a Plus convenience", () => {
    const u = user(null);
    expect(isPlus(u, NOW)).toBe(false);
    expect(canUse(u, "advanced-discovery-filters", NOW)).toBe(false);
    expect(memberEntitlements(u, NOW).plus).toBe(false);
  });

  it("a Plus member (future plusUntil) is Plus and can use the convenience", () => {
    const u = user(FUTURE);
    expect(isPlus(u, NOW)).toBe(true);
    expect(canUse(u, "advanced-discovery-filters", NOW)).toBe(true);
    expect(memberEntitlements(u, NOW).plus).toBe(true);
  });

  it("an expired member cleanly reverts to free", () => {
    const u = user(PAST);
    expect(isPlus(u, NOW)).toBe(false);
    expect(canUse(u, "advanced-discovery-filters", NOW)).toBe(false);
  });

  it("fails closed to free for a null / undefined user", () => {
    expect(isPlus(null, NOW)).toBe(false);
    expect(isPlus(undefined, NOW)).toBe(false);
    expect(canUse(null, "advanced-discovery-filters", NOW)).toBe(false);
    expect(memberEntitlements(null, NOW).plus).toBe(false);
  });
});
