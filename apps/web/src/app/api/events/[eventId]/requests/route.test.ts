import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn() }));
vi.mock("@/lib/session", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn().mockResolvedValue(null),
  joinRequestRateLimitRules: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/join-requests", () => ({ createEventJoinRequest: vi.fn() }));

let POST: typeof import("./route").POST;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let createEventJoinRequest: typeof import("@/lib/join-requests").createEventJoinRequest;

const eventId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function post() {
  return POST(
    new Request(`https://sportdate.example/api/events/${eventId}/requests`, {
      method: "POST",
      headers: { Origin: "https://sportdate.example", "Content-Type": "application/json" },
      body: JSON.stringify({ introduction: "" }),
    }),
    { params: Promise.resolve({ eventId }) },
  );
}

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ createEventJoinRequest } = await import("@/lib/join-requests"));
}, 60000);

describe("browser join request creation route", () => {
  it("creates a pending request", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11", age: 30 } as never);
    vi.mocked(createEventJoinRequest).mockResolvedValue({ requestId: "req-1", status: "pending" } as never);

    const response = await post();
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({ success: true, status: "pending" });
  });

  it("returns a private 423 cool-down without leaking a numeric count when new joins are paused", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "11", age: 30 } as never);
    const liftsAt = new Date("2026-07-03T12:00:00.000Z");
    vi.mocked(createEventJoinRequest).mockResolvedValue({
      paused: true,
      notice: { tone: "paused", headline: "New requests are paused for a short while.", body: "You cancelled a few accepted places close to their start recently.", liftsAt },
    } as never);

    const response = await post();
    expect(response.status).toBe(423);
    const body = await response.json();
    expect(body.paused).toBe(true);
    expect(body.liftsAt).toBe(liftsAt.toISOString());
    // Privacy: the response never surfaces a numeric reliability score/badge.
    expect(JSON.stringify(body)).not.toMatch(/score|badge|rating/i);
  });

  it("rejects an untrusted browser origin", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);
    const response = await post();
    expect(response.status).toBe(403);
  });
});
