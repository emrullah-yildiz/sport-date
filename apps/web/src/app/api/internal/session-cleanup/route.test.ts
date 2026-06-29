import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class DatabaseNotConfiguredError extends Error {
    constructor() {
      super("Database URL is not configured.");
      this.name = "DatabaseNotConfiguredError";
    }
  }
  return {
    getDatabase: vi.fn(),
    cleanupExpiredSessionResidue: vi.fn(),
    DatabaseNotConfiguredError,
  };
});

const { DatabaseNotConfiguredError } = mocks;

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getDatabase: mocks.getDatabase,
  DatabaseNotConfiguredError: mocks.DatabaseNotConfiguredError,
}));
vi.mock("@/lib/session-cleanup.mjs", () => ({
  cleanupExpiredSessionResidue: mocks.cleanupExpiredSessionResidue,
}));

import { GET } from "./route";

const ORIGINAL_SECRET = process.env.CRON_SECRET;

function request(headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/internal/session-cleanup", {
    method: "GET",
    headers,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "test-cron-secret";
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
});

describe("scheduled session-cleanup cron endpoint", () => {
  it("rejects a request with no Authorization header", async () => {
    const response = await GET(request());
    expect(response.status).toBe(401);
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.cleanupExpiredSessionResidue).not.toHaveBeenCalled();
  });

  it("rejects a request with a wrong bearer token", async () => {
    const response = await GET(request({ authorization: "Bearer wrong-secret" }));
    expect(response.status).toBe(401);
    expect(mocks.cleanupExpiredSessionResidue).not.toHaveBeenCalled();
  });

  it("fails closed (401) when CRON_SECRET is not configured, even with a bearer", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(request({ authorization: "Bearer test-cron-secret" }));
    expect(response.status).toBe(401);
    expect(mocks.getDatabase).not.toHaveBeenCalled();
    expect(mocks.cleanupExpiredSessionResidue).not.toHaveBeenCalled();
  });

  it("runs the cleanup on the success path and returns the summary", async () => {
    const sql = Symbol("sql");
    const summary = {
      mode: "delete",
      runAt: "2026-06-30T00:00:00.000Z",
      browserSessions: 3,
      mobileSessions: 1,
      refreshTokenHistory: 2,
      emailVerificationTokens: 0,
      passwordResetTokens: 0,
    };
    mocks.getDatabase.mockReturnValue(sql);
    mocks.cleanupExpiredSessionResidue.mockResolvedValue(summary);

    const response = await GET(request({ authorization: "Bearer test-cron-secret" }));

    expect(response.status).toBe(200);
    expect(mocks.cleanupExpiredSessionResidue).toHaveBeenCalledWith(sql);
    await expect(response.json()).resolves.toEqual({ success: true, summary });
  });

  it("returns 503 when the database is not configured", async () => {
    mocks.getDatabase.mockImplementation(() => {
      throw new DatabaseNotConfiguredError();
    });
    const response = await GET(request({ authorization: "Bearer test-cron-secret" }));
    expect(response.status).toBe(503);
    expect(mocks.cleanupExpiredSessionResidue).not.toHaveBeenCalled();
  });
});
