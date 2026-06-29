import { beforeEach, describe, expect, it, vi } from "vitest";

const CONNECTION_STRING =
  "postgres://secret_user:super_secret_pw@db.eu-central-1.aws.neon.tech/sportdate?sslmode=require";

const mocks = vi.hoisted(() => {
  class DatabaseNotConfiguredError extends Error {
    constructor() {
      super("Database URL is not configured.");
      this.name = "DatabaseNotConfiguredError";
    }
  }
  return {
    getDatabase: vi.fn(),
    DatabaseNotConfiguredError,
  };
});

const { DatabaseNotConfiguredError } = mocks;

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db", () => ({
  getDatabase: mocks.getDatabase,
  DatabaseNotConfiguredError: mocks.DatabaseNotConfiguredError,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("health readiness endpoint", () => {
  it("returns 200 ready when the probe query resolves", async () => {
    const sql = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    mocks.getDatabase.mockReturnValue(sql);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: "ready" });
    // The probe actually ran a query.
    expect(sql).toHaveBeenCalledTimes(1);
  });

  it("is never cached so a monitor cannot read a stale ready", async () => {
    const sql = vi.fn().mockResolvedValue([{ "?column?": 1 }]);
    mocks.getDatabase.mockReturnValue(sql);

    const response = await GET();
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("returns 503 not_ready when the database is not configured", async () => {
    mocks.getDatabase.mockImplementation(() => {
      throw new DatabaseNotConfiguredError();
    });

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "not_ready",
      reason: "database_not_configured",
    });
  });

  it("returns 503 not_ready when the probe query rejects", async () => {
    const sql = vi.fn().mockRejectedValue(
      // Driver errors can embed the connection string; the body must not leak it.
      new Error(`connection to ${CONNECTION_STRING} failed`),
    );
    mocks.getDatabase.mockReturnValue(sql);

    const response = await GET();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "not_ready",
      reason: "database_unreachable",
    });
  });

  it("never leaks the connection string in any response body", async () => {
    // Query-error path: the rejection message carries the connection string.
    const sql = vi
      .fn()
      .mockRejectedValue(new Error(`connection to ${CONNECTION_STRING} failed`));
    mocks.getDatabase.mockReturnValue(sql);

    const rejectResponse = await GET();
    const rejectBody = await rejectResponse.text();
    expect(rejectBody).not.toContain(CONNECTION_STRING);
    expect(rejectBody).not.toContain("super_secret_pw");
    expect(rejectBody).not.toContain("neon.tech");

    // getDatabase-throws path (non-config error): the thrown message also carries it.
    mocks.getDatabase.mockImplementation(() => {
      throw new Error(`cannot reach ${CONNECTION_STRING}`);
    });
    const throwResponse = await GET();
    expect(throwResponse.status).toBe(503);
    const throwBody = await throwResponse.text();
    expect(throwBody).not.toContain(CONNECTION_STRING);
    expect(throwBody).not.toContain("super_secret_pw");
  });
});
