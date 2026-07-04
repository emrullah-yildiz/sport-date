import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

import { getDatabase } from "@/lib/db";
import { canPostEventMessage, deleteOwnEventMessage, getEventMessages, postEventMessage } from "./event-messages";

// Reconstruct the raw SQL text (with bound values inlined as «value») a tagged
// `sql` call was built from, so authorization/block clauses can be asserted
// without a live database — same technique as discoverable-event-view.test.ts.
function renderQuery(strings: TemplateStringsArray, values: unknown[]): string {
  return strings.reduce((acc, part, index) => acc + part + (index < values.length ? `«${String(values[index])}»` : ""), "");
}

const HOST_ID = "101";
const ACCEPTED_ID = "202";
const OTHER_ID = "303";
const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

// Capture every query the lib issues, and feed each call a scripted result set so
// the first (authorization) query and the second (thread/insert) query can return
// different shapes.
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
  return { queries, sql };
}

describe("event-room chat authorization (canPostEventMessage)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("authorizes a viewer only when the SQL matches host OR accepted participant of a live event", async () => {
    const { queries } = mockDbSequence([[{ ["?column?"]: 1 }]]);
    const ok = await canPostEventMessage(EVENT_ID, ACCEPTED_ID);
    expect(ok).toBe(true);
    // The authorization query gates on live status and host-or-accepted membership.
    expect(queries[0]).toContain("events.status IN ('published', 'completed')");
    expect(queries[0]).toContain(`events.host_user_id = «${ACCEPTED_ID}»`);
    expect(queries[0]).toContain("FROM event_participants");
    expect(queries[0]).toContain("user_id = «202»");
  });

  it("denies when no authorized row matches (pending/declined/non-participant)", async () => {
    mockDbSequence([[]]);
    expect(await canPostEventMessage(EVENT_ID, OTHER_ID)).toBe(false);
  });

  it("applies the mutual-block guard against the host for non-host viewers", async () => {
    const { queries } = mockDbSequence([[{ ["?column?"]: 1 }]]);
    await canPostEventMessage(EVENT_ID, ACCEPTED_ID);
    expect(queries[0]).toContain("user_blocks");
    expect(queries[0]).toContain(`blocker_user_id = «${ACCEPTED_ID}» AND blocked_user_id = events.host_user_id`);
    expect(queries[0]).toContain(`blocker_user_id = events.host_user_id AND blocked_user_id = «${ACCEPTED_ID}»`);
  });

  it("rejects a malformed event id without touching the database", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await canPostEventMessage("not-a-uuid", ACCEPTED_ID)).toBe(false);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("event-room chat read (getEventMessages)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns null for an unauthorized viewer and never runs the thread query", async () => {
    const { queries } = mockDbSequence([[]]); // authorization returns no row
    const result = await getEventMessages(EVENT_ID, OTHER_ID);
    expect(result).toBeNull();
    // Only the authorization query ran; the thread query was never reached.
    expect(queries).toHaveLength(1);
  });

  it("reads the thread oldest-first and filters blocked pairs in BOTH directions", async () => {
    const { queries } = mockDbSequence([
      [{ ["?column?"]: 1 }], // authorized
      [
        { id: "m1", sender_user_id: HOST_ID, sender_first_name: "Ana", body: "Welcome!", created_at: "2026-07-10T10:00:00Z", deleted_at: null },
      ],
    ]);
    const messages = await getEventMessages(EVENT_ID, ACCEPTED_ID);
    expect(messages).toEqual([
      { id: "m1", senderUserId: HOST_ID, senderFirstName: "Ana", body: "Welcome!", createdAt: "2026-07-10T10:00:00Z", isMine: false, deleted: false },
    ]);
    const threadQuery = queries[1];
    // Oldest-first so newest renders at the bottom.
    expect(threadQuery).toContain("ORDER BY message.created_at ASC");
    // Block filtering both ways: viewer→sender AND sender→viewer are hidden.
    expect(threadQuery).toContain(`blocker_user_id = «${ACCEPTED_ID}» AND blocked_user_id = message.sender_user_id`);
    expect(threadQuery).toContain(`blocker_user_id = message.sender_user_id AND blocked_user_id = «${ACCEPTED_ID}»`);
    // A member always sees their own message even inside a block.
    expect(threadQuery).toContain(`message.sender_user_id = «${ACCEPTED_ID}»`);
  });

  it("marks the viewer's own messages and never selects any location column", async () => {
    const { queries } = mockDbSequence([
      [{ ["?column?"]: 1 }],
      [{ id: "m2", sender_user_id: ACCEPTED_ID, sender_first_name: "Bob", body: "On my way", created_at: "2026-07-10T10:05:00Z", deleted_at: null }],
    ]);
    const messages = await getEventMessages(EVENT_ID, ACCEPTED_ID);
    expect(messages![0].isMine).toBe(true);
    // No precise-location leak: the chat query never touches the private venue.
    expect(queries[1]).not.toContain("event_private_locations");
    expect(queries[1]).not.toContain("venue_name");
    expect(queries[1]).not.toContain("address");
    expect(queries[1]).not.toContain("precise_");
  });

  it("renders a soft-deleted message as a bodiless tombstone (deleted content never leaves the server)", async () => {
    mockDbSequence([
      [{ ["?column?"]: 1 }],
      [{ id: "m9", sender_user_id: ACCEPTED_ID, sender_first_name: "Bob", body: "the secret address is…", created_at: "2026-07-10T10:20:00Z", deleted_at: "2026-07-10T10:21:00Z" }],
    ]);
    const messages = await getEventMessages(EVENT_ID, ACCEPTED_ID);
    expect(messages![0].deleted).toBe(true);
    // The original body is suppressed — a client can never read removed content.
    expect(messages![0].body).toBe("");
    expect(JSON.stringify(messages)).not.toContain("secret address");
  });
});

