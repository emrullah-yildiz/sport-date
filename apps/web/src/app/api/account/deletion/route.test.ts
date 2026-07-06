import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  clearSessionCookie: vi.fn(),
  isTrustedBrowserMutation: vi.fn(() => true),
  verifyPassword: vi.fn(),
  revokeOutstandingAuthTokensForUser: vi.fn(),
  purgeProfilePhotosForUser: vi.fn(),
  getDatabase: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: mocks.getDatabase }));
vi.mock("@/lib/session", () => ({
  getCurrentUser: mocks.getCurrentUser,
  clearSessionCookie: mocks.clearSessionCookie,
}));
vi.mock("@/lib/auth", () => ({ verifyPassword: mocks.verifyPassword }));
vi.mock("@/lib/auth-email", () => ({
  revokeOutstandingAuthTokensForUser: mocks.revokeOutstandingAuthTokensForUser,
}));
vi.mock("@/lib/photos", () => ({
  purgeProfilePhotosForUser: mocks.purgeProfilePhotosForUser,
}));
vi.mock("@/lib/request-security", () => ({
  isTrustedBrowserMutation: mocks.isTrustedBrowserMutation,
}));

import { POST } from "./route";

// Captures every SQL statement the route executes so the tests can assert the
// erasure side effects (GDPR Art. 17 lock-down) are all part of ONE statement.
let executedStatements: string[] = [];
let deletionRequestRows: Array<{ id: string }> = [];

function mockDb() {
  executedStatements = [];
  const sql = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    executedStatements.push(text);
    void values;
    if (text.includes("password_hash")) {
      return Promise.resolve([{ password_hash: "stored-hash" }]);
    }
    if (text.includes("data_requests")) {
      return Promise.resolve(deletionRequestRows);
    }
    return Promise.resolve([]);
  });
  mocks.getDatabase.mockReturnValue(sql as never);
  return sql;
}

function post(body: BodyInit | null = JSON.stringify({ password: "correct horse" })) {
  return new Request("https://keepitup.example/api/account/deletion", {
    method: "POST",
    headers: { origin: "https://keepitup.example", "content-type": "application/json" },
    body,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  deletionRequestRows = [{ id: "11111111-1111-4111-8111-111111111111" }];
  mockDb();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.getCurrentUser.mockResolvedValue({ id: "202", firstName: "Ana" });
  mocks.verifyPassword.mockResolvedValue(true);
  mocks.revokeOutstandingAuthTokensForUser.mockResolvedValue(undefined);
  mocks.purgeProfilePhotosForUser.mockResolvedValue({ removed: 0 });
});

describe("POST /api/account/deletion — re-authenticated GDPR deletion request", () => {
  it("rejects a cross-site request before any auth, password, or database work", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const response = await POST(post());
    expect(response.status).toBe(403);
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(executedStatements).toHaveLength(0);
  });

  it("requires authentication", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(post());
    expect(response.status).toBe(401);
    expect(executedStatements).toHaveLength(0);
  });

  it("400s on a non-JSON body without touching the database", async () => {
    const response = await POST(post("not json"));
    expect(response.status).toBe(400);
    expect(executedStatements).toHaveLength(0);
  });

  it("400s when the password is missing or empty", async () => {
    const response = await POST(post(JSON.stringify({})));
    expect(response.status).toBe(400);
    expect(executedStatements).toHaveLength(0);
  });

  it("400s when the password exceeds the bounded length", async () => {
    const response = await POST(post(JSON.stringify({ password: "x".repeat(1025) })));
    expect(response.status).toBe(400);
    expect(executedStatements).toHaveLength(0);
  });

  it("401s on a wrong password and performs NO deletion side effect", async () => {
    mocks.verifyPassword.mockResolvedValue(false);
    const response = await POST(post());
    expect(response.status).toBe(401);
    // Only the credential lookup ran — never the deletion statement.
    expect(executedStatements).toHaveLength(1);
    expect(executedStatements[0]).toContain("password_hash");
    expect(mocks.revokeOutstandingAuthTokensForUser).not.toHaveBeenCalled();
    expect(mocks.purgeProfilePhotosForUser).not.toHaveBeenCalled();
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
  });

  it("401s when the account is not active (no credential row) without calling verifyPassword", async () => {
    const sql = vi.fn((strings: TemplateStringsArray) => {
      executedStatements.push(strings.join("?"));
      return Promise.resolve([]);
    });
    mocks.getDatabase.mockReturnValue(sql as never);
    const response = await POST(post());
    expect(response.status).toBe(401);
    expect(mocks.verifyPassword).not.toHaveBeenCalled();
    expect(executedStatements).toHaveLength(1);
  });

  it("locks the account in one statement: deletion_pending, hosted events cancelled, seats and sent messages removed, join requests cancelled, all sessions revoked", async () => {
    const response = await POST(post());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.requestId).toBeDefined();

    // The credential check verified the member's CURRENT password (re-auth).
    expect(mocks.verifyPassword).toHaveBeenCalledWith("correct horse", "stored-hash");

    // Every erasure side effect is part of ONE atomic statement.
    const deletionStatement = executedStatements.find((text) => text.includes("data_requests"));
    expect(deletionStatement).toBeDefined();
    expect(deletionStatement).toContain("'deletion'");
    expect(deletionStatement).toContain("account_status = 'deletion_pending'");
    expect(deletionStatement).toContain("UPDATE events SET status = 'cancelled'");
    expect(deletionStatement).toContain("DELETE FROM event_participants");
    expect(deletionStatement).toContain("DELETE FROM event_messages");
    expect(deletionStatement).toContain("UPDATE join_requests SET status = 'cancelled'");
    expect(deletionStatement).toContain("DELETE FROM sessions");
    expect(deletionStatement).toContain("UPDATE mobile_sessions SET revoked_at = NOW()");

    // Outstanding verification/reset tokens are revoked and photo bytes purged.
    expect(mocks.revokeOutstandingAuthTokensForUser).toHaveBeenCalledWith("202");
    expect(mocks.purgeProfilePhotosForUser).toHaveBeenCalledWith("202");

    // The requesting browser is signed out immediately.
    expect(mocks.clearSessionCookie).toHaveBeenCalledWith(response);
  });

  it("409s when a deletion request is already pending, without revoking tokens or purging photos again", async () => {
    deletionRequestRows = [];
    const response = await POST(post());
    expect(response.status).toBe(409);
    expect(mocks.revokeOutstandingAuthTokensForUser).not.toHaveBeenCalled();
    expect(mocks.purgeProfilePhotosForUser).not.toHaveBeenCalled();
    expect(mocks.clearSessionCookie).not.toHaveBeenCalled();
  });
});
