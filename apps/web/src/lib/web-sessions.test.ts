import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

let getWebSessions: typeof import("./web-sessions").getWebSessions;
let revokeWebSession: typeof import("./web-sessions").revokeWebSession;
let revokeOtherWebSessions: typeof import("./web-sessions").revokeOtherWebSessions;
let touchWebSessionLastActive: typeof import("./web-sessions").touchWebSessionLastActive;
let MAX_WEB_SESSIONS_PER_USER: typeof import("./web-sessions").MAX_WEB_SESSIONS_PER_USER;
let WEB_SESSION_LIST_LIMIT: typeof import("./web-sessions").WEB_SESSION_LIST_LIMIT;
let hashSessionToken: typeof import("./auth").hashSessionToken;
let getDatabase: typeof import("@/lib/db").getDatabase;

type Query = { text: string; values: unknown[] };

function mockSql(result: unknown[]) {
  const calls: Query[] = [];
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ text: strings.join("?"), values });
    return Promise.resolve(result);
  };
  return { sql, calls };
}

beforeAll(async () => {
  ({ getWebSessions, revokeWebSession, revokeOtherWebSessions, touchWebSessionLastActive, MAX_WEB_SESSIONS_PER_USER, WEB_SESSION_LIST_LIMIT } = await import("./web-sessions"));
  ({ hashSessionToken } = await import("./auth"));
  ({ getDatabase } = await import("@/lib/db"));
}, 40000);

beforeEach(() => {
  vi.mocked(getDatabase).mockReset();
});