describe("event-room chat own-message soft delete (deleteOwnEventMessage)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to delete for a viewer without chat access (re-checks authz first)", async () => {
    const { queries } = mockDbSequence([[]]); // authorization returns no row
    expect(await deleteOwnEventMessage(EVENT_ID, EVENT_ID, OTHER_ID)).toBe(false);
    // No UPDATE was issued.
    expect(queries.some((q) => q.includes("UPDATE event_messages"))).toBe(false);
  });

  it("soft-deletes only the caller's OWN, not-yet-deleted message", async () => {
    const { queries } = mockDbSequence([
      [{ ["?column?"]: 1 }], // authorized
      [{ id: "m5" }], // one row updated
    ]);
    expect(await deleteOwnEventMessage(EVENT_ID, EVENT_ID, ACCEPTED_ID)).toBe(true);
    const update = queries[1];
    expect(update).toContain("UPDATE event_messages");
    expect(update).toContain("SET deleted_at = NOW()");
    // Scoped to the sender + the message + not-already-deleted, so no one can
    // delete another member's message and a re-delete is a no-op.
    expect(update).toContain(`sender_user_id = «${ACCEPTED_ID}»`);
    expect(update).toContain("deleted_at IS NULL");
  });

  it("returns false when nothing was updated (not the sender / already deleted / unknown)", async () => {
    mockDbSequence([[{ ["?column?"]: 1 }], []]); // authorized, but UPDATE matched no row
    expect(await deleteOwnEventMessage(EVENT_ID, EVENT_ID, ACCEPTED_ID)).toBe(false);
  });

  it("rejects a malformed event or message id without touching the database", async () => {
    const sql = vi.fn();
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    expect(await deleteOwnEventMessage("not-a-uuid", EVENT_ID, ACCEPTED_ID)).toBe(false);
    expect(await deleteOwnEventMessage(EVENT_ID, "not-a-uuid", ACCEPTED_ID)).toBe(false);
    expect(sql).not.toHaveBeenCalled();
  });
});

describe("event-room chat write (postEventMessage)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("refuses to insert for an unauthorized viewer (re-checks authz on the write path)", async () => {
    const { queries } = mockDbSequence([[]]); // authorization returns no row
    const result = await postEventMessage(EVENT_ID, OTHER_ID, "hello");
    expect(result).toBeNull();
    // No INSERT was issued.
    expect(queries.some((q) => q.includes("INSERT INTO event_messages"))).toBe(false);
  });

  it("inserts and returns the stored message for an authorized viewer", async () => {
    const { queries } = mockDbSequence([
      [{ ["?column?"]: 1 }],
      [{ id: "m3", sender_user_id: ACCEPTED_ID, sender_first_name: "Bob", body: "See you there", created_at: "2026-07-10T10:10:00Z", deleted_at: null }],
    ]);
    const message = await postEventMessage(EVENT_ID, ACCEPTED_ID, "See you there");
    expect(message).toMatchObject({ id: "m3", body: "See you there", isMine: true, senderFirstName: "Bob" });
    expect(queries.some((q) => q.includes("INSERT INTO event_messages"))).toBe(true);
  });
});
