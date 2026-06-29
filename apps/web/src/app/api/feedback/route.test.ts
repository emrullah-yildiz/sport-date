import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createFeedbackTicket: vi.fn(),
  getCurrentUser: vi.fn(),
  getFeedbackTickets: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/feedback", () => ({
  createFeedbackTicket: mocks.createFeedbackTicket,
  getFeedbackTickets: mocks.getFeedbackTickets,
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { GET, POST } from "./route";

const member = { id: "42" };
const input = {
  category: "bug",
  surface: "web",
  summary: "Join request button does not respond",
  details: "I selected the join request button twice and no confirmation appeared.",
  currentPath: "/discover/events/123",
  expectedOutcome: "A confirmation should appear.",
  actualOutcome: "The page did not change.",
  severity: "high",
};
const ticket = {
  id: "2c3b5c84-6926-4ba6-b926-5ceaf9e01399",
  ...input,
  status: "open",
  createdAt: "2026-06-29T12:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
});

describe("authenticated web feedback", () => {
  it("does not expose a ticket list without authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(mocks.getFeedbackTickets).not.toHaveBeenCalled();
  });

  it("lists tickets using only the authenticated member's ownership", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.getFeedbackTickets.mockResolvedValue([ticket]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(mocks.getFeedbackTickets).toHaveBeenCalledWith("42");
    await expect(response.json()).resolves.toEqual({ tickets: [ticket] });
  });

  it("derives reporter ownership from the session and ignores a submitted owner", async () => {
    mocks.getCurrentUser.mockResolvedValue(member);
    mocks.createFeedbackTicket.mockResolvedValue(ticket);
    const response = await POST(new Request("https://sportdate.example/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", origin: "https://sportdate.example" },
      body: JSON.stringify({ ...input, reporterUserId: "999" }),
    }));
    expect(response.status).toBe(201);
    expect(mocks.createFeedbackTicket).toHaveBeenCalledWith("42", input);
    await expect(response.json()).resolves.toEqual({ ticket });
  });

  it("rejects cross-site submission before reading member data", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const response = await POST(new Request("https://sportdate.example/api/feedback", { method: "POST" }));
    expect(response.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.createFeedbackTicket).not.toHaveBeenCalled();
  });
});
