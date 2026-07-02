import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn() }));
vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return { ...actual, getCurrentUser: vi.fn() };
});
vi.mock("@/lib/web-sessions", () => ({
  getWebSessions: vi.fn(),
  revokeOtherWebSessions: vi.fn(),
  touchWebSessionLastActive: vi.fn(),
}));

let GET: typeof import("./route").GET;
let DELETE: typeof import("./route").DELETE;
let cookies: typeof import("next/headers").cookies;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getWebSessions: typeof import("@/lib/web-sessions").getWebSessions;
let revokeOtherWebSessions: typeof import("@/lib/web-sessions").revokeOtherWebSessions;
let touchWebSessionLastActive: typeof import("@/lib/web-sessions").touchWebSessionLastActive;

function bulkRequest() {
  return new Request("https://sportdate.example/api/account/web-sessions", {
    method: "DELETE",
    headers: { Origin: "https://sportdate.example" },
  });
}

beforeAll(async () => {
  ({ GET, DELETE } = await import("./route"));
  ({ cookies } = await import("next/headers"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getWebSessions, revokeOtherWebSessions, touchWebSessionLastActive } = await import("@/lib/web-sessions"));
}, 40000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "auth-token-value" }) } as never);
  vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
  vi.mocked(touchWebSessionLastActive).mockResolvedValue(undefined);
});

describe("GET /api/account/web-sessions", () => {
  it("rejects an unauthenticated request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(getWebSessions).not.toHaveBeenCalled();
  });

  it("returns the member's active sessions with the coarse hint and no token", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(getWebSessions).mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-08T00:00:00.000Z", isCurrent: true, deviceLabel: "Chrome on Windows", lastActiveAt: "2026-06-07T00:00:00.000Z" },
    ]);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getWebSessions).toHaveBeenCalledWith("42", "auth-token-value");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("token");
    expect(body.sessions[0]).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      createdAt: "2026-06-01T00:00:00.000Z",
      expiresAt: "2026-06-08T00:00:00.000Z",
      isCurrent: true,
      deviceLabel: "Chrome on Windows",
      lastActiveAt: "2026-06-07T00:00:00.000Z",
    });
  });

  it("still lists sessions when the best-effort last-active touch fails", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(touchWebSessionLastActive).mockRejectedValue(new Error("db blip"));
    vi.mocked(getWebSessions).mockResolvedValue([]);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ sessions: [] });
  });
});

describe("DELETE /api/account/web-sessions (sign out all other browsers)", () => {
  it("rejects a cross-site request before touching the database", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);
    const response = await DELETE(bulkRequest());
    expect(response.status).toBe(403);
    expect(revokeOtherWebSessions).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await DELETE(bulkRequest());
    expect(response.status).toBe(401);
    expect(revokeOtherWebSessions).not.toHaveBeenCalled();
  });

  it("rejects when there is no current auth cookie (never wipes all sessions)", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
    const response = await DELETE(bulkRequest());
    expect(response.status).toBe(401);
    expect(revokeOtherWebSessions).not.toHaveBeenCalled();
  });

  it("revokes all other sessions, scoped by user id and current token, and keeps the member signed in here", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(revokeOtherWebSessions).mockResolvedValue(4);

    const response = await DELETE(bulkRequest());

    expect(revokeOtherWebSessions).toHaveBeenCalledWith("42", "auth-token-value");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, revokedCount: 4 });
    // The current session cookie is never cleared by the bulk action.
    expect(response.cookies.get("auth_token")).toBeUndefined();
  });

  it("reports revokedCount 0 when there were no other browsers", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(revokeOtherWebSessions).mockResolvedValue(0);

    const response = await DELETE(bulkRequest());
    await expect(response.json()).resolves.toEqual({ success: true, revokedCount: 0 });
  });
});
