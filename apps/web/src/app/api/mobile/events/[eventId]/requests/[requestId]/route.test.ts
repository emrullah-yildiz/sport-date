import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mobile-session", () => ({
  getMobileSession: vi.fn(),
}));
vi.mock("@/lib/join-requests", () => ({
  cancelEventJoinRequest: vi.fn(),
}));

class TestDatabaseNotConfiguredError extends Error {}
vi.mock("@/lib/db", () => ({
  DatabaseNotConfiguredError: TestDatabaseNotConfiguredError,
}));

let DELETE: typeof import("./route").DELETE;
let getMobileSession: typeof import("@/lib/mobile-session").getMobileSession;
let cancelEventJoinRequest: typeof import("@/lib/join-requests").cancelEventJoinRequest;

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const REQUEST_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const USER_ID = "11111111-1111-4111-8111-111111111111";

beforeAll(async () => {
  ({ DELETE } = await import("./route"));
  ({ getMobileSession } = await import("@/lib/mobile-session"));
  ({ cancelEventJoinRequest } = await import("@/lib/join-requests"));
}, 60000);

beforeEach(() => {
  vi.mocked(getMobileSession).mockReset();
  vi.mocked(cancelEventJoinRequest).mockReset();
});

function mobileSession() {
  return { sessionId: "sess", user: { id: USER_ID } } as never;
}

function deleteRequest(init?: RequestInit) {
  return DELETE(
    new Request(`https://sportdate.example/api/mobile/events/${EVENT_ID}/requests/${REQUEST_ID}`, {
      method: "DELETE",
      ...init,
    }),
    { params: Promise.resolve({ eventId: EVENT_ID, requestId: REQUEST_ID }) },
  );
}

describe("mobile join request cancellation route", () => {
  it("cancels an accepted place for the authenticated mobile requester", async () => {
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await deleteRequest();

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(EVENT_ID, REQUEST_ID, USER_ID, null);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, status: "cancelled" });
  });

  it("passes an optional private graceful-exit reason through to the data layer", async () => {
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await deleteRequest({
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "felt_unsafe", note: "someone kept following me" }),
    });

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(EVENT_ID, REQUEST_ID, USER_ID, {
      reason: "felt_unsafe",
      note: "someone kept following me",
    });
    expect(response.status).toBe(200);
  });

  it("still leaves when the request body is missing or malformed (exit reason is optional)", async () => {
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(true as never);

    const response = await deleteRequest({
      headers: { "Content-Type": "application/json" },
      body: "{ this is not valid json",
    });

    expect(cancelEventJoinRequest).toHaveBeenCalledWith(EVENT_ID, REQUEST_ID, USER_ID, null);
    expect(response.status).toBe(200);
  });

  it("requires an authenticated mobile session", async () => {
    vi.mocked(getMobileSession).mockResolvedValue(null);

    const response = await deleteRequest();

    expect(cancelEventJoinRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
  });

  it("returns 409 (not a lockout) when the request can no longer be cancelled — re-request stays open", async () => {
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockResolvedValue(false as never);

    const response = await deleteRequest();

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("returns a readable JSON error (never a raw empty 500) when the data layer throws", async () => {
    // The class of bug that stranded members mid-cancel: a throw (e.g. a missing
    // column) escaping as an empty-body 500 the client can't read. The mobile route
    // must now catch any throw and return a calm, readable JSON body.
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockRejectedValue(new Error('column "exit_reason" does not exist'));

    const response = await deleteRequest();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    // The readable body must not leak the underlying error / internals to the member.
    expect(body.error).not.toContain("exit_reason");
    consoleError.mockRestore();
  });

  it("returns a calm 503 (not an empty 500) when the database is not configured", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getMobileSession).mockResolvedValue(mobileSession());
    vi.mocked(cancelEventJoinRequest).mockRejectedValue(new TestDatabaseNotConfiguredError("no db"));

    const response = await deleteRequest();

    expect(response.status).toBe(503);
    const body = await response.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
    consoleError.mockRestore();
  });
});
