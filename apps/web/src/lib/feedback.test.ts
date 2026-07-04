import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
// Keep the dark email a silent no-op in tests (its own gate is tested separately).
vi.mock("@/lib/auth-email-content", () => ({ resolveAuthEmailOrigin: () => "https://keepitup.social" }));

import { getDatabase } from "@/lib/db";
import {
  addMemberFeedbackComment,
  addTeamFeedbackReply,
  getFeedbackTicketForMember,
  listOpenFeedbackForAgent,
  setFeedbackStatus,
} from "./feedback";

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

const TICKET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OWNER = "202";
const OTHER = "303";

function ticketRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: TICKET_ID, category: "bug", surface: "web", summary: "The map felt cramped",
    details: "Long enough details here.", current_path: "/discover", expected_outcome: null,
    actual_outcome: null, severity: "low", status: "received", created_at: "2026-07-04T10:00:00Z",
    last_activity_at: "2026-07-04T10:00:00Z", has_unread: false, ...over,
  };
}

beforeEach(() => vi.clearAllMocks());

describe("getFeedbackTicketForMember — strict per-submitter access", () => {
  it("scopes the ticket read to the reporter and returns the thread", async () => {
    const { queries } = mockDbSequence([
      [ticketRow({ has_unread: true })],
      [{ id: "c1", author_kind: "team", body: "Thanks — we're looking.", created_at: "2026-07-04T11:00:00Z" }],
    ]);
    const thread = await getFeedbackTicketForMember(TICKET_ID, OWNER);
    expect(thread).not.toBeNull();
    expect(queries[0]).toContain(`reporter_user_id = «${OWNER}»`);
    // Team author is shown as "KeepItUp team", never an internal identity.
    expect(thread!.comments[0].authorLabel).toBe("KeepItUp team");
    expect(thread!.ticket.status).toBe("received");
    expect(thread!.ticket.hasUnread).toBe(true);
  });

  it("returns null (→ 404) when the ticket is not the viewer's, never running the thread query", async () => {
    const { queries } = mockDbSequence([[]]); // no owned row
    expect(await getFeedbackTicketForMember(TICKET_ID, OTHER)).toBeNull();
    expect(queries).toHaveLength(1); // thread query never reached
  });

  it("rejects a malformed id without a query", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await getFeedbackTicketForMember("not-a-uuid", OWNER)).toBeNull();
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("addMemberFeedbackComment — owner-only, doesn't self-notify", () => {
  it("inserts a 'member' comment and bumps last_activity_at but NOT last_team_activity_at", async () => {
    const { queries } = mockDbSequence([
      [{ id: TICKET_ID }], // ownership UPDATE matched
      [{ id: "c9", author_kind: "member", body: "One more thing", created_at: "2026-07-04T12:00:00Z" }],
    ]);
    const comment = await addMemberFeedbackComment(TICKET_ID, OWNER, "One more thing");
    expect(comment).toMatchObject({ authorKind: "member", authorLabel: "You" });
    expect(queries[0]).toContain(`reporter_user_id = «${OWNER}»`);
    expect(queries[0]).toContain("last_activity_at = NOW()");
    expect(queries[0]).not.toContain("last_team_activity_at"); // member reply never lights their own badge
    expect(queries[1]).toContain("author_kind, author_id, body");
  });

  it("returns null when the ticket isn't the viewer's (no insert)", async () => {
    const { queries } = mockDbSequence([[]]); // ownership UPDATE matched nothing
    expect(await addMemberFeedbackComment(TICKET_ID, OTHER, "hi")).toBeNull();
    expect(queries.some((q) => q.includes("INSERT INTO feedback_ticket_comments"))).toBe(false);
  });
});

describe("addTeamFeedbackReply — internal path lights the badge", () => {
  it("bumps BOTH activity markers and inserts a 'team' comment", async () => {
    const { queries } = mockDbSequence([
      [{ id: TICKET_ID }], // UPDATE ... RETURNING
      [{ id: "t1", author_kind: "team", body: "We shipped a fix.", created_at: "2026-07-04T13:00:00Z" }],
      [{ summary: "x", status: "in_progress", email: "a@b.co", first_name: "Ana" }], // notify read
    ]);
    const comment = await addTeamFeedbackReply(TICKET_ID, null, "We shipped a fix.");
    expect(comment).toMatchObject({ authorKind: "team", authorLabel: "KeepItUp team" });
    expect(queries[0]).toContain("last_team_activity_at = NOW()");
    expect(queries[1]).toContain("'team'");
  });
});

describe("setFeedbackStatus — internal status change", () => {
  it("writes the new status + team-activity marker and returns the updated ticket", async () => {
    const { queries } = mockDbSequence([
      [ticketRow({ status: "planned", has_unread: true })],
      [{ summary: "x", status: "planned", email: "a@b.co", first_name: "Ana" }], // notify read
    ]);
    const ticket = await setFeedbackStatus(TICKET_ID, "planned");
    expect(ticket!.status).toBe("planned");
    expect(queries[0]).toContain("SET status = «planned»");
    expect(queries[0]).toContain("last_team_activity_at = NOW()");
  });
});

describe("listOpenFeedbackForAgent", () => {
  it("excludes resolved/closed tickets and includes reporter + comment count", async () => {
    const { queries } = mockDbSequence([[{ ...ticketRow(), reporter_user_id: OWNER, reporter_first_name: "Ana", comment_count: 2 }]]);
    const tickets = await listOpenFeedbackForAgent();
    expect(tickets[0]).toMatchObject({ reporterUserId: OWNER, reporterFirstName: "Ana", commentCount: 2 });
    expect(queries[0]).toContain("status NOT IN ('resolved', 'closed', 'closed_not_planned')");
  });
});
