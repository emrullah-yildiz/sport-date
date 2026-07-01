import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));
vi.mock("@/lib/db", () => ({
  getDatabase: vi.fn(),
  DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {},
}));
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(),
  browserAuthRateLimitRules: vi.fn(() => []),
  normalizeRateLimitKeyPart: vi.fn((value: unknown) => (typeof value === "string" ? value : "")),
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: vi.fn(() => true) }));

let POST: typeof import("./route").POST;
let cookies: typeof import("next/headers").cookies;
let getDatabase: typeof import("@/lib/db").getDatabase;
let enforceRateLimit: typeof import("@/lib/rate-limit").enforceRateLimit;

// The bcrypt hash of "A valid password 1" so verifyPassword resolves true for
// the active user without needing to stub bcrypt itself.
const PASSWORD = "A valid password 1";
let passwordHash: string;

function mockSql(userRow: Record<string, unknown> | null) {
  const inserted: { expiresAt?: string } = {};
  const sql = ((strings: TemplateStringsArray) => {
    const text = strings.join("?");
    if (text.includes("SELECT id, email, password_hash")) {
      return Promise.resolve(userRow ? [userRow] : []);
    }
    return Promise.resolve([]);
  }) as unknown as Record<string, unknown>;
  sql.transaction = (build: (t: (s: TemplateStringsArray, ...v: unknown[]) => unknown) => unknown[]) => {
    const t = (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.join("?");
      if (text.includes("INSERT INTO sessions")) {
        // The ISO timestamp interpolated for expires_at.
        inserted.expiresAt = values.find((v) => typeof v === "string" && v.includes("T") && v.includes("Z")) as string;
      }
      return { text, values };
    };
    build(t);
    return Promise.resolve(undefined);
  };
  return { sql, inserted };
}

function loginRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeAll(async () => {
  const { hashPassword } = await import("@/lib/auth");
  passwordHash = await hashPassword(PASSWORD);
  ({ POST } = await import("./route"));
  ({ cookies } = await import("next/headers"));
  ({ getDatabase } = await import("@/lib/db"));
  ({ enforceRateLimit } = await import("@/lib/rate-limit"));
}, 40000);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(cookies).mockResolvedValue({ get: () => undefined } as never);
  vi.mocked(enforceRateLimit).mockResolvedValue(null as never);
});

const activeUser = { id: "42", email: "member@example.com", password_hash: "", account_status: "active" };

function authCookieAttrs(response: Response) {
  const raw = response.headers.get("set-cookie") ?? "";
  const lower = raw.toLowerCase();
  return {
    raw,
    httpOnly: lower.includes("httponly"),
    sameSiteLax: lower.includes("samesite=lax"),
    present: lower.includes("auth_token="),
  };
}

describe("POST /api/auth/login remember-me", () => {
  it("creates the default 7-day session and keeps cookie flags when remember is not opted in", async () => {
    const { sql, inserted } = mockSql({ ...activeUser, password_hash: passwordHash });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const before = Date.now();
    const response = await POST(loginRequest({ email: activeUser.email, password: PASSWORD }));

    expect(response.status).toBe(200);
    const ttl = new Date(inserted.expiresAt as string).getTime() - before;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(ttl).toBeGreaterThan(sevenDaysMs - 10000);
    expect(ttl).toBeLessThan(sevenDaysMs + 10000);

    const cookie = authCookieAttrs(response);
    expect(cookie.present).toBe(true);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSiteLax).toBe(true);
    // Never leak the raw token or any hash beyond the httpOnly cookie value.
    expect(cookie.raw).not.toContain("token_hash");
  });

  it("creates the longer ~30-day session ONLY when rememberMe is explicitly true, with identical cookie flags", async () => {
    const { sql, inserted } = mockSql({ ...activeUser, password_hash: passwordHash });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const before = Date.now();
    const response = await POST(loginRequest({ email: activeUser.email, password: PASSWORD, rememberMe: true }));

    expect(response.status).toBe(200);
    const ttl = new Date(inserted.expiresAt as string).getTime() - before;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    expect(ttl).toBeGreaterThan(thirtyDaysMs - 10000);
    expect(ttl).toBeLessThan(thirtyDaysMs + 10000);

    // The ONLY difference is the expiry — flags are unchanged.
    const cookie = authCookieAttrs(response);
    expect(cookie.httpOnly).toBe(true);
    expect(cookie.sameSiteLax).toBe(true);
  });

  it("does not widen the session for a non-boolean or falsey remember value (default stays short)", async () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    for (const rememberMe of [false, "true", 1, "on", null, undefined] as unknown[]) {
      const { sql, inserted } = mockSql({ ...activeUser, password_hash: passwordHash });
      vi.mocked(getDatabase).mockReturnValue(sql as never);
      const before = Date.now();
      const response = await POST(loginRequest({ email: activeUser.email, password: PASSWORD, rememberMe }));
      expect(response.status).toBe(200);
      const ttl = new Date(inserted.expiresAt as string).getTime() - before;
      expect(ttl).toBeLessThan(sevenDaysMs + 10000);
      expect(ttl).toBeLessThan(thirtyDaysMs - 10000);
    }
  });
});
