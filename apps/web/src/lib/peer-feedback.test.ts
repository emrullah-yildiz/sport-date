import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Capture the SQL text the gated queries emit and feed back canned rows, so we can
// assert the shared-attendance / block / ended gates are present and exercise the
// eligibility branching without a live database.
const capturedQueries: string[] = [];
let nextRows: unknown[] = [];

function fakeSql(strings: TemplateStringsArray, ...values: unknown[]) {
  // Reconstruct the query text with placeholders so we can assert on its shape.
  const text = strings.reduce((acc, part, index) => acc + part + (index < values.length ? `$${index}` : ""), "");
  capturedQueries.push(text);
  return Promise.resolve(nextRows);
}

vi.mock("@/lib/db", () => ({ getDatabase: () => fakeSql }));

import {
  getPeerFeedbackTargets,
  peerFeedbackEditWindowOpen,
  PEER_FEEDBACK_EDIT_WINDOW_MS,
  savePeerFeedback,
} from "./peer-feedback";

const VALID = { showedUp: "yes", feltRespected: "yes", feltSafe: "yes", note: null } as const;

function reset(rows: unknown[]) {
  capturedQueries.length = 0;
  nextRows = rows;
}

describe("peer feedback edit window", () => {
  it("is open immediately after submitting and closed after 24h", () => {
    const submitted = new Date("2026-07-01T10:00:00Z");
    expect(peerFeedbackEditWindowOpen(submitted, new Date("2026-07-01T12:00:00Z"))).toBe(true);
    expect(peerFeedbackEditWindowOpen(submitted, new Date(submitted.getTime() + PEER_FEEDBACK_EDIT_WINDOW_MS - 1))).toBe(true);
    expect(peerFeedbackEditWindowOpen(submitted, new Date(submitted.getTime() + PEER_FEEDBACK_EDIT_WINDOW_MS + 1))).toBe(false);
  });
});

describe("savePeerFeedback authorization gates", () => {
  it("refuses self-feedback without touching the database", async () => {
    reset([]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "7", VALID);
    expect(result).toEqual({ ok: false, reason: "not_eligible" });
    // The self check short-circuits before any query runs.
    expect(capturedQueries).toHaveLength(0);
  });

  it("rejects a non-co-attendee (eligible CTE empty)", async () => {
    reset([{ eligible: null, locked: null, updated: null }]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", VALID);
    expect(result).toEqual({ ok: false, reason: "not_eligible" });
  });

  it("gates the write on shared attendance, block-freedom, and the event having ended", async () => {
    reset([{ eligible: 1, locked: null, updated: null }]);
    await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", VALID);
    const query = capturedQueries.join("\n");
    // Giver co-attended, recipient co-attended, no block either way, event ended.
    expect(query).toMatch(/event_participants/);
    expect(query).toMatch(/host_user_id/);
    expect(query).toMatch(/user_blocks/);
    expect(query).toMatch(/duration_minutes \* INTERVAL '1 minute'\) <= NOW\(\)/);
  });

  it("records an eligible first submission", async () => {
    reset([{ eligible: 1, locked: null, updated: false }]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", VALID);
    expect(result).toEqual({ ok: true, flaggedSafetyConcern: false, updated: false });
  });

  it("allows an update inside the edit window", async () => {
    reset([{ eligible: 1, locked: null, updated: true }]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", VALID);
    expect(result).toEqual({ ok: true, flaggedSafetyConcern: false, updated: true });
  });

  it("rejects a change after the edit window has locked", async () => {
    reset([{ eligible: 1, locked: 1, updated: null }]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", VALID);
    expect(result).toEqual({ ok: false, reason: "locked" });
  });

  it("carries the internal safety flag when the giver did not feel safe", async () => {
    reset([{ eligible: 1, locked: null, updated: false }]);
    const result = await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", {
      showedUp: "yes",
      feltRespected: "yes",
      feltSafe: "no",
      note: null,
    });
    expect(result).toEqual({ ok: true, flaggedSafetyConcern: true, updated: false });
  });
});

describe("getPeerFeedbackTargets", () => {
  it("gates on ended event, viewer attendance, co-attendance, and blocks", async () => {
    reset([]);
    await getPeerFeedbackTargets("11111111-1111-4111-8111-111111111111", "7");
    const query = capturedQueries.join("\n");
    expect(query).toMatch(/duration_minutes \* INTERVAL '1 minute'\) <= NOW\(\)/);
    expect(query).toMatch(/event_participants/);
    expect(query).toMatch(/user_blocks/);
    // Never selects any score/rating column — only the fixed confirmations.
    expect(query).not.toMatch(/rating|score|stars|attractiveness/i);
  });

  it("maps a submitted row to an editable target and marks a locked one non-editable", async () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - PEER_FEEDBACK_EDIT_WINDOW_MS - 60_000).toISOString();
    reset([
      { user_id: 9, first_name: "Bea", is_host: true, showed_up: "yes", felt_respected: "yes", felt_safe: "yes", note: null, created_at: recent },
      { user_id: 12, first_name: "Cai", is_host: false, showed_up: "yes", felt_respected: "yes", felt_safe: "yes", note: "kind", created_at: old },
      { user_id: 15, first_name: "Dee", is_host: false, showed_up: null, felt_respected: null, felt_safe: null, note: null, created_at: null },
    ]);
    const targets = await getPeerFeedbackTargets("11111111-1111-4111-8111-111111111111", "7");
    expect(targets[0]).toMatchObject({ userId: "9", isHost: true, submitted: true, editable: true });
    expect(targets[1]).toMatchObject({ userId: "12", submitted: true, editable: false });
    expect(targets[2]).toMatchObject({ userId: "15", submitted: false, editable: true, given: null });
  });
});
