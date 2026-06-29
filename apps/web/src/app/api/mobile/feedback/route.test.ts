import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFeedbackTicket: vi.fn(),
  getFeedbackTickets: vi.fn(),
  getMobileSession: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback", () => ({
  createFeedbackTicket: mocks.createFeedbackTicket,
  getFeedbackTickets: mocks.getFeedbackTickets,
}));
vi.mock("@/lib/mobile-session", () => ({ getMobileSession: mocks.getMobileSession }));

import { GET, POST } from "./route";

const input = {
  category: "usability",
  surface: "mobile",
  summary: "The event room controls are difficult to find",
  details: "I reached the event room but could not find the participant controls quickly.",
  currentPath: "Event room",
  expectedOutcome: null,
  actualOutcome: null,
  severity: "medium",
};

beforeEach(() => vi.clearAllMocks());

describe("authenticated mobile feedback", () => {
  it("requires a valid native session to list tickets", async () => {
    mocks.getMobileSession.mockResolvedValue(null);
    const response = await GET(new Request("https://sportdate.example/api/mobile/feedback"));
    expect(response.status).toBe(401);
    expect(mocks.getFeedbackTickets).not.toHaveBeenCalled();
  });

  it("lists only the native session member's tickets", async () => {
    mocks.getMobileSession.mockResolvedValue({ sessionId: "session", user: { id: "73" } });
    mocks.getFeedbackTickets.mockResolvedValue([]);
    const response = await GET(new Request("https://sportdate.example/api/mobile/feedback"));
    expect(response.status).toBe(200);
    expect(mocks.getFeedbackTickets).toHaveBeenCalledWith("73");
    await expect(response.json()).resolves.toEqual({ tickets: [] });
  });

  it("uses the native session member as the reporter", async () => {
    mocks.getMobileSession.mockResolvedValue({ sessionId: "session", user: { id: "73" } });
    const created = { id: "2c3b5c84-6926-4ba6-b926-5ceaf9e01399", ...input, status: "open", createdAt: "2026-06-29T12:00:00.000Z" };
    mocks.createFeedbackTicket.mockResolvedValue(created);
    const response = await POST(new Request("https://sportdate.example/api/mobile/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, reporterUserId: "999" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.createFeedbackTicket).toHaveBeenCalledWith("73", input);
  });
});
