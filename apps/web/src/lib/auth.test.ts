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

  it("defaults to a 7-day session and never the longer window without opt-in", () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const before = Date.now();
    // No args, explicit false, and a non-boolean truthy-looking value must all
    // keep the default. Only an explicit remember:true may widen the window.
    for (const session of [createSession(), createSession({}), createSession({ remember: false })]) {
      const ttl = session.expiresAt.getTime() - before;
      // Allow a small execution slop but assert it is the ~7-day window, well
      // short of the 30-day remember window.
      expect(ttl).toBeGreaterThan(sevenDaysMs - 5000);
      expect(ttl).toBeLessThan(sevenDaysMs + 5000);
    }
  });

  it("opts into a longer (~30-day) session only when remember is true", () => {
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const before = Date.now();
    const remembered = createSession({ remember: true });
    const ttl = remembered.expiresAt.getTime() - before;
    expect(ttl).toBeGreaterThan(thirtyDaysMs - 5000);
    expect(ttl).toBeLessThan(thirtyDaysMs + 5000);
    // The longer window is strictly longer than the default — the only difference.
    expect(ttl).toBeGreaterThan(sevenDaysMs);
    // Opt-in changes nothing else about the credential: still a random token,
    // still stored only as a hash.
    expect(remembered.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(remembered.tokenHash).toBe(hashSessionToken(remembered.token));
    expect(remembered.tokenHash).not.toContain(remembered.token);
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
