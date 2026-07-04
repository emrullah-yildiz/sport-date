import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteOwnEventMessage: vi.fn(),
  getCurrentUser: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/event-messages", () => ({ deleteOwnEventMessage: mocks.deleteOwnEventMessage }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { DELETE } from "./route";

const EVENT_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MESSAGE_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function del(eventId = EVENT_ID, messageId = MESSAGE_ID): Parameters<typeof DELETE> {
  const request = new Request(`https://keepitup.example/api/events/${eventId}/messages/${messageId}`, {
    method: "DELETE",
    headers: { origin: "https://keepitup.example" },
  });
  return [request, { params: Promise.resolve({ eventId, messageId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getCurrentUser.mockResolvedValue({ id: "202" });
});

describe("DELETE /api/events/[eventId]/messages/[messageId]", () => {
  it("soft-deletes the caller's own message", async () => {
    mocks.deleteOwnEventMessage.mockResolvedValue(true);
    const response = await DELETE(...del());
    expect(response.status).toBe(200);
    expect(mocks.deleteOwnEventMessage).toHaveBeenCalledWith(EVENT_ID, MESSAGE_ID, "202");
  });

  it("404s (uniformly) when the message is not the caller's, already deleted, or missing", async () => {
    mocks.deleteOwnEventMessage.mockResolvedValue(false);
    const response = await DELETE(...del());
    expect(response.status).toBe(404);
  });

  it("rejects a cross-site request before any auth or delete", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const response = await DELETE(...del());
    expect(response.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.deleteOwnEventMessage).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await DELETE(...del());
    expect(response.status).toBe(401);
    expect(mocks.deleteOwnEventMessage).not.toHaveBeenCalled();
  });

  it("404s a malformed id without hitting the lib", async () => {
    const response = await DELETE(...del(EVENT_ID, "not-a-uuid"));
    expect(response.status).toBe(404);
    expect(mocks.deleteOwnEventMessage).not.toHaveBeenCalled();
  });
});
