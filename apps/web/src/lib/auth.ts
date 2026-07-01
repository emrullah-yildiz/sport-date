import crypto from "node:crypto";

import bcrypt from "bcryptjs";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
// Opt-in "Remember me" length. Applied ONLY when the member ticks the box at
// login; the default stays SESSION_DURATION_MS. The longer window is the sole
// difference — the cookie's httpOnly/secure/sameSite flags and the server-side
// hashed token are identical in both branches. The session remains a normal,
// revocable row in `sessions`, so it lists in and can be ended from the
// "Signed-in browsers" panel like any other.
const REMEMBER_ME_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MOBILE_ACCESS_DURATION_MS = 15 * 60 * 1000;
const MOBILE_REFRESH_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const EMAIL_VERIFICATION_DURATION_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_DURATION_MS = 60 * 60 * 1000;
const MOBILE_DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOBILE_ACCESS_TOKEN_PATTERN = /^sda_[A-Za-z0-9_-]{43}$/;
const MOBILE_REFRESH_TOKEN_PATTERN = /^sdr_[A-Za-z0-9_-]{43}$/;
const EMAIL_VERIFICATION_TOKEN_PATTERN = /^sdv_[A-Za-z0-9_-]{43}$/;
const PASSWORD_RESET_TOKEN_PATTERN = /^sdp_[A-Za-z0-9_-]{43}$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSession(options?: { remember?: boolean }): {
  id: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("base64url");
  // Default (unchecked) keeps today's 7-day window; the longer window applies
  // only when the member explicitly opts in via "Remember me".
  const durationMs = options?.remember ? REMEMBER_ME_SESSION_DURATION_MS : SESSION_DURATION_MS;
  return {
    id: crypto.randomUUID(),
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + durationMs),
  };
}

function createOpaqueToken(prefix: "sda" | "sdr" | "sdv" | "sdp") {
  const token = `${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashSessionToken(token) };
}

function createAuthFlowToken(prefix: "sdv" | "sdp", durationMs: number, now = new Date()) {
  const opaque = createOpaqueToken(prefix);
  return {
    id: crypto.randomUUID(),
    token: opaque.token,
    tokenHash: opaque.tokenHash,
    expiresAt: new Date(now.getTime() + durationMs),
  };
}

export function createMobileSessionTokens(now = new Date()): {
  id: string;
  accessToken: string;
  accessTokenHash: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
} {
  const access = createOpaqueToken("sda");
  const refresh = createOpaqueToken("sdr");
  return {
    id: crypto.randomUUID(),
    accessToken: access.token,
    accessTokenHash: access.tokenHash,
    accessExpiresAt: new Date(now.getTime() + MOBILE_ACCESS_DURATION_MS),
    refreshToken: refresh.token,
    refreshTokenHash: refresh.tokenHash,
    refreshExpiresAt: new Date(now.getTime() + MOBILE_REFRESH_DURATION_MS),
  };
}

export function createEmailVerificationToken(now = new Date()) {
  return createAuthFlowToken("sdv", EMAIL_VERIFICATION_DURATION_MS, now);
}

export function createPasswordResetToken(now = new Date()) {
  return createAuthFlowToken("sdp", PASSWORD_RESET_DURATION_MS, now);
}

export function isValidMobileDeviceId(value: unknown): value is string {
  return typeof value === "string" && MOBILE_DEVICE_ID_PATTERN.test(value);
}

export function isValidMobileAccessToken(value: unknown): value is string {
  return typeof value === "string" && MOBILE_ACCESS_TOKEN_PATTERN.test(value);
}

export function isValidMobileRefreshToken(value: unknown): value is string {
  return typeof value === "string" && MOBILE_REFRESH_TOKEN_PATTERN.test(value);
}

export function isValidEmailVerificationToken(value: unknown): value is string {
  return typeof value === "string" && EMAIL_VERIFICATION_TOKEN_PATTERN.test(value);
}

export function isValidPasswordResetToken(value: unknown): value is string {
  return typeof value === "string" && PASSWORD_RESET_TOKEN_PATTERN.test(value);
}

export function validatePasswordStrength(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Password must be at least 12 characters.");
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    errors.push("Password must include upper-case, lower-case, and numeric characters.");
  }
  if (password.length > 1024) errors.push("Password must be 1024 characters or fewer.");
  return errors;
}
