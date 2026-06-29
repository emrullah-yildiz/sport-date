import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({
  getDatabase: vi.fn(),
  DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {},
}));

import {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashSessionToken,
} from "./auth";
import { getDatabase } from "./db";

let confirmEmailVerificationToken: typeof import("./auth-email").confirmEmailVerificationToken;
let confirmPasswordResetToken: typeof import("./auth-email").confirmPasswordResetToken;
let issueEmailVerificationTokenForUser: typeof import("./auth-email").issueEmailVerificationTokenForUser;
let requestPasswordResetTokenForEmail: typeof import("./auth-email").requestPasswordResetTokenForEmail;

beforeEach(async () => {
  vi.resetModules();
  vi.clearAllMocks();
  // Keep email delivery disabled so these tests exercise persistence logic only.
  delete process.env.EMAIL_DELIVERY_ENABLED;
  delete process.env.EMAIL_DELIVERY_PROVIDER;
  delete process.env.APP_PUBLIC_ORIGIN;
  delete process.env.NEXT_PUBLIC_APP_ORIGIN;
  ({
    confirmEmailVerificationToken,
    confirmPasswordResetToken,
    issueEmailVerificationTokenForUser,
    requestPasswordResetTokenForEmail,
  } = await import("./auth-email"));
});

/**
 * Builds a tagged-template `sql` mock that returns each queued row-set in order
 * for direct `sql\`...\`` calls, and records every statement passed to
 * `sql.transaction(() => [...])` so security side effects can be asserted.
 */
function buildSqlMock(directRowSets: unknown[][]) {
  const queue = [...directRowSets];
  const transactionStatements: string[] = [];

  const tag = (strings: TemplateStringsArray) => {
    transactionStatements.push(strings.join(" "));
    return strings.join(" ");
  };

  const sql = Object.assign(
    vi.fn().mockImplementation(() => Promise.resolve(queue.shift() ?? [])),
    {
      transaction: vi.fn().mockImplementation((build: (t: typeof tag) => unknown[]) => {
        build(tag);
        return Promise.resolve([]);
      }),
    },
  );

  return { sql, transactionStatements };
}

const VALID_VERIFICATION_TOKEN = createEmailVerificationToken().token;
const VALID_RESET_TOKEN = createPasswordResetToken().token;

