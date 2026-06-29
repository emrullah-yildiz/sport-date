import "server-only";

import {
  createEmailVerificationToken,
  createPasswordResetToken,
  hashPassword,
  hashSessionToken,
  isValidEmailVerificationToken,
  isValidPasswordResetToken,
  validatePasswordStrength,
} from "@/lib/auth";
import {
  buildEmailVerificationDraft,
  buildPasswordResetDraft,
  type AuthEmailDraft,
  resolveAuthEmailOrigin,
} from "@/lib/auth-email-content";
import { canSendAuthEmails, dispatchAuthEmail, resolveAuthEmailProvider } from "@/lib/auth-email-delivery";
import { getDatabase } from "@/lib/db";

type DeliveryState = "unconfigured" | "ready" | "simulated";
type VerificationRequestState = "created" | "already_verified";
type VerificationConfirmState = "verified" | "already_verified" | "invalid" | "expired";
type PasswordResetConfirmState = "reset" | "invalid" | "expired";

type VerificationTokenRow = {
  id: string;
  user_id: string | number;
  email_verified: boolean;
  expires_at: string;
  consumed_at: string | null;
  invalidated_reason: string | null;
};

type PasswordResetTokenRow = {
  id: string;
  user_id: string | number;
  expires_at: string;
  consumed_at: string | null;
  invalidated_reason: string | null;
};

export type AuthEmailDeliveryPreparation = Readonly<{
  state: DeliveryState;
  origin: string | null;
  draft: AuthEmailDraft | null;
  provider: "disabled" | "console";
  messageId: string | null;
}>;

function deliveryState(): DeliveryState {
  return resolveAuthEmailOrigin() ? "ready" : "unconfigured";
}

export function isEmailDeliveryConfigured(): boolean {
  return canSendAuthEmails() && !!resolveAuthEmailOrigin();
}

async function finalizeDeliveryPreparation(
  draft: AuthEmailDraft | null,
  fallbackState: DeliveryState,
  origin: string | null,
): Promise<AuthEmailDeliveryPreparation> {
  const provider = resolveAuthEmailProvider();
  if (!draft) return { state: fallbackState, origin, draft: null, provider, messageId: null };

  if (!isEmailDeliveryConfigured()) {
    return { state: fallbackState, origin, draft, provider, messageId: null };
  }

  const dispatch = await dispatchAuthEmail(draft);
  return {
    state: dispatch.state === "simulated" ? "simulated" : fallbackState,
    origin,
    draft,
    provider: dispatch.provider,
    messageId: dispatch.messageId,
  };
}

async function buildVerificationDeliveryPreparation(email: string, rawToken: string, expiresAt: Date): Promise<AuthEmailDeliveryPreparation> {
  const origin = resolveAuthEmailOrigin();
  if (!origin) return { state: "unconfigured", origin: null, draft: null, provider: "disabled", messageId: null };
  return finalizeDeliveryPreparation(
    buildEmailVerificationDraft({ origin, email, token: rawToken, expiresAt }),
    "ready",
    origin,
  );
}

async function buildPasswordResetDeliveryPreparation(email: string, rawToken: string, expiresAt: Date): Promise<AuthEmailDeliveryPreparation> {
  const origin = resolveAuthEmailOrigin();
  if (!origin) return { state: "unconfigured", origin: null, draft: null, provider: "disabled", messageId: null };
  return finalizeDeliveryPreparation(
    buildPasswordResetDraft({ origin, email, token: rawToken, expiresAt }),
    "ready",
    origin,
  );
}

export async function issueEmailVerificationTokenForUser(
  userId: string,
  email: string,
  now = new Date(),
) {
  const token = createEmailVerificationToken(now);
  const nowIso = now.toISOString();
  const sql = getDatabase();

  const rows = await sql`
    WITH target_user AS (
      SELECT id, email_verified FROM users
      WHERE id = ${userId} AND account_status = 'active'
      LIMIT 1
    ), invalidated AS (
      UPDATE email_verification_tokens
      SET invalidated_reason = 'resend_replaced'
      WHERE user_id IN (SELECT id FROM target_user)
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
      RETURNING send_count
    ), inserted AS (
      INSERT INTO email_verification_tokens (
        id, user_id, email, token_hash, expires_at, last_sent_at, send_count
      )
      SELECT
        ${token.id}::uuid,
        target_user.id,
        ${email},
        ${token.tokenHash},
        ${token.expiresAt.toISOString()}::timestamptz,
        ${nowIso}::timestamptz,
        COALESCE((SELECT MAX(send_count) FROM invalidated), 0) + 1
      FROM target_user
      WHERE target_user.email_verified = FALSE
      RETURNING id
    )
    SELECT
      COALESCE((SELECT id FROM inserted LIMIT 1), '') AS inserted_id,
      COALESCE((SELECT email_verified FROM target_user LIMIT 1), FALSE) AS email_verified
  `;

  const row = rows[0] as { inserted_id: string; email_verified: boolean } | undefined;
  if (!row?.inserted_id) {
    return {
      state: row?.email_verified ? "already_verified" : "created",
      delivery: {
        state: deliveryState(),
        origin: resolveAuthEmailOrigin(),
        draft: null,
        provider: resolveAuthEmailProvider(),
        messageId: null,
      },
    } satisfies { state: VerificationRequestState; delivery: AuthEmailDeliveryPreparation };
  }

  return {
    state: "created" as const,
    delivery: await buildVerificationDeliveryPreparation(email, token.token, token.expiresAt),
  };
}

