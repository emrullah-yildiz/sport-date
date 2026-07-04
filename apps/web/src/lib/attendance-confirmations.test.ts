import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/gmail-email-delivery", () => ({ sendGmailEmail: vi.fn() }));
vi.mock("@/lib/join-request-notifications", () => ({ notifyRequesterOfJoinDecision: vi.fn() }));

import { getDatabase } from "@/lib/db";
import { sendGmailEmail } from "@/lib/gmail-email-delivery";
import { hashAttendanceToken } from "./attendance-confirmation";
import {
  cancelAttendanceByMember,
  cancelAttendanceByToken,
  confirmAttendanceByToken,
  getEventAttendanceBreakdown,
  getViewerAttendanceState,
  runAttendanceReminderSweep,
} from "./attendance-confirmations";

function renderQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, part, index) => acc + part + (index < values.length ? `«${String(values[index])}»` : ""), "");
}

function mockDbSequence(resultsByCall: Array<Array<Record<string, unknown>>>) {
  const queries: string[] = [];
  let call = 0;
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push(renderQuery(strings, values));
    const rows = resultsByCall[call] ?? [];
    call += 1;
    return Promise.resolve(rows);
  });
  vi.mocked(getDatabase).mockReturnValue(sql as never);
  return { queries };
}

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const RAW = "a-raw-token-value-abcdefghij1234567890";
const NOW = new Date("2026-08-15T12:00:00.000Z");
const FUTURE = "2026-08-15T13:00:00.000Z"; // +1h — in window, token valid
const PAST = "2026-08-15T11:00:00.000Z"; // already started — expired

function confRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    status: "pending",
    member_id: 202,
    event_id: EVENT_ID,
    sport: "Tennis",
    public_area_label: "Floreasca",
    public_city: "Bucharest",
    starts_at: FUTURE,
    time_zone: "Europe/Bucharest",
    has_seat: true,
    ...over,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["EMAIL_DELIVERY_ENABLED", "EMAIL_DELIVERY_PROVIDER", "GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER_EMAIL"]) delete process.env[key];
});

