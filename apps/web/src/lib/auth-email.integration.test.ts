import crypto from "node:crypto";

import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// `server-only` throws when imported outside an RSC graph; neutralize it as the
// other server-lib specs do so the real auth-email module can be exercised here.
vi.mock("server-only", () => ({}));

import {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashSessionToken,
} from "@/lib/auth";
import {
  confirmEmailVerificationToken,
  confirmPasswordResetToken,
  issueEmailVerificationTokenForUser,
  requestPasswordResetTokenForEmail,
  resetResetRequestMinDurationForTests,
  revokeOutstandingAuthTokensForUser,
  setResetRequestMinDurationForTests,
} from "@/lib/auth-email";

// Opt-in only. The default hermetic suite never connects to a database; these
// tests run against a real (dev) PostgreSQL and are enabled with
// RUN_DB_INTEGRATION=1 plus a DATABASE_URL / NEON_DATABASE_URL. See
// `npm run test:integration -w @sport-date/web`.
//
// Non-destructive design: a single, fixed sentinel "fixture" user
// (int-test+fixture@sport-date.invalid) is reused across tests. Only that
// fixture's child rows (tokens, sessions, mobile sessions) and its own mutable
// columns are written and reset between tests; no other row and no other table
// (e.g. `registrations`) is read or modified. The fixture user row is NOT
// deleted on teardown because a discovered schema bug makes hard-deleting any
// users row impossible (the moderation_audit_log append-only UPDATE rule blocks
// the actor_user_id ON DELETE SET NULL referential action). Reusing one fixed
// address keeps that residue to exactly one labelled row across all runs.
const FIXTURE_EMAIL = "int-test+fixture@sport-date.invalid";
const ORIGINAL_PASSWORD_HASH = "integration-test-original-hash";
const databaseUrl = process.env.DATABASE_URL ?? process.env.NEON_DATABASE_URL;
const enabled = process.env.RUN_DB_INTEGRATION === "1" && Boolean(databaseUrl);

const randomHex64 = () => crypto.randomBytes(32).toString("hex");
const isoFromNow = (ms: number) => new Date(Date.now() + ms).toISOString();

