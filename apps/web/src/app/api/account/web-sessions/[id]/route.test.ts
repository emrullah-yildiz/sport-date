import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn() }));
vi.mock("@/lib/session", async () => {
  const actual = await vi.importActual<typeof import("@/lib/session")>("@/lib/session");
  return { ...actual, getCurrentUser: vi.fn() };
});
vi.mock("@/lib/web-sessions", () => ({ revokeWebSession: vi.fn() }));

let DELETE: typeof import("./route").DELETE;
let cookies: typeof import("next/headers").cookies;
let isTrustedBrowserMutation: typeof import("@/lib/request-security").isTrustedBrowserMutation;
let getCurrentUser: typeof import("@/lib/session").getCurrentUser;
let revokeWebSession: typeof import("@/lib/web-sessions").revokeWebSession;

const VALID_ID = "22222222-2222-4222-8222-222222222222";
const CURRENT_ID = "11111111-1111-4111-8111-111111111111";

function request() {
  return new Request("https://sportdate.example/api/account/web-sessions/" + VALID_ID, {
    method: "DELETE",
    headers: { Origin: "https://sportdate.example" },
  });
}

beforeAll(async () => {
  ({ DELETE } = await import("./route"));
  ({ cookies } = await import("next/headers"));
  ({ isTrustedBrowserMutation } = await import("@/lib/request-security"));
  ({ getCurrentUser } = await import("@/lib/session"));
  ({ revokeWebSession } = await import("@/lib/web-sessions"));
}, 40000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({ get: () => ({ value: "auth-token-value" }) } as never);
  vi.mocked(isTrustedBrowserMutation).mockReturnValue(true);
  vi.mocked(getCurrentUser).mockResolvedValue({ id: "42" } as never);
});

describe("DELETE /api/account/web-sessions/[id]", () => {
  it("rejects a cross-site request before touching the database", async () => {
    vi.mocked(isTrustedBrowserMutation).mockReturnValue(false);
    const response = await DELETE(request(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(response.status).toBe(403);
    expect(revokeWebSession).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await DELETE(request(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(response.status).toBe(401);
    expect(revokeWebSession).not.toHaveBeenCalled();
  });

  it("rejects a malformed session id without querying", async () => {
    const response = await DELETE(request(), { params: Promise.resolve({ id: "not-a-uuid" }) });
    expect(response.status).toBe(404);
    expect(revokeWebSession).not.toHaveBeenCalled();
  });

  it("revokes the member's own session scoped by user id", async () => {
    vi.mocked(revokeWebSession).mockResolvedValue({ revoked: true, wasCurrent: false });
    const response = await DELETE(request(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(revokeWebSession).toHaveBeenCalledWith("42", VALID_ID, "auth-token-value");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, signedOut: false });
    expect(response.cookies.get("auth_token")).toBeUndefined();
  });

  it("returns 404 when the id does not belong to the member (another user's id)", async () => {
    vi.mocked(revokeWebSession).mockResolvedValue({ revoked: false, wasCurrent: false });
    const response = await DELETE(request(), { params: Promise.resolve({ id: VALID_ID }) });
    expect(response.status).toBe(404);
  });

  it("signs the member out by clearing the cookie when revoking the current session", async () => {
    vi.mocked(revokeWebSession).mockResolvedValue({ revoked: true, wasCurrent: true });
    const response = await DELETE(request(), { params: Promise.resolve({ id: CURRENT_ID }) });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true, signedOut: true });
    const cleared = response.cookies.get("auth_token");
    expect(cleared?.value).toBe("");
    expect(new Date(cleared?.expires ?? 1).getTime()).toBe(0);
  });
});
