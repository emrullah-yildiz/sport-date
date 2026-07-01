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
  getReceivedRatingAggregate,
  peerFeedbackEditWindowOpen,
  PEER_FEEDBACK_EDIT_WINDOW_MS,
  savePeerFeedback,
} from "./peer-feedback";

const VALID = { showedUp: "yes", feltRespected: "yes", feltSafe: "yes", note: null, experienceStars: null } as const;

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
      experienceStars: null,
    });
    expect(result).toEqual({ ok: true, flaggedSafetyConcern: true, updated: false });
  });

  it("persists the experience star through the same gated write", async () => {
    reset([{ eligible: 1, locked: null, updated: false }]);
    await savePeerFeedback("11111111-1111-4111-8111-111111111111", "7", "9", { ...VALID, experienceStars: 5 });
    const query = capturedQueries.join("\n");
    // The star column is written on insert and updated on conflict — no separate path.
    expect(query).toMatch(/experience_stars/);
    expect(query).toMatch(/experience_stars = EXCLUDED\.experience_stars/);
  });
});

describe("getReceivedRatingAggregate (double-blind + ≥3 aggregate + recipient-only)", () => {
  it("only ever reads the recipient's OWN received stars, gated by the double-blind reveal", async () => {
    reset([]);
    await getReceivedRatingAggregate("42");
    const query = capturedQueries.join("\n");
    // Scoped to rows addressed TO this member — never another member's ratings.
    expect(query).toMatch(/to_user_id = \$\d+/);
    // Double-blind: a received star counts only if the recipient reciprocated for
    // that event OR the reveal window has passed.
    expect(query).toMatch(/from_user_id = \$\d+/); // the reciprocity EXISTS check
    expect(query).toMatch(/INTERVAL '14 days'/);
    // Never selects who gave the rating — no from_user_id is projected in SELECT.
    expect(query).toMatch(/SELECT received\.experience_stars/);
  });

  it("shows 'not enough' below three revealed ratings and never a partial average", async () => {
    reset([{ experience_stars: 5 }, { experience_stars: 4 }]);
    const aggregate = await getReceivedRatingAggregate("42");
    expect(aggregate.state).toBe("not_enough");
    expect("average" in aggregate).toBe(false);
  });

  it("returns an aggregate average once at least three ratings are revealed", async () => {
    reset([{ experience_stars: 5 }, { experience_stars: 4 }, { experience_stars: 3 }]);
    const aggregate = await getReceivedRatingAggregate("42");
    expect(aggregate).toEqual({ state: "available", average: 4, ratingCount: 3 });
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
    // The only numeric column selected is the member's OWN given experience star
    // (so the form can re-seed it) — never an attractiveness/desirability/popularity
    // score, and never anyone else's received rating.
    expect(query).not.toMatch(/attractiveness|desirability|popularity/i);
    expect(query).toMatch(/experience_stars/);
  });

  it("maps a submitted row to an editable target (with its given star) and marks a locked one non-editable", async () => {
    const recent = new Date().toISOString();
    const old = new Date(Date.now() - PEER_FEEDBACK_EDIT_WINDOW_MS - 60_000).toISOString();
    reset([
      { user_id: 9, first_name: "Bea", is_host: true, showed_up: "yes", felt_respected: "yes", felt_safe: "yes", note: null, experience_stars: 5, created_at: recent },
      { user_id: 12, first_name: "Cai", is_host: false, showed_up: "yes", felt_respected: "yes", felt_safe: "yes", note: "kind", experience_stars: null, created_at: old },
      { user_id: 15, first_name: "Dee", is_host: false, showed_up: null, felt_respected: null, felt_safe: null, note: null, experience_stars: null, created_at: null },
    ]);
    const targets = await getPeerFeedbackTargets("11111111-1111-4111-8111-111111111111", "7");
    expect(targets[0]).toMatchObject({ userId: "9", isHost: true, submitted: true, editable: true, given: { experienceStars: 5 } });
    expect(targets[1]).toMatchObject({ userId: "12", submitted: true, editable: false, given: { experienceStars: null } });
    expect(targets[2]).toMatchObject({ userId: "15", submitted: false, editable: true, given: null });
  });
});