describe("email verification confirmation", () => {
  it("rejects malformed tokens before touching the database", async () => {
    await expect(confirmEmailVerificationToken("not-a-token")).resolves.toEqual({ state: "invalid" });
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("treats an unknown or invalidated token as invalid", async () => {
    const { sql } = buildSqlMock([[]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    await expect(confirmEmailVerificationToken(VALID_VERIFICATION_TOKEN)).resolves.toEqual({ state: "invalid" });
  });

  it("reports an expired token without consuming it", async () => {
    const { sql, transactionStatements } = buildSqlMock([
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          consumed_at: null,
          invalidated_reason: null,
          email_verified: false,
        },
      ],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    await expect(confirmEmailVerificationToken(VALID_VERIFICATION_TOKEN)).resolves.toEqual({ state: "expired" });
    expect(transactionStatements).toHaveLength(0);
  });

  it("verifies a fresh token, marks the user verified, and invalidates sibling tokens", async () => {
    const { sql, transactionStatements } = buildSqlMock([
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          consumed_at: null,
          invalidated_reason: null,
          email_verified: false,
        },
      ],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await expect(confirmEmailVerificationToken(VALID_VERIFICATION_TOKEN)).resolves.toEqual({ state: "verified" });

    const joined = transactionStatements.join("\n");
    expect(joined).toContain("UPDATE email_verification_tokens");
    expect(joined).toContain("consumed_at");
    expect(joined).toContain("SET email_verified = TRUE");
    expect(joined).toContain("verified_elsewhere");
  });

  it("does not re-verify an already consumed token", async () => {
    const { sql, transactionStatements } = buildSqlMock([
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          expires_at: new Date(Date.now() + 3_600_000).toISOString(),
          consumed_at: new Date().toISOString(),
          invalidated_reason: null,
          email_verified: false,
        },
      ],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    await expect(confirmEmailVerificationToken(VALID_VERIFICATION_TOKEN)).resolves.toEqual({ state: "already_verified" });
    expect(transactionStatements).toHaveLength(0);
  });
});

describe("password reset confirmation", () => {
  it("rejects malformed tokens before touching the database", async () => {
    await expect(confirmPasswordResetToken("not-a-token", "LongEnough123")).resolves.toEqual({ state: "invalid" });
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("rejects a weak replacement password before any lookup", async () => {
    const result = await confirmPasswordResetToken(VALID_RESET_TOKEN, "short");
    expect(result.state).toBe("validation_error");
    if (result.state === "validation_error") {
      expect(result.errors.length).toBeGreaterThan(0);
    }
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("reports an expired reset token without rotating the password", async () => {
    const { sql, transactionStatements } = buildSqlMock([
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          expires_at: new Date(Date.now() - 60_000).toISOString(),
          consumed_at: null,
          invalidated_reason: null,
        },
      ],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    await expect(confirmPasswordResetToken(VALID_RESET_TOKEN, "LongEnough123")).resolves.toEqual({ state: "expired" });
    expect(transactionStatements).toHaveLength(0);
  });

  it("resets the password and revokes every browser and mobile session", async () => {
    const { sql, transactionStatements } = buildSqlMock([
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          user_id: "22222222-2222-4222-8222-222222222222",
          expires_at: new Date(Date.now() + 1_800_000).toISOString(),
          consumed_at: null,
          invalidated_reason: null,
        },
      ],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await expect(confirmPasswordResetToken(VALID_RESET_TOKEN, "LongEnough123")).resolves.toEqual({ state: "reset" });

    const joined = transactionStatements.join("\n");
    expect(joined).toContain("UPDATE users");
    expect(joined).toContain("password_hash");
    // Security boundary: a completed reset must terminate all existing sessions.
    expect(joined).toContain("DELETE FROM sessions");
    expect(joined).toContain("UPDATE mobile_sessions");
    expect(joined).toContain("revoked_at");
  });
});

describe("issuing verification tokens", () => {
  it("reports already-verified accounts without preparing a new token", async () => {
    const { sql } = buildSqlMock([[{ inserted_id: "", email_verified: true }]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await issueEmailVerificationTokenForUser(
      "22222222-2222-4222-8222-222222222222",
      "ana@example.com",
    );
    expect(result.state).toBe("already_verified");
    expect(result.delivery.draft).toBeNull();
  });

  it("creates a token and leaves delivery unconfigured when no provider exists", async () => {
    const { sql } = buildSqlMock([
      [{ inserted_id: "33333333-3333-4333-8333-333333333333", email_verified: false }],
    ]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await issueEmailVerificationTokenForUser(
      "22222222-2222-4222-8222-222222222222",
      "ana@example.com",
    );
    expect(result.state).toBe("created");
    expect(result.delivery.state).toBe("unconfigured");
    expect(result.delivery.draft).toBeNull();
  });
});

describe("requesting password reset tokens", () => {
  it("hashes the requester IP rather than persisting it in clear text", async () => {
    const { sql } = buildSqlMock([[]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await requestPasswordResetTokenForEmail("ana@example.com", "203.0.113.7");

    const insertCall = sql.mock.calls.find((call) =>
      String((call[0] as TemplateStringsArray).join(" ")).includes("INSERT INTO password_reset_tokens"),
    );
    expect(insertCall).toBeDefined();
    const boundValues = insertCall!.slice(1);
    const expectedIpHash = hashSessionToken("203.0.113.7");
    expect(boundValues).toContain(expectedIpHash);
    expect(boundValues).not.toContain("203.0.113.7");
  });

  it("stores no IP hash when the requester IP is unknown", async () => {
    const { sql } = buildSqlMock([[]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    await requestPasswordResetTokenForEmail("ana@example.com", "unknown");

    const insertCall = sql.mock.calls.find((call) =>
      String((call[0] as TemplateStringsArray).join(" ")).includes("INSERT INTO password_reset_tokens"),
    );
    expect(insertCall).toBeDefined();
    expect(insertCall!.slice(1)).toContain(null);
  });
});