export async function requestPasswordResetTokenForEmail(
  email: string,
  requestIp: string,
  now = new Date(),
) {
  const token = createPasswordResetToken(now);
  const nowIso = now.toISOString();
  const ipHash = requestIp && requestIp !== "unknown" ? hashSessionToken(requestIp) : null;
  const sql = getDatabase();

  await sql`
    WITH target_user AS (
      SELECT id FROM users
      WHERE email = ${email} AND account_status = 'active'
      LIMIT 1
    ), invalidated AS (
      UPDATE password_reset_tokens
      SET invalidated_reason = 'resend_replaced'
      WHERE user_id IN (SELECT id FROM target_user)
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
      RETURNING send_count
    )
    INSERT INTO password_reset_tokens (
      id, user_id, token_hash, expires_at, last_sent_at, send_count, requested_ip_hash
    )
    SELECT
      ${token.id}::uuid,
      target_user.id,
      ${token.tokenHash},
      ${token.expiresAt.toISOString()}::timestamptz,
      ${nowIso}::timestamptz,
      COALESCE((SELECT MAX(send_count) FROM invalidated), 0) + 1,
      ${ipHash}
    FROM target_user
  `;

  return { delivery: await buildPasswordResetDeliveryPreparation(email, token.token, token.expiresAt) };
}

export async function confirmEmailVerificationToken(
  rawToken: string,
  now = new Date(),
): Promise<{ state: VerificationConfirmState }> {
  if (!isValidEmailVerificationToken(rawToken)) return { state: "invalid" };
  const tokenHash = hashSessionToken(rawToken);
  const nowIso = now.toISOString();
  const sql = getDatabase();
  const rows = await sql`
    SELECT token.id, token.user_id, token.expires_at, token.consumed_at, token.invalidated_reason,
      users.email_verified
    FROM email_verification_tokens AS token
    JOIN users ON users.id = token.user_id
    WHERE token.token_hash = ${tokenHash}
    LIMIT 1
  ` as unknown as VerificationTokenRow[];
  const token = rows[0];
  if (!token || token.invalidated_reason) return { state: "invalid" };
  if (token.consumed_at || token.email_verified) return { state: "already_verified" };
  if (new Date(token.expires_at).getTime() <= now.getTime()) return { state: "expired" };

  await sql.transaction((transaction) => [
    transaction`
      UPDATE email_verification_tokens
      SET consumed_at = ${nowIso}::timestamptz
      WHERE id = ${token.id}::uuid AND consumed_at IS NULL
    `,
    transaction`
      UPDATE email_verification_tokens
      SET invalidated_reason = 'verified_elsewhere'
      WHERE user_id = ${token.user_id}
        AND id <> ${token.id}::uuid
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
    `,
    transaction`
      UPDATE users
      SET email_verified = TRUE,
          email_verified_at = COALESCE(email_verified_at, ${nowIso}::timestamptz),
          updated_at = NOW()
      WHERE id = ${token.user_id} AND account_status = 'active'
    `,
  ]);
  return { state: "verified" };
}

export async function confirmPasswordResetToken(
  rawToken: string,
  newPassword: string,
  now = new Date(),
): Promise<{ state: PasswordResetConfirmState } | { state: "validation_error"; errors: readonly string[] }> {
  if (!isValidPasswordResetToken(rawToken)) return { state: "invalid" };
  const passwordErrors = validatePasswordStrength(newPassword);
  if (passwordErrors.length > 0) return { state: "validation_error", errors: passwordErrors };

  const tokenHash = hashSessionToken(rawToken);
  const nowIso = now.toISOString();
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, user_id, expires_at, consumed_at, invalidated_reason
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  ` as unknown as PasswordResetTokenRow[];
  const token = rows[0];
  if (!token || token.invalidated_reason) return { state: "invalid" };
  if (token.consumed_at) return { state: "invalid" };
  if (new Date(token.expires_at).getTime() <= now.getTime()) return { state: "expired" };

  const nextPasswordHash = await hashPassword(newPassword);
  await sql.transaction((transaction) => [
    transaction`
      UPDATE password_reset_tokens
      SET consumed_at = ${nowIso}::timestamptz
      WHERE id = ${token.id}::uuid AND consumed_at IS NULL
    `,
    transaction`
      UPDATE password_reset_tokens
      SET invalidated_reason = 'password_reset_completed'
      WHERE user_id = ${token.user_id}
        AND id <> ${token.id}::uuid
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
    `,
    transaction`
      UPDATE users
      SET password_hash = ${nextPasswordHash}, updated_at = NOW()
      WHERE id = ${token.user_id} AND account_status = 'active'
    `,
    transaction`
      DELETE FROM sessions WHERE user_id = ${token.user_id}
    `,
    transaction`
      UPDATE mobile_sessions
      SET revoked_at = NOW()
      WHERE user_id = ${token.user_id} AND revoked_at IS NULL
    `,
  ]);
  return { state: "reset" };
}

export async function revokeOutstandingAuthTokensForUser(userId: string) {
  const sql = getDatabase();
  await sql.transaction((transaction) => [
    transaction`
      UPDATE email_verification_tokens
      SET invalidated_reason = 'account_deletion'
      WHERE user_id = ${userId}
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
    `,
    transaction`
      UPDATE password_reset_tokens
      SET invalidated_reason = 'account_deletion'
      WHERE user_id = ${userId}
        AND consumed_at IS NULL
        AND invalidated_reason IS NULL
    `,
  ]);
}
