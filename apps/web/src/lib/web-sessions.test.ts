import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));

let getWebSessions: typeof import("./web-sessions").getWebSessions;
let revokeWebSession: typeof import("./web-sessions").revokeWebSession;
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
  ({ getWebSessions, revokeWebSession } = await import("./web-sessions"));
  ({ hashSessionToken } = await import("./auth"));
  ({ getDatabase } = await import("@/lib/db"));
}, 40000);

beforeEach(() => {
  vi.mocked(getDatabase).mockReset();
});

describe("getWebSessions", () => {
  it("returns only safe metadata and never the token hash", async () => {
    const { sql, calls } = mockSql([
      { id: "11111111-1111-4111-8111-111111111111", created_at: "2026-06-01T00:00:00.000Z", expires_at: "2026-06-08T00:00:00.000Z", is_current: true },
      { id: "22222222-2222-4222-8222-222222222222", created_at: "2026-05-01T00:00:00.000Z", expires_at: "2026-05-08T00:00:00.000Z", is_current: false },
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const sessions = await getWebSessions("42", "auth-token-value");

    expect(sessions).toEqual([
      { id: "11111111-1111-4111-8111-111111111111", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-08T00:00:00.000Z", isCurrent: true },
      { id: "22222222-2222-4222-8222-222222222222", createdAt: "2026-05-01T00:00:00.000Z", expiresAt: "2026-05-08T00:00:00.000Z", isCurrent: false },
    ]);
    // No token / token_hash field is ever surfaced.
    for (const session of sessions) {
      expect(session).not.toHaveProperty("token_hash");
      expect(session).not.toHaveProperty("tokenHash");
    }
    // Scopes to the user, filters to active rows, and matches isCurrent by the hashed cookie.
    expect(calls[0].text).toContain("FROM sessions");
    expect(calls[0].text).toContain("WHERE user_id = ?");
    expect(calls[0].text).toContain("expires_at > NOW()");
    expect(calls[0].values).toContain("42");
    expect(calls[0].values).toContain(hashSessionToken("auth-token-value"));
    // The raw cookie token itself is never put into the query.
    expect(calls[0].values).not.toContain("auth-token-value");
  });

  it("flags no row as current when no cookie token is supplied", async () => {
    const { sql, calls } = mockSql([]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await getWebSessions("42");

    expect(calls[0].values).toContain("");
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
