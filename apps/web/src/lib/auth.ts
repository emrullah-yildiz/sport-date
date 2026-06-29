import crypto from "node:crypto";

import bcrypt from "bcryptjs";

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const MOBILE_ACCESS_DURATION_MS = 15 * 60 * 1000;
const MOBILE_REFRESH_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const MOBILE_DEVICE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MOBILE_ACCESS_TOKEN_PATTERN = /^sda_[A-Za-z0-9_-]{43}$/;
const MOBILE_REFRESH_TOKEN_PATTERN = /^sdr_[A-Za-z0-9_-]{43}$/;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token, "utf8").digest("hex");
}

export function createSession(): {
  id: string;
  token: string;
  tokenHash: string;
  expiresAt: Date;
} {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    id: crypto.randomUUID(),
    token,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  };
}

function createOpaqueToken(prefix: "sda" | "sdr") {
  const token = `${prefix}_${crypto.randomBytes(32).toString("base64url")}`;
  return { token, tokenHash: hashSessionToken(token) };
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

export function isValidMobileDeviceId(value: unknown): value is string {
  return typeof value === "string" && MOBILE_DEVICE_ID_PATTERN.test(value);
}

export function isValidMobileAccessToken(value: unknown): value is string {
  return typeof value === "string" && MOBILE_ACCESS_TOKEN_PATTERN.test(value);
}

export function isValidMobileRefreshToken(value: unknown): value is string {
  return typeof value === "string" && MOBILE_REFRESH_TOKEN_PATTERN.test(value);
}