describe("getWebSessions", () => {
  it("returns only safe metadata and never the token hash", async () => {
    const { sql, calls } = mockSql([
      { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-06-01T00:00:00.000Z", expires_at: "2026-06-08T00:00:00.000Z", is_current: true, device_label: "Chrome on Windows", last_active_at: "2026-06-07T00:00:00.000Z" },
      { id: "22222222-2222-4222-8222-222222222222", created_at: "2026-05-01T00:00:00.000Z", expires_at: "2026-05-08T00:00:00.000Z", is_current: false, device_label: null, last_active_at: null },
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const sessions = await getWebSessions("42", "auth-token-value");

    expect(sessions).toEqual([
      { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-08T00:00:00.000Z", isCurrent: true, deviceLabel: "Chrome on Windows", lastActiveAt: "2026-06-07T00:00:00.000Z" },
      { id: "22222222-2222-4222-8222-222222222222", createdAt: "2026-05-01T00:00:00.000Z", expiresAt: "2026-05-08T00:00:00.000Z", isCurrent: false, deviceLabel: null, lastActiveAt: null },
    ]);
    // The coarse device_label is surfaced; no token / token_hash / raw UA ever is.
    for (const session of sessions) {
      expect(session).not.toHaveProperty("token_hash");
      expect(session).not.toHaveProperty("tokenHash");
    }
    // Selects the coarse hint columns.
    expect(calls[0].text).toContain("device_label");
    expect(calls[0].text).toContain("last_active_at");
    // Scopes to the user, filters to active rows, and matches isCurrent by the hashed cookie.
    expect(calls[0].text).toContain("FROM sessions");
    expect(calls[0].text).toContain("WHERE user_id = ?");
    expect(calls[0].text).toContain("expires_at > NOW()");
    expect(calls[0].values).toContain("42");
    expect(calls[0].values).toContain(hashSessionToken("auth-token-value"));
    // The raw cookie token itself is never put into the query.
    expect(calls[0].values).not.toContain("auth-token-value");
    // The listing limit is the derived constant (>= the cap), interpolated as a
    // value — NOT a hardcoded 50 baked into the SQL text — so it can never drift
    // below the cap and silently omit a retained session.
    expect(calls[0].text).toContain("LIMIT ?");
    expect(calls[0].values).toContain(WEB_SESSION_LIST_LIMIT);
  });

  it("flags no row as current when no cookie token is supplied", async () => {
    const { sql, calls } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await getWebSessions("42");

    expect(calls[0].values).toContain("");
  });
});

describe("web-session cap / listing-limit invariants", () => {
  it("keeps the listing limit >= the cap so no retained session is ever silently omitted", () => {
    // The cap bounds how many active rows a member can have; the listing limit must
    // be able to show ALL of them. If this ever fails, sessions past the limit would
    // become invisible/unrevocable — the exact bug this fix removes.
    expect(WEB_SESSION_LIST_LIMIT).toBeGreaterThanOrEqual(MAX_WEB_SESSIONS_PER_USER);
  });

  it("uses a conservative, generous cap (bounded growth, minimal surprise sign-outs)", () => {
    expect(MAX_WEB_SESSIONS_PER_USER).toBeGreaterThanOrEqual(10);
    expect(MAX_WEB_SESSIONS_PER_USER).toBeLessThanOrEqual(30);
  });
});

describe("revokeWebSession", () => {
  it("deletes the row scoped to the owning user and reports a non-current revoke", async () => {
    const { sql, calls } = mockSql([{ is_current: false }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await revokeWebSession("42", "22222222-2222-4222-8222-222222222222", "auth-token-value");

    expect(result).toEqual({ revoked: true, wasCurrent: false });
    expect(calls[0].text).toContain("DELETE FROM sessions");
    expect(calls[0].text).toContain("WHERE id = ?");
    expect(calls[0].text).toContain("AND user_id = ?");
    expect(calls[0].values).toContain("42");
    expect(calls[0].values).toContain("22222222-2222-4222-8222-222222222222");
  });

  it("signals wasCurrent when the deleted row matches the request cookie", async () => {
    const { sql } = mockSql([{ is_current: true }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await revokeWebSession("42", "11111111-1111-4111-8111-111111111111", "auth-token-value");

    expect(result).toEqual({ revoked: true, wasCurrent: true });
  });

  it("reports not-revoked when no row belongs to the user (another user's id)", async () => {
    const { sql } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await revokeWebSession("42", "99999999-9999-4999-8999-999999999999", "auth-token-value");

    expect(result).toEqual({ revoked: false, wasCurrent: false });
  });
});

describe("revokeOtherWebSessions", () => {
  it("deletes every row for the user EXCEPT the current token, and never the current session", async () => {
    const { sql, calls } = mockSql([{ id: "a" }, { id: "b" }, { id: "c" }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const count = await revokeOtherWebSessions("42", "auth-token-value");

    expect(count).toBe(3);
    expect(calls[0].text).toContain("DELETE FROM sessions");
    expect(calls[0].text).toContain("WHERE user_id = ?");
    // Preserves the current session: excludes the current token's hash, never deletes it.
    expect(calls[0].text).toContain("token_hash <> ?");
    expect(calls[0].values).toContain("42");
    expect(calls[0].values).toContain(hashSessionToken("auth-token-value"));
    // The raw cookie token is never put into the query.
    expect(calls[0].values).not.toContain("auth-token-value");
  });

  it("returns 0 and issues NO delete when there is no current token (never wipes all sessions)", async () => {
    const { sql, calls } = mockSql([{ id: "a" }]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const count = await revokeOtherWebSessions("42");

    expect(count).toBe(0);
    // Guard runs before touching the DB, so no query is issued at all.
    expect(calls.length).toBe(0);
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("returns 0 when the user had no other sessions", async () => {
    const { sql } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const count = await revokeOtherWebSessions("42", "auth-token-value");

    expect(count).toBe(0);
  });
});

describe("touchWebSessionLastActive", () => {
  it("updates last_active_at for the current token, throttled to ~daily", async () => {
    const { sql, calls } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await touchWebSessionLastActive("auth-token-value");

    expect(calls[0].text).toContain("UPDATE sessions");
    expect(calls[0].text).toContain("SET last_active_at = NOW()");
    expect(calls[0].text).toContain("token_hash = ?");
    // Throttle guard present so this is a coarse recency anchor, not an activity log.
    expect(calls[0].text).toContain("last_active_at IS NULL OR last_active_at <");
    expect(calls[0].values).toContain(hashSessionToken("auth-token-value"));
  });

  it("does nothing without a current token", async () => {
    const { sql, calls } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await touchWebSessionLastActive();

    expect(calls.length).toBe(0);
    expect(getDatabase).not.toHaveBeenCalled();
  });
});
