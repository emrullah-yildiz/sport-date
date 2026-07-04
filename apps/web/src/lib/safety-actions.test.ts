import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

import type { SafetyReportInput } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";
import { blockMember, createSafetyReport } from "./safety-actions";

function renderQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, part, index) => acc + part + (index < values.length ? `«${String(values[index])}»` : ""), "");
}

// A neon-style mock: `sql`…`` returns a thenable carrying that call's configured
// rows (so a standalone `await sql`…`` resolves), and `sql.transaction([...])`
// resolves to the rows of each query object in array order. Rows are assigned by
// creation order via `resultsByCall`.
function mockDb(resultsByCall: Array<Array<Record<string, unknown>>>) {
  const queries: string[] = [];
  const make = (text: string) => {
    const rows = resultsByCall[queries.length] ?? [];
    queries.push(text);
    return { text, rows, then: (resolve: (rows: unknown) => void) => resolve(rows) };
  };
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => make(renderQuery(strings, values))) as unknown as {
    (strings: TemplateStringsArray, ...values: unknown[]): unknown;
    transaction: (arr: Array<{ rows: unknown }>) => Promise<unknown[]>;
  };
  sql.transaction = vi.fn((arr: Array<{ rows: unknown }>) => Promise.resolve(arr.map((q) => q.rows)));
  vi.mocked(getDatabase).mockReturnValue(sql as never);
  return { queries };
}

const SHARED_ROW = {
  event_id: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
  sport: "Tennis",
  title: "Sunday tennis",
  starts_at: "2026-08-20T09:00:00.000Z",
  time_zone: "Europe/Bucharest",
  request_id: "11111111-1111-4111-8111-111111111111",
};

beforeEach(() => vi.clearAllMocks());

describe("blockMember — co-participant safety", () => {
  it("blocks with the active-account guard and returns the shared upcoming third-party event(s)", async () => {
    const { queries } = mockDb([
      [{ blocked_user_id: "303" }], // insert (newly blocked)
      [],                           // delete host↔member seats
      [],                           // cancel host↔member requests
      [SHARED_ROW],                 // shared upcoming events
    ]);
    const result = await blockMember("202", "303");
    expect(result.blocked).toBe(true);
    expect(result.sharedUpcomingEvents).toEqual([
      { eventId: SHARED_ROW.event_id, requestId: SHARED_ROW.request_id, sport: "Tennis", title: "Sunday tennis", startsAt: SHARED_ROW.starts_at, timeZone: "Europe/Bucharest" },
    ]);
    // Consolidated block mutation keeps the active-account guard.
    expect(queries[0]).toContain("account_status = 'active'");
    // Shared query is scoped to upcoming, third-party (neither hosts), both seated.
    expect(queries[3]).toContain("e.starts_at > NOW()");
    expect(queries[3]).toContain("e.host_user_id <> «202»");
    expect(queries[3]).toContain("e.host_user_id <> «303»");
    expect(queries[3]).toContain("blocker_request.status = 'accepted'");
  });

  it("returns no shared events when the two are not co-participants of any upcoming event", async () => {
    mockDb([[{ blocked_user_id: "303" }], [], [], []]);
    const result = await blockMember("202", "303");
    expect(result.blocked).toBe(true);
    expect(result.sharedUpcomingEvents).toEqual([]);
  });

  it("reports not-blocked (and no warning) for an inactive/unknown target with no prior block", async () => {
    mockDb([[], [], [], [], []]); // insert empty, then existing-block check empty
    const result = await blockMember("202", "999");
    expect(result.blocked).toBe(false);
    expect(result.sharedUpcomingEvents).toEqual([]);
  });

  it("treats an already-existing block as blocked (idempotent) and still surfaces the overlap", async () => {
    mockDb([
      [],                       // insert conflicted (already blocked) → no row
      [], [],                   // seat/request removal
      [SHARED_ROW],             // shared events
      [{ "?column?": 1 }],      // existing-block check finds the prior block
    ]);
    const result = await blockMember("202", "303");
    expect(result.blocked).toBe(true);
    expect(result.sharedUpcomingEvents).toHaveLength(1);
  });
});

describe("createSafetyReport — folds block into the shared helper", () => {
  const report: SafetyReportInput = { eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", reportedUserId: "303", category: "harassment", details: "x".repeat(30), blockUser: true };

  it("report-and-block uses the SAME active-guarded block mutation and returns the shared overlap", async () => {
    const { queries } = mockDb([
      [{ "?column?": 1 }], // relationship verified
      [],                  // report insert
      [],                  // report_created audit
      [],                  // block insert (guarded)
      [],                  // delete seats
      [],                  // cancel requests
      [],                  // subject_blocked audit
      [SHARED_ROW],        // shared upcoming events
    ]);
    const created = await createSafetyReport("202", report, "urgent");
    expect(created).not.toBeNull();
    expect(created!.sharedUpcomingEvents).toHaveLength(1);
    // The block branch now runs through blockMutationQueries → active-account guard.
    expect(queries[3]).toContain("account_status = 'active'");
    expect(queries[6]).toContain("subject_blocked");
    expect(queries[7]).toContain("blocker_request.status = 'accepted'");
  });

  it("a report WITHOUT a block does not run the block mutation and returns no overlap", async () => {
    const { queries } = mockDb([
      [{ "?column?": 1 }], // relationship verified
      [],                  // report insert
      [],                  // report_created audit
    ]);
    const created = await createSafetyReport("202", { ...report, blockUser: false }, "standard");
    expect(created).not.toBeNull();
    expect(created!.sharedUpcomingEvents).toEqual([]);
    expect(queries.some((q) => q.includes("user_blocks"))).toBe(false);
  });

  it("returns null when the reported relationship cannot be verified", async () => {
    mockDb([[]]); // relationship empty
    expect(await createSafetyReport("202", report, "urgent")).toBeNull();
  });
});