describe.skipIf(!enabled)("auth-email integration (real SQL)", () => {
  let sql: NeonQueryFunction<false, false>;
  let fixtureId: string | number;

  async function resetFixture() {
    await sql`DELETE FROM email_verification_tokens WHERE user_id = ${fixtureId}`;
    await sql`DELETE FROM password_reset_tokens WHERE user_id = ${fixtureId}`;
    await sql`DELETE FROM sessions WHERE user_id = ${fixtureId}`;
    await sql`DELETE FROM mobile_sessions WHERE user_id = ${fixtureId}`;
    await sql`
      UPDATE users
      SET email_verified = FALSE, email_verified_at = NULL, password_hash = ${ORIGINAL_PASSWORD_HASH}
      WHERE id = ${fixtureId}
    `;
  }

  async function insertVerificationToken(overrides: { expiresAt?: Date } = {}) {
    const token = createEmailVerificationToken();
    const expiresAt = (overrides.expiresAt ?? token.expiresAt).toISOString();
    await sql`
      INSERT INTO email_verification_tokens (
        id, user_id, email, token_hash, expires_at, last_sent_at, send_count
      ) VALUES (
        ${token.id}, ${fixtureId}, ${FIXTURE_EMAIL}, ${token.tokenHash}, ${expiresAt}, ${new Date().toISOString()}, 1
      )
    `;
    return token;
  }

  async function insertResetToken(overrides: { expiresAt?: Date } = {}) {
    const token = createPasswordResetToken();
    const expiresAt = (overrides.expiresAt ?? token.expiresAt).toISOString();
    await sql`
      INSERT INTO password_reset_tokens (
        id, user_id, token_hash, expires_at, last_sent_at, send_count
      ) VALUES (
        ${token.id}, ${fixtureId}, ${token.tokenHash}, ${expiresAt}, ${new Date().toISOString()}, 1
      )
    `;
    return token;
  }

  beforeAll(async () => {
    sql = neon(databaseUrl as string);
    const rows = await sql`
      INSERT INTO users (
        email, password_hash, first_name, last_name, date_of_birth,
        location, seeking, email_verified, accepted_terms_at
      ) VALUES (
        ${FIXTURE_EMAIL}, ${ORIGINAL_PASSWORD_HASH}, ${"Inte"}, ${"Gration"}, ${"1990-01-01"},
        ${"Bucharest"}, ${"friendship"}, FALSE, ${new Date().toISOString()}
      )
      ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
      RETURNING id
    `;
    fixtureId = (rows[0] as { id: string | number }).id;
    await resetFixture();
  });

  afterEach(async () => {
    resetResetRequestMinDurationForTests();
    await resetFixture();
  });

  afterAll(async () => {
    // Leave the single fixture user row (cannot be deleted — see header note);
    // ensure no child residue remains.
    if (fixtureId !== undefined) await resetFixture();
  });

  it("issues a verification token and invalidates the prior active one on resend", async () => {
    const first = await issueEmailVerificationTokenForUser(String(fixtureId), FIXTURE_EMAIL);
    expect(first.state).toBe("created");

    const second = await issueEmailVerificationTokenForUser(String(fixtureId), FIXTURE_EMAIL);
    expect(second.state).toBe("created");

    const rows = (await sql`
      SELECT invalidated_reason, send_count FROM email_verification_tokens
      WHERE user_id = ${fixtureId} ORDER BY send_count ASC
    `) as Array<{ invalidated_reason: string | null; send_count: number }>;

    expect(rows).toHaveLength(2);
    const active = rows.filter((r) => r.invalidated_reason === null);
    expect(active).toHaveLength(1);
    expect(active[0].send_count).toBe(2);
    expect(rows.some((r) => r.invalidated_reason === "resend_replaced")).toBe(true);
  });

  it("confirms a verification token: consumes it, verifies the user, invalidates siblings, and is single-use", async () => {
    const tokenA = await insertVerificationToken();
    const tokenB = await insertVerificationToken();

    const result = await confirmEmailVerificationToken(tokenB.token);
    expect(result.state).toBe("verified");

    const user = (await sql`
      SELECT email_verified, email_verified_at FROM users WHERE id = ${fixtureId}
    `) as Array<{ email_verified: boolean; email_verified_at: string | null }>;
    expect(user[0].email_verified).toBe(true);
    expect(user[0].email_verified_at).not.toBeNull();

    const consumed = (await sql`
      SELECT consumed_at FROM email_verification_tokens WHERE token_hash = ${tokenB.tokenHash}
    `) as Array<{ consumed_at: string | null }>;
    expect(consumed[0].consumed_at).not.toBeNull();

    const sibling = (await sql`
      SELECT invalidated_reason FROM email_verification_tokens WHERE token_hash = ${tokenA.tokenHash}
    `) as Array<{ invalidated_reason: string | null }>;
    expect(sibling[0].invalidated_reason).toBe("verified_elsewhere");

    expect((await confirmEmailVerificationToken(tokenB.token)).state).toBe("already_verified");
    expect((await confirmEmailVerificationToken(tokenA.token)).state).toBe("invalid");
  });

  it("rejects an expired verification token without consuming it", async () => {
    const token = await insertVerificationToken({ expiresAt: new Date(Date.now() - 60_000) });

    expect((await confirmEmailVerificationToken(token.token)).state).toBe("expired");

    const row = (await sql`
      SELECT consumed_at, invalidated_reason FROM email_verification_tokens WHERE token_hash = ${token.tokenHash}
    `) as Array<{ consumed_at: string | null; invalidated_reason: string | null }>;
    expect(row[0].consumed_at).toBeNull();
    expect(row[0].invalidated_reason).toBeNull();
  });

  it("does not issue a verification token for an already-verified account (regression: empty-insert uuid coalesce)", async () => {
    await sql`UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = ${fixtureId}`;

    const result = await issueEmailVerificationTokenForUser(String(fixtureId), FIXTURE_EMAIL);
    expect(result.state).toBe("already_verified");

    const rows = await sql`SELECT 1 FROM email_verification_tokens WHERE user_id = ${fixtureId}`;
    expect(rows).toHaveLength(0);
  });

  it("stores a reset request with a hashed IP and invalidates the prior active token on resend", async () => {
    setResetRequestMinDurationForTests(0);
    const ip = "203.0.113.7";

    await requestPasswordResetTokenForEmail(FIXTURE_EMAIL, ip);
    await requestPasswordResetTokenForEmail(FIXTURE_EMAIL, ip);

    const rows = (await sql`
      SELECT requested_ip_hash, invalidated_reason, send_count FROM password_reset_tokens
      WHERE user_id = ${fixtureId} ORDER BY send_count ASC
    `) as Array<{ requested_ip_hash: string | null; invalidated_reason: string | null; send_count: number }>;

    expect(rows).toHaveLength(2);
    const active = rows.filter((r) => r.invalidated_reason === null);
    expect(active).toHaveLength(1);
    expect(active[0].send_count).toBe(2);
    expect(rows.some((r) => r.invalidated_reason === "resend_replaced")).toBe(true);
    // IP is stored only as a SHA-256 hash, never in the clear.
    expect(rows[0].requested_ip_hash).toBe(hashSessionToken(ip));
    expect(rows[0].requested_ip_hash).not.toBe(ip);
  });

  it("stays neutral for a password reset request to an unknown email", async () => {
    setResetRequestMinDurationForTests(0);
    const unknown = `int-test+unknown-${crypto.randomUUID()}@sport-date.invalid`;

    await expect(requestPasswordResetTokenForEmail(unknown, "203.0.113.7")).resolves.toBeDefined();

    const rows = await sql`
      SELECT 1 FROM password_reset_tokens t
      JOIN users u ON u.id = t.user_id
      WHERE u.email = ${unknown}
    `;
    expect(rows).toHaveLength(0);
  });

  it("confirms a password reset: rotates the hash, revokes browser and mobile sessions, and is single-use", async () => {
    await sql`INSERT INTO sessions (id, token_hash, user_id, expires_at)
      VALUES (${crypto.randomUUID()}, ${randomHex64()}, ${fixtureId}, ${isoFromNow(3_600_000)})`;
    await sql`INSERT INTO sessions (id, token_hash, user_id, expires_at)
      VALUES (${crypto.randomUUID()}, ${randomHex64()}, ${fixtureId}, ${isoFromNow(3_600_000)})`;
    await sql`INSERT INTO mobile_sessions (
      id, user_id, device_id_hash, device_name, access_token_hash, refresh_token_hash,
      access_expires_at, refresh_expires_at
    ) VALUES (
      ${crypto.randomUUID()}, ${fixtureId}, ${randomHex64()}, ${"Test Device"}, ${randomHex64()}, ${randomHex64()},
      ${isoFromNow(900_000)}, ${isoFromNow(2_592_000_000)}
    )`;

    const token = await insertResetToken();
    const result = await confirmPasswordResetToken(token.token, "Str0ngNewPass123");
    expect(result.state).toBe("reset");

    const sessions = await sql`SELECT 1 FROM sessions WHERE user_id = ${fixtureId}`;
    expect(sessions).toHaveLength(0);

    const mobile = (await sql`SELECT revoked_at FROM mobile_sessions WHERE user_id = ${fixtureId}`) as Array<{
      revoked_at: string | null;
    }>;
    expect(mobile).toHaveLength(1);
    expect(mobile[0].revoked_at).not.toBeNull();

    const after = (await sql`SELECT password_hash FROM users WHERE id = ${fixtureId}`) as Array<{
      password_hash: string;
    }>;
    expect(after[0].password_hash).not.toBe(ORIGINAL_PASSWORD_HASH);

    const consumed = (await sql`
      SELECT consumed_at FROM password_reset_tokens WHERE token_hash = ${token.tokenHash}
    `) as Array<{ consumed_at: string | null }>;
    expect(consumed[0].consumed_at).not.toBeNull();

    expect((await confirmPasswordResetToken(token.token, "Str0ngNewPass123")).state).toBe("invalid");
  });

  it("revokes all outstanding verification and reset tokens on account deletion", async () => {
    const verification = await insertVerificationToken();
    const reset = await insertResetToken();

    await revokeOutstandingAuthTokensForUser(String(fixtureId));

    const v = (await sql`
      SELECT invalidated_reason FROM email_verification_tokens WHERE token_hash = ${verification.tokenHash}
    `) as Array<{ invalidated_reason: string | null }>;
    const r = (await sql`
      SELECT invalidated_reason FROM password_reset_tokens WHERE token_hash = ${reset.tokenHash}
    `) as Array<{ invalidated_reason: string | null }>;

    expect(v[0].invalidated_reason).toBe("account_deletion");
    expect(r[0].invalidated_reason).toBe("account_deletion");
  });
});
