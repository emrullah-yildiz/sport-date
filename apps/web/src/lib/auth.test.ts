import { describe, expect, it } from "vitest";

import {
  createEmailVerificationToken,
  createMobileSessionTokens,
  createPasswordResetToken,
  createSession,
  hashPassword,
  hashSessionToken,
  isValidEmailVerificationToken,
  isValidMobileAccessToken,
  isValidMobileDeviceId,
  isValidMobileRefreshToken,
  isValidPasswordResetToken,
  validatePasswordStrength,
  verifyPassword,
} from "./auth";

describe("password security", () => {
  it("accepts the original password and rejects a different one", async () => {
    const hash = await hashPassword("A long private password 42");
    await expect(verifyPassword("A long private password 42", hash)).resolves.toBe(true);
    await expect(verifyPassword("A different password 42", hash)).resolves.toBe(false);
    expect(hash).not.toContain("A long private password 42");
  });
});

describe("opaque sessions", () => {
  it("creates unique random tokens and stores only deterministic hashes", () => {
    const first = createSession();
    const second = createSession();

    expect(first.token).not.toBe(second.token);
    expect(first.id).not.toBe(second.id);
    expect(first.tokenHash).toBe(hashSessionToken(first.token));
    expect(first.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("creates separate short access and rotating refresh credentials for mobile", () => {
    const now = new Date("2026-06-29T10:00:00.000Z");
    const mobile = createMobileSessionTokens(now);
    expect(mobile.accessToken).toMatch(/^sda_[A-Za-z0-9_-]{43}$/);
    expect(mobile.refreshToken).toMatch(/^sdr_[A-Za-z0-9_-]{43}$/);
    expect(mobile.accessTokenHash).toBe(hashSessionToken(mobile.accessToken));
    expect(mobile.refreshTokenHash).toBe(hashSessionToken(mobile.refreshToken));
    expect(mobile.accessExpiresAt.toISOString()).toBe("2026-06-29T10:15:00.000Z");
    expect(mobile.refreshExpiresAt.toISOString()).toBe("2026-07-29T10:00:00.000Z");
    expect(isValidMobileAccessToken(mobile.accessToken)).toBe(true);
    expect(isValidMobileRefreshToken(mobile.refreshToken)).toBe(true);
  });

  it("rejects swapped, malformed, and non-UUID mobile credentials", () => {
    const mobile = createMobileSessionTokens();
    expect(isValidMobileAccessToken(mobile.refreshToken)).toBe(false);
    expect(isValidMobileRefreshToken(mobile.accessToken)).toBe(false);
    expect(isValidMobileAccessToken("sda_short")).toBe(false);
    expect(isValidMobileDeviceId("device-1")).toBe(false);
    expect(isValidMobileDeviceId("2c3b5c84-6926-4ba6-b926-5ceaf9e01399")).toBe(true);
  });

  it("creates separate verification and password reset tokens", () => {
    const now = new Date("2026-06-29T10:00:00.000Z");
    const verification = createEmailVerificationToken(now);
    const reset = createPasswordResetToken(now);
    expect(verification.token).toMatch(/^sdv_[A-Za-z0-9_-]{43}$/);
    expect(reset.token).toMatch(/^sdp_[A-Za-z0-9_-]{43}$/);
    expect(verification.expiresAt.toISOString()).toBe("2026-06-30T10:00:00.000Z");
    expect(reset.expiresAt.toISOString()).toBe("2026-06-29T11:00:00.000Z");
    expect(isValidEmailVerificationToken(verification.token)).toBe(true);
    expect(isValidPasswordResetToken(reset.token)).toBe(true);
    expect(isValidEmailVerificationToken(reset.token)).toBe(false);
  });
});

describe("password strength boundary", () => {
  it("matches the registration password rules", () => {
    expect(validatePasswordStrength("short")).toContain("Password must be at least 12 characters.");
    expect(validatePasswordStrength("alllowercase123")).toContain(
      "Password must include upper-case, lower-case, and numeric characters.",
    );
    expect(validatePasswordStrength("LongEnough123")).toEqual([]);
  });
});
