import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Capture the SQL text each query emits and hand back canned rows in call order,
// so we can assert the join guards and the cancelled-row reopen clause are present
// and exercise createEventJoinRequest's branching without a live database.
const capturedQueries: string[] = [];
let responses: unknown[][] = [];
let call = 0;

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce((acc, part, index) => acc + part + (index < values.length ? `$${index}` : ""), "");
  capturedQueries.push(text);
  const rows = responses[call] ?? [];
  call += 1;
  return Promise.resolve(rows);
}

vi.mock("@/lib/db", () => ({ getDatabase: () => fakeSql }));
vi.mock("@/lib/join-request-notifications", () => ({ notifyRequesterOfJoinDecision: vi.fn() }));

import { notifyRequesterOfJoinDecision } from "./join-request-notifications";
import { createEventJoinRequest, decideEventJoinRequest } from "./join-requests";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUESTER = { id: "11", age: 30 };

// A clean reliability row: no late-cancellation streak, no active pause.
const CLEAN_RELIABILITY = { late_cancellation_streak: 0, late_cancellation_streak_started_at: null, reliability_paused_until: null };

// Program the mock: first response answers the reliability SELECT, second answers
// the INSERT ... ON CONFLICT ... RETURNING.
function program(...queued: unknown[][]) {
  capturedQueries.length = 0;
  responses = queued;
  call = 0;
  vi.clearAllMocks();
}

describe("createEventJoinRequest re-request after an on-time self-cancel", () => {
  it("reopens the member's own cancelled row back to pending (no permanent lockout)", async () => {
    // On-time cancel => clean standing (no active cool-down); the reopen SELECT
    // passes every guard, so the ON CONFLICT DO UPDATE fires and RETURNING yields
    // the reopened row's real id and pending status.
    program([CLEAN_RELIABILITY], [{ id: "req-original", status: "pending" }]);

    const result = await createEventJoinRequest(EVENT_ID, REQUESTER, "Happy to come along again.");

    expect(result).toEqual({ requestId: "req-original", status: "pending" });
    const insert = capturedQueries[1];
    // The reopen is scoped to the member's OWN cancelled row: DO UPDATE with a
    // WHERE that only reopens a 'cancelled' status, so an accepted/declined/pending
    // row is never reopened.
    expect(insert).toMatch(/ON CONFLICT \(event_id, requester_user_id\) DO UPDATE/);
    expect(insert).toMatch(/status = 'pending'/);
    expect(insert).toMatch(/WHERE join_requests\.status = 'cancelled'/);
  });

  it("returns the row's real id from RETURNING, not the freshly generated uuid", async () => {
    // On a reopen the row keeps its ORIGINAL id, so the client can cancel it again.
    // We assert the returned id is exactly the RETURNING value, never a new uuid.
    program([CLEAN_RELIABILITY], [{ id: "the-original-row-id", status: "pending" }]);
    const result = await createEventJoinRequest(EVENT_ID, REQUESTER, "");
    expect(result).toEqual({ requestId: "the-original-row-id", status: "pending" });
  });
});

describe("createEventJoinRequest still enforces every join guard on re-request", () => {
  it("returns null (unavailable) when no row is written — closed/full/blocked/ineligible event", async () => {
    // The guards live in the INSERT ... SELECT WHERE. A closed/full/blocked/
    // ineligible event yields no selected row, so there is no conflict to update
    // and RETURNING is empty: createEventJoinRequest reports the event unavailable
    // rather than silently reopening. This is the same code path that blocks a
    // cancelled member from re-requesting a now-closed event.
    program([CLEAN_RELIABILITY], []);
    const result = await createEventJoinRequest(EVENT_ID, REQUESTER, "");
    expect(result).toBeNull();
  });

  it("keeps published/open/capacity/block/age/language guards but NO LONGER requires the profile sport/skill (CX-20260704)", async () => {
    program([CLEAN_RELIABILITY], [{ id: "req-1", status: "pending" }]);
    await createEventJoinRequest(EVENT_ID, REQUESTER, "");
    const insert = capturedQueries[1];
    // Event must still be published and in the future.
    expect(insert).toMatch(/events\.status = 'published' AND events\.starts_at > NOW\(\)/);
    // Host cannot request their own event.
    expect(insert).toMatch(/events\.host_user_id <> candidate\.id/);
    // Capacity must not be full.
    expect(insert).toMatch(/< events\.capacity/);
    // Mutual-block exclusion is still enforced.
    expect(insert).toMatch(/user_blocks/);
    // Age eligibility is still enforced.
    expect(insert).toMatch(/BETWEEN events\.minimum_age AND events\.maximum_age/);
    // Language preference is still enforced.
    expect(insert).toMatch(/candidate\.languages/);
    // The sport/skill gate is GONE — mirrors getDiscoverableEvents so a member is
    // never shown an event they'd then be barred from requesting. The
    // `compatible_sport` alias only ever existed on that removed JOIN.
    expect(insert).not.toContain("JOIN user_sports");
    expect(insert).not.toContain("compatible_sport");
  });
});

