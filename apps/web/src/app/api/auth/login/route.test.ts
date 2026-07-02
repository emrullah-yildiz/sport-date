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
let MAX_WEB_SESSIONS_PER_USER: typeof import("@/lib/web-sessions").MAX_WEB_SESSIONS_PER_USER;

// The bcrypt hash of "A valid password 1" so verifyPassword resolves true for
// the active user without needing to stub bcrypt itself.
const PASSWORD = "A valid password 1";
let passwordHash: string;

type CapturedQuery = { text: string; values: unknown[] };

function mockSql(userRow: Record<string, unknown> | null) {
  const inserted: { expiresAt?: string; id?: string } = {};
  const txQueries: CapturedQuery[] = [];
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
      txQueries.push({ text, values });
      if (text.includes("INSERT INTO sessions")) {
        // The ISO timestamp interpolated for expires_at.
        inserted.expiresAt = values.find((v) => typeof v === "string" && v.includes("T") && v.includes("Z")) as string;
        // The new session id (a uuid, the first interpolated value).
        inserted.id = values.find((v) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v)) as string;
      }
      return { text, values };
    };
    build(t);
    return Promise.resolve(undefined);
  };
  return { sql, inserted, txQueries };
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
  ({ MAX_WEB_SESSIONS_PER_USER } = await import("@/lib/web-sessions"));
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

describe("POST /api/auth/login concurrent-web-session cap", () => {
  it("evicts the OLDEST active web sessions beyond the cap and NEVER the just-created current session", async () => {
    const { sql, inserted, txQueries } = mockSql({ ...activeUser, password_hash: passwordHash });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const response = await POST(loginRequest({ email: activeUser.email, password: PASSWORD }));
    expect(response.status).toBe(200);

    const evict = txQueries.find((q) => q.text.includes("ORDER BY created_at DESC"));
    expect(evict, "an eviction query is issued in the login transaction").toBeDefined();
    // Bounds accumulation: deletes the oldest active rows beyond the cap.
    expect(evict!.text).toContain("DELETE FROM sessions");
    expect(evict!.text).toContain("expires_at > NOW()");
    expect(evict!.text).toContain("ORDER BY created_at DESC");
    // Scoped to the signing-in user only — never another member's rows.
    expect(evict!.values).toContain(activeUser.id);
    // NEVER evicts the current session: it is excluded by the new session's id in
    // BOTH the outer DELETE and the inner subquery (belt-and-braces).
    expect(inserted.id).toBeTruthy();
    const currentIdOccurrences = evict!.values.filter((v) => v === inserted.id).length;
    expect(currentIdOccurrences).toBeGreaterThanOrEqual(2);
    expect(evict!.text).toContain("id <> ?");
    // Only ACTIVE rows are touched; expired residue is left to session-cleanup.
    // Keeps cap-1 of the OTHER newest active rows (the current session fills the
    // last slot, so the account ends with exactly the cap), never the whole set.
    expect(evict!.values).toContain(MAX_WEB_SESSIONS_PER_USER - 1);
  });

  it("runs eviction only AFTER inserting the new session (so the current row already exists and is protected)", async () => {
    const { sql, txQueries } = mockSql({ ...activeUser, password_hash: passwordHash });
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await POST(loginRequest({ email: activeUser.email, password: PASSWORD }));

    const insertIdx = txQueries.findIndex((q) => q.text.includes("INSERT INTO sessions"));
    const evictIdx = txQueries.findIndex((q) => q.text.includes("ORDER BY created_at DESC"));
    expect(insertIdx).toBeGreaterThanOrEqual(0);
    expect(evictIdx).toBeGreaterThan(insertIdx);
  });
});