describe("runAttendanceReminderSweep — idempotent T-2h selection", () => {
  it("selects published events in the next 2h whose attendees have no confirmation, and inserts with ON CONFLICT DO NOTHING", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const { queries } = mockDbSequence([
      [{ event_id: EVENT_ID, sport: "Tennis", public_area_label: "Floreasca", public_city: "Bucharest", starts_at: FUTURE, time_zone: "Europe/Bucharest", member_id: 202, email: "ana@example.com", first_name: "Ana" }],
      [{ id: "new-conf" }], // INSERT ... RETURNING (row inserted)
    ]);
    const summary = await runAttendanceReminderSweep(NOW);
    expect(summary.created).toBe(1);
    // Email is dark by default in tests → suppressed, nothing simulated/sent.
    expect(summary.suppressed).toBe(1);
    expect(summary.simulated).toBe(0);

    // Selection window + "no confirmation yet" guard. The window is widened to
    // bracket the daily cron (CX-20260704 Bug B) — 26h, not 2h.
    expect(queries[0]).toContain("e.status = 'published'");
    expect(queries[0]).toContain("INTERVAL '1 hour'");
    expect(queries[0]).toContain("«26»");
    expect(queries[0]).toContain("NOT EXISTS");
    expect(queries[0]).toContain("event_attendance_confirmations");
    // Idempotent insert.
    expect(queries[1]).toContain("INSERT INTO event_attendance_confirmations");
    expect(queries[1]).toContain("ON CONFLICT (event_id, member_id) DO NOTHING");
    consoleSpy.mockRestore();
  });

  it("never double-reminds: a conflicting insert (no RETURNING row) is not counted", async () => {
    const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    mockDbSequence([
      [{ event_id: EVENT_ID, sport: "Tennis", public_area_label: "Floreasca", public_city: "Bucharest", starts_at: FUTURE, time_zone: "Europe/Bucharest", member_id: 202, email: "ana@example.com", first_name: "Ana" }],
      [], // ON CONFLICT DO NOTHING → no row returned (another run won the race)
    ]);
    const summary = await runAttendanceReminderSweep(NOW);
    expect(summary.created).toBe(0);
    expect(summary.suppressed).toBe(0);
    consoleSpy.mockRestore();
  });

  it("removes the at-most-once marker after a Gmail failure so the next sweep can retry", async () => {
    Object.assign(process.env, {
      EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "gmail",
      GMAIL_CLIENT_ID: "id", GMAIL_CLIENT_SECRET: "secret",
      GMAIL_REFRESH_TOKEN: "refresh", GMAIL_SENDER_EMAIL: "support@keepitup.social",
    });
    vi.mocked(sendGmailEmail).mockRejectedValue(new Error("provider unavailable"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { queries } = mockDbSequence([
      [{ event_id: EVENT_ID, sport: "Tennis", public_area_label: "Floreasca", public_city: "Bucharest", starts_at: FUTURE, time_zone: "Europe/Bucharest", member_id: 202, email: "ana@example.com", first_name: "Ana" }],
      [{ id: "new-conf" }],
      [],
    ]);

    const summary = await runAttendanceReminderSweep(NOW);
    expect(summary.failed).toBe(1);
    expect(summary.sent).toBe(0);
    expect(queries[2]).toContain("DELETE FROM event_attendance_confirmations");
    expect(queries[2]).toContain("new-conf");
    errorSpy.mockRestore();
  });
});

describe("confirmAttendanceByToken", () => {
  it("looks up by token HASH (never the raw token) and confirms a valid pending row", async () => {
    const { queries } = mockDbSequence([[confRow()], [{ id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }]]);
    expect(await confirmAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("confirmed");
    expect(queries[0]).toContain(`c.token_hash = «${hashAttendanceToken(RAW)}»`);
    expect(queries[0]).not.toContain(RAW); // raw token is never in the SQL
    expect(queries[1]).toContain("SET status = 'confirmed'");
  });

  it("rejects an expired token (event already started) without mutating", async () => {
    const { queries } = mockDbSequence([[confRow({ starts_at: PAST })]]);
    expect(await confirmAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("expired");
    expect(queries).toHaveLength(1); // no UPDATE
  });

  it("returns invalid for an unknown token and already-cancelled for a released place", async () => {
    mockDbSequence([[]]);
    expect(await confirmAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("invalid");
    mockDbSequence([[confRow({ status: "cancelled" })]]);
    expect(await confirmAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("already-cancelled");
  });
});

describe("cancelAttendanceByToken — releases the spot", () => {
  it("deletes the participant seat, cancels the join request, and marks the confirmation cancelled", async () => {
    const { queries } = mockDbSequence([[confRow()], []]);
    expect(await cancelAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("cancelled");
    const release = queries[1];
    expect(release).toContain("DELETE FROM event_participants");
    expect(release).toContain("UPDATE join_requests");
    expect(release).toContain("status = 'cancelled'");
    expect(release).toContain("event_attendance_confirmations");
  });

  it("records the SAME late-cancellation reliability signal as the normal cancel path (Bug A parity)", async () => {
    // load conf row → release → SELECT reliability (member has a clean streak) → UPDATE users
    const { queries } = mockDbSequence([
      [confRow()],
      [],
      [{ late_cancellation_streak: 0, late_cancellation_streak_started_at: null, reliability_paused_until: null }],
      [],
    ]);
    expect(await cancelAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("cancelled");
    // The reliability accounting ran: it read the member's standing and persisted
    // the incremented streak — the T-2h cancel can no longer evade the signal.
    expect(queries[2]).toContain("late_cancellation_streak");
    expect(queries[2]).toContain("FROM users WHERE id = «202»");
    expect(queries[3]).toContain("UPDATE users");
    expect(queries[3]).toContain("SET late_cancellation_streak = «1»");
  });

  it("does not accrue a signal for an already-started (expired) or already-cancelled place", async () => {
    // expired → early return, no release/reliability query
    const expired = mockDbSequence([[confRow({ starts_at: PAST })]]);
    expect(await cancelAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("expired");
    expect(expired.queries).toHaveLength(1);
  });

  it("is idempotent when already cancelled, and rejects an expired token", async () => {
    mockDbSequence([[confRow({ status: "cancelled" })]]);
    expect(await cancelAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("cancelled");
    const { queries } = mockDbSequence([[confRow({ starts_at: PAST })]]);
    expect(await cancelAttendanceByToken(EVENT_ID, RAW, NOW)).toBe("expired");
    expect(queries).toHaveLength(1); // no release ran
  });

  it("rejects a malformed event id and a too-short token without a query", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await cancelAttendanceByToken("not-a-uuid", RAW, NOW)).toBe("invalid");
    expect(await cancelAttendanceByToken(EVENT_ID, "short", NOW)).toBe("invalid");
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("cancelAttendanceByMember — in-app prompt parity", () => {
  it("releases the seat AND accrues the reliability signal, just like the token + normal cancel paths", async () => {
    // getViewerAttendanceState → INSERT cancelled conf → release seat/request → SELECT reliability → UPDATE users
    const { queries } = mockDbSequence([
      [{ starts_at: FUTURE, time_zone: "Europe/Bucharest", is_host: false, has_seat: true, confirmation_status: "pending" }],
      [],
      [],
      [{ late_cancellation_streak: 1, late_cancellation_streak_started_at: "2026-08-14T12:00:00.000Z", reliability_paused_until: null }],
      [],
    ]);
    expect(await cancelAttendanceByMember(EVENT_ID, "202", NOW)).toBe("cancelled");
    expect(queries[2]).toContain("DELETE FROM event_participants");
    expect(queries[3]).toContain("FROM users WHERE id = «202»");
    expect(queries[4]).toContain("UPDATE users");
    expect(queries[4]).toContain("SET late_cancellation_streak = «2»");
  });
});

describe("getViewerAttendanceState + host breakdown", () => {
  it("returns the in-window state for an accepted non-host attendee", async () => {
    mockDbSequence([[{ starts_at: FUTURE, time_zone: "Europe/Bucharest", is_host: false, has_seat: true, confirmation_status: "pending" }]]);
    const state = await getViewerAttendanceState(EVENT_ID, "202", NOW);
    expect(state).toMatchObject({ withinWindow: true, status: "pending" });
  });

  it("returns null for the host or a non-participant (no prompt)", async () => {
    mockDbSequence([[{ starts_at: FUTURE, time_zone: "Europe/Bucharest", is_host: true, has_seat: true, confirmation_status: null }]]);
    expect(await getViewerAttendanceState(EVENT_ID, "101", NOW)).toBeNull();
    mockDbSequence([[{ starts_at: FUTURE, time_zone: "Europe/Bucharest", is_host: false, has_seat: false, confirmation_status: null }]]);
    expect(await getViewerAttendanceState(EVENT_ID, "303", NOW)).toBeNull();
  });

  it("host breakdown counts by status and is scoped to the host's own event", async () => {
    const { queries } = mockDbSequence([[{ total: 6, confirmed: 3, pending: 1, cancelled: 2 }]]);
    const breakdown = await getEventAttendanceBreakdown(EVENT_ID, "101");
    expect(breakdown).toEqual({ confirmed: 3, pending: 1, cancelled: 2, remindersSent: true });
    expect(queries[0]).toContain("e.host_user_id = «101»");
    expect(queries[0]).toContain("FILTER (WHERE c.status = 'confirmed')");
  });

  it("labels the breakdown honestly (remindersSent=false) when no confirmation rows exist yet (Bug B)", async () => {
    // Event exists but the daily sweep hasn't created any rows → all counts 0.
    mockDbSequence([[{ total: 0, confirmed: 0, pending: 0, cancelled: 0 }]]);
    const breakdown = await getEventAttendanceBreakdown(EVENT_ID, "101");
    expect(breakdown).toEqual({ confirmed: 0, pending: 0, cancelled: 0, remindersSent: false });
  });
});