describe("createEventJoinRequest never bypasses an active reliability cool-down on re-request", () => {
  it("returns the private paused notice without ever reaching the insert/reopen when a cool-down is active", async () => {
    // A live late-cancellation pause: pausedUntil is in the future. The standing
    // gate returns BEFORE the INSERT, so a re-request can never bypass a legitimate
    // active cool-down.
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const pausedRow = { late_cancellation_streak: 3, late_cancellation_streak_started_at: new Date().toISOString(), reliability_paused_until: future };
    program([pausedRow]);

    const result = await createEventJoinRequest(EVENT_ID, REQUESTER, "");

    expect(result && "paused" in result ? result.paused : false).toBe(true);
    // Only the reliability SELECT ran; the reopen/insert was never attempted.
    expect(capturedQueries).toHaveLength(1);
    expect(capturedQueries.join("\n")).not.toMatch(/ON CONFLICT/);
  });

  it("proceeds to the reopen once a cool-down has lifted (self-lifting, not permanent)", async () => {
    // An expired pause (pausedUntil in the past) is no longer active, so a re-request
    // proceeds normally — the pause is time-boxed, never a permanent block.
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const liftedRow = { late_cancellation_streak: 3, late_cancellation_streak_started_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), reliability_paused_until: past };
    program([liftedRow], [{ id: "req-2", status: "pending" }]);

    const result = await createEventJoinRequest(EVENT_ID, REQUESTER, "");
    expect(result).toEqual({ requestId: "req-2", status: "pending" });
    expect(capturedQueries).toHaveLength(2);
  });
});

describe("join request decision notifications", () => {
  it("notifies an accepted requester exactly once after the seat is committed", async () => {
    program([{ id: "req-1", skip_count: 0 }]);

    await expect(decideEventJoinRequest(EVENT_ID, "req-1", "host-1", "accept")).resolves.toEqual({
      status: "accepted",
      skipCount: 0,
    });

    expect(notifyRequesterOfJoinDecision).toHaveBeenCalledOnce();
    expect(notifyRequesterOfJoinDecision).toHaveBeenCalledWith(EVENT_ID, "req-1", "accepted");
  });

  it("keeps an ordinary skip private and sends no requester notification", async () => {
    program([{ status: "pending", skip_count: 1 }]);

    await expect(decideEventJoinRequest(EVENT_ID, "req-1", "host-1", "skip")).resolves.toEqual({
      status: "pending",
      skipCount: 1,
    });

    expect(notifyRequesterOfJoinDecision).not.toHaveBeenCalled();
  });

  it("notifies once when the final skip closes the request", async () => {
    program([{ status: "declined", skip_count: 3 }]);

    await expect(decideEventJoinRequest(EVENT_ID, "req-1", "host-1", "skip")).resolves.toEqual({
      status: "declined",
      skipCount: 3,
    });

    expect(notifyRequesterOfJoinDecision).toHaveBeenCalledOnce();
    expect(notifyRequesterOfJoinDecision).toHaveBeenCalledWith(EVENT_ID, "req-1", "declined");
  });
});
