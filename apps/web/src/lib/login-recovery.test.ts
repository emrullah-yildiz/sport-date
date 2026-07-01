import { describe, expect, it } from "vitest";

import {
  formatRateLimitMessage,
  interpretLoginFailure,
  parseRetryAfterSeconds,
} from "./login-recovery";

// Pins the login rate-limit recovery state
// (CX-20260701-login-rate-limited-state-no-recovery-guidance): a 429 must
// surface a calm wait time from the server's Retry-After, trigger a cool-down
// that disables the submit button, and point at password reset — while every
// other failure (incl. the anti-enumeration 401) passes the server copy
// through unchanged. Live 429 reproduction is IP-limited, so this is the
// authoritative check for the parsing + state.

function makeResponse(status: number, retryAfter: string | null): Pick<Response, "status"> & { headers: Pick<Headers, "get"> } {
  return {
    status,
    headers: { get: (name: string) => (name.toLowerCase() === "retry-after" ? retryAfter : null) },
  };
}

describe("parseRetryAfterSeconds", () => {
  it("reads the delta-seconds form the limiter sends", () => {
    expect(parseRetryAfterSeconds("518")).toBe(518);
    expect(parseRetryAfterSeconds(" 60 ")).toBe(60);
  });

  it("returns 0 when the header is absent or unparseable", () => {
    expect(parseRetryAfterSeconds(null)).toBe(0);
    expect(parseRetryAfterSeconds("")).toBe(0);
    expect(parseRetryAfterSeconds("soon")).toBe(0);
  });

  it("clamps a very large or negative value to a sane range", () => {
    expect(parseRetryAfterSeconds("999999")).toBe(30 * 60);
    expect(parseRetryAfterSeconds("-10")).toBe(0);
  });

  it("tolerates the HTTP-date form relative to now", () => {
    const now = Date.parse("2026-07-01T12:00:00.000Z");
    expect(parseRetryAfterSeconds("Wed, 01 Jul 2026 12:02:00 GMT", now)).toBe(120);
  });
});

describe("formatRateLimitMessage", () => {
  it("rounds up to whole minutes and stays calm and blame-free", () => {
    expect(formatRateLimitMessage(518)).toBe("Too many attempts — you can try again in about 9 minutes.");
    expect(formatRateLimitMessage(60)).toBe("Too many attempts — you can try again in about 1 minute.");
  });

  it("uses a soft phrase for sub-minute and unknown waits", () => {
    expect(formatRateLimitMessage(30)).toBe("Too many attempts — you can try again in less than a minute.");
    expect(formatRateLimitMessage(0)).toBe("Too many attempts. Please wait a little while before trying again.");
  });

  it("never dumps raw seconds", () => {
    expect(formatRateLimitMessage(518)).not.toMatch(/\d+ ?s(econds)?/);
  });
});

describe("interpretLoginFailure", () => {
  it("turns a 429 into a wait time, a cool-down, and a recovery suggestion", () => {
    const failure = interpretLoginFailure(
      makeResponse(429, "518"),
      { error: "Too many login attempts. Please wait before trying again." },
    );
    expect(failure.cooldownSeconds).toBe(518);
    expect(failure.suggestRecovery).toBe(true);
    expect(failure.message).toBe("Too many attempts — you can try again in about 9 minutes.");
  });

  it("still shows a calm 429 message when the Retry-After header is missing", () => {
    const failure = interpretLoginFailure(makeResponse(429, null), { error: "Too many login attempts." });
    expect(failure.cooldownSeconds).toBe(0);
    expect(failure.suggestRecovery).toBe(true);
    expect(failure.message).toBe("Too many attempts. Please wait a little while before trying again.");
  });

  it("passes the generic 401 through unchanged so anti-enumeration is preserved", () => {
    const failure = interpretLoginFailure(makeResponse(401, null), { error: "Email or password is incorrect." });
    expect(failure.message).toBe("Email or password is incorrect.");
    expect(failure.cooldownSeconds).toBe(0);
    expect(failure.suggestRecovery).toBe(false);
  });

  it("does not read Retry-After on non-429 failures (no cool-down leaks in)", () => {
    const failure = interpretLoginFailure(makeResponse(401, "518"), { error: "Email or password is incorrect." });
    expect(failure.cooldownSeconds).toBe(0);
    expect(failure.suggestRecovery).toBe(false);
  });

  it("falls back to a safe message when the body has no usable error", () => {
    expect(interpretLoginFailure(makeResponse(500, null), null).message).toBe("Login failed.");
    expect(interpretLoginFailure(makeResponse(503, null), { error: 42 }).message).toBe("Login failed.");
  });
});
