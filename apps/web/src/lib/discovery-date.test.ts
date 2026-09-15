import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({ sql: vi.fn(async () => []) }));
vi.mock("@/lib/db", () => ({ getDatabase: () => mocks.sql }));
import { parseDiscoveryDate, formatDiscoveryDay } from "./discovery-date";
import { getDiscoverableEvents } from "./events";

describe("discovery calendar date", () => {
  it.each(["2028-02-29", "2026-09-20", "2026-03-29", "2026-10-25", "0001-01-01"])("accepts real calendar date %s", (value) => {
    expect(parseDiscoveryDate(value)).toBe(value);
  });
  it.each(["2026-02-29", "2026-04-31", "2026-13-01", "0000-01-01", "2026-1-01", " 2026-09-20", "2026-09-20T00:00:00Z", "invalid", "", undefined, null, ["2026-09-20"]])("ignores malformed or repeated date %j", (value) => {
    expect(parseDiscoveryDate(value)).toBeNull();
  });
  it("labels dates without using the server's timezone", () => {
    expect(formatDiscoveryDay("2026-09-20")).toBe("20 September 2026");
  });
  it("filters by event-local date in SQL before limiting results, retaining all eligibility gates", async () => {
    await getDiscoverableEvents({ id: "member", age: 30 }, { city: "Bucharest", sport: "Tennis", language: "English", withinDays: 7, onDate: "2026-10-25" });
    const [strings, ...values] = mocks.sql.mock.calls.at(-1)! as unknown as [TemplateStringsArray, ...unknown[]];
    const sql = strings.join("?");
    expect(values.filter(value => value === "2026-10-25")).toHaveLength(2);
    expect(sql).toMatch(/CASE WHEN \?::date IS NOT NULL\s+THEN \(events.starts_at AT TIME ZONE events.time_zone\)::date = \?::date\s+ELSE events.starts_at <= NOW\(\)/);
    expect(sql.indexOf("AT TIME ZONE")).toBeLessThan(sql.indexOf("LIMIT 100"));
    for (const gate of ["events.starts_at > NOW()", "events.status = 'published'", "events.host_user_id <>", "BETWEEN events.minimum_age AND events.maximum_age", "CARDINALITY(candidate.languages)", "events.capacity", "user_blocks", "candidate.account_status = 'active'", "LOWER(events.sport)"]) expect(sql).toContain(gate);
    expect(sql).not.toContain("event_private_locations");
  });
  it("never binds an invalid date to a PostgreSQL date cast", async () => {
    await getDiscoverableEvents({ id: "member", age: 30 }, { city: "", sport: "", language: "", withinDays: 30, onDate: "2026-02-31" });
    const [, ...values] = mocks.sql.mock.calls.at(-1)! as unknown as [TemplateStringsArray, ...unknown[]];
    expect(values).not.toContain("2026-02-31");
    expect(values.filter(value => value === null)).toHaveLength(2);
    expect(values).toContain(30);
  });
});
