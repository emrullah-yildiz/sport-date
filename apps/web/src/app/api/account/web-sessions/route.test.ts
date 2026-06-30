import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return { ...actual, getCurrentUser: vi.fn() };
});
vi.mock("@/lib/web-sessions", () => ({ getWebSessions: vi.fn() }));

let GET: typeof import("./route").GET;
let cookies: typeof import("next/headers").cookies;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let getWebSessions: typeof import("@/lib/web-sessions").getWebSessions;

beforeAll(async () => {
  ({ GET } = await import("./route"));
  ({ cookies } = await import("next/headers"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ getWebSessions } = await import("@/lib/web-sessions"));
}, 40000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "auth-token-value" }) } as never);
});

describe("GET /api/account/web-sessions", () => {
  it("rejects an unauthenticated request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
    expect(getWebSessions).not.toHaveBeenCalled();
  });

  it("returns the member's active sessions with isCurrent and no token", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
    vi.mocked(getWebSessions).mockResolvedValue([
      { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-08T00:00:00.000Z", isCurrent: true },
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
    });
  });
});
