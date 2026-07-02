import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Capture the SQL text the authorization query emits and feed back canned rows, so we
// can assert every relationship + block gate is present and exercise the null / mapped
// branches without a live database. Same shape as peer-feedback.test.ts.
const capturedQueries: string[] = [];
let nextRows: unknown[] = [];

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((acc, part, index) => acc + part + (index < values.length ? `$${index}` : ""), "");
  capturedQueries.push(text);
  return Promise.resolve(nextRows);
}

vi.mock("@/lib/db", () => ({ getDatabase: () => fakeSql }));

// The photo lookup is a separate, already block-gated call; stub it so the test is
// about the authorization boundary, not photo storage.
const listProfilePhotos = vi.fn((): Promise<unknown[]> => Promise.resolve([]));
vi.mock("@/lib/photos", () => ({ listProfilePhotos: (userId: string) => listProfilePhotos(userId) }));

import { getViewableMemberProfile } from "./member-profile";

function reset(rows: unknown[]) {
  capturedQueries.length = 0;
  nextRows = rows;
  listProfilePhotos.mockClear();
  listProfilePhotos.mockResolvedValue([]);
}

const ROW = {
  id: "42",
  first_name: "Bianca",
  last_name: "Popescu",
  age: 29,
  location: "Bucharest",
  bio: "Weekend tennis, always up for a rally.",
  languages: ["Romanian", "English"],
  seeking: "friendship",
  prompts: [{ prompt: "A perfect Saturday game is…", answer: "Doubles, then coffee." }],
  sports: [{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }],
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("getViewableMemberProfile authorization boundary", () => {
  it("refuses self-view without touching the database", async () => {
    reset([ROW]);
    const result = await getViewableMemberProfile("7", "7");
    expect(result).toBeNull();
    expect(capturedQueries).toHaveLength(0);
    expect(listProfilePhotos).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric / unenumerable target id without a query", async () => {
    reset([ROW]);
    expect(await getViewableMemberProfile("7", "abc")).toBeNull();
    expect(await getViewableMemberProfile("7", "1; DROP TABLE users")).toBeNull();
    expect(await getViewableMemberProfile("7", "")).toBeNull();
    expect(capturedQueries).toHaveLength(0);
  });

  it("gates the read on all three relationships and a two-way block check", async () => {
    reset([]);
    await getViewableMemberProfile("7", "42");
    const query = capturedQueries.join("\n");
    // Block-freedom in BOTH directions.
    expect(query).toMatch(/user_blocks/);
    expect(query).toMatch(/blocker_user_id = \$\d+ AND blocked_user_id = target\.id/);
    expect(query).toMatch(/blocker_user_id = target\.id AND blocked_user_id = \$\d+/);
    // 1. Host -> requester (pending/accepted).
    expect(query).toMatch(/join_requests/);
    expect(query).toMatch(/status IN \('pending', 'accepted'\)/);
    // 2 & 3. Accepted seats via event_participants (host + co-participants).
    expect(query).toMatch(/event_participants/);
    expect(query).toMatch(/host_user_id = target\.id/);
    // Only active accounts are viewable.
    expect(query).toMatch(/account_status = 'active'/);
  });

  it("returns null (→ 404) for an unrelated or blocked viewer: no qualifying row", async () => {
    reset([]);
    const result = await getViewableMemberProfile("7", "42");
    expect(result).toBeNull();
    // Never loads photos for a viewer with no qualifying relationship.
    expect(listProfilePhotos).not.toHaveBeenCalled();
  });

  it("maps a qualifying row to a privacy-safe profile and loads that member's photos", async () => {
    reset([ROW]);
    const result = await getViewableMemberProfile("7", "42");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("42");
    expect(result!.firstName).toBe("Bianca");
    expect(result!.seeking).toBe("friendship");
    expect(result!.sports).toEqual([{ name: "Tennis", skillLevel: "intermediate", frequency: "weekly" }]);
    expect(result!.prompts).toEqual([{ prompt: "A perfect Saturday game is…", answer: "Doubles, then coffee." }]);
    expect(listProfilePhotos).toHaveBeenCalledWith("42");
  });

  it("leaks NO contact detail or precise/private location field", async () => {
    reset([ROW]);
    const result = await getViewableMemberProfile("7", "42");
    const keys = Object.keys(result!);
    // The projection must not carry email, verification, entitlement, reliability,
    // or any private/precise-location field to another member.
    for (const forbidden of ["email", "emailVerified", "plusUntil", "venueName", "address", "instructions", "phone", "dateOfBirth"]) {
      expect(keys).not.toContain(forbidden);
    }
    // The authorization query itself must never SELECT contact/precise-location.
    const query = capturedQueries.join("\n");
    expect(query).not.toMatch(/\bemail\b/i);
    expect(query).not.toMatch(/venue_name|\baddress\b|arrival_instructions|private_location/i);
    // Approximate free-text location stays (same field discovery already shows).
    expect(result!.location).toBe("Bucharest");
  });

  it("normalises a null prompts column to an empty array", async () => {
    reset([{ ...ROW, prompts: null }]);
    const result = await getViewableMemberProfile("7", "42");
    expect(result!.prompts).toEqual([]);
  });
});
