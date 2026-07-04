import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  addMemberFeedbackComment: vi.fn(),
  getCurrentUser: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
  enforceRateLimit: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback", () => ({ addMemberFeedbackComment: mocks.addMemberFeedbackComment }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  feedbackCommentRateLimitRules: vi.fn(() => []),
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { POST } from "./route";

const TICKET_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function post(body: unknown, ticketId = TICKET_ID): Parameters<typeof POST> {
  const request = new Request(`https://keepitup.example/api/feedback/${ticketId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", origin: "https://keepitup.example" },
    body: JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ ticketId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getCurrentUser.mockResolvedValue({ id: "202" });
  mocks.enforceRateLimit.mockResolvedValue(null);
});

describe("POST /api/feedback/[ticketId]/comments — member reply", () => {
  it("stores the reply on the member's own ticket", async () => {
    mocks.addMemberFeedbackComment.mockResolvedValue({ id: "c1", authorKind: "member", authorLabel: "You", body: "hi", createdAt: "x" });
    const response = await POST(...post({ body: "One more detail" }));
    expect(response.status).toBe(201);
    expect(mocks.addMemberFeedbackComment).toHaveBeenCalledWith(TICKET_ID, "202", "One more detail");
  });

  it("404s when the ticket isn't the member's (lib returns null)", async () => {
    mocks.addMemberFeedbackComment.mockResolvedValue(null);
    expect((await POST(...post({ body: "hello" }))).status).toBe(404);
  });

  it("rejects empty replies, cross-site, and unauthenticated", async () => {
    expect((await POST(...post({ body: "   " }))).status).toBe(400);
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    expect((await POST(...post({ body: "hi" }))).status).toBe(403);
    mocks.isTrustedBrowserMutation.mockReturnValue(true);
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(...post({ body: "hi" }))).status).toBe(401);
    expect(mocks.addMemberFeedbackComment).not.toHaveBeenCalled();
  });
});
