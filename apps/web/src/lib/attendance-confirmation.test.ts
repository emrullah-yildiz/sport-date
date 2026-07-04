import { describe, expect, it, vi } from "vitest";

import {
  ATTENDANCE_REMINDER_WINDOW_MS,
  attendanceTokenExpired,
  buildAttendanceReminderEmail,
  canSendAttendanceEmails,
  dispatchAttendanceReminderEmail,
  generateAttendanceToken,
  hashAttendanceToken,
  isWithinReminderWindow,
  resolveAttendanceEmailProvider,
} from "./attendance-confirmation";

const NOW = new Date("2026-08-15T12:00:00.000Z");
const gmailEnv = { EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "gmail", GMAIL_CLIENT_ID: "id", GMAIL_CLIENT_SECRET: "secret", GMAIL_REFRESH_TOKEN: "refresh", GMAIL_SENDER_EMAIL: "support@keepitup.social" };

describe("reminder window + token expiry", () => {
  it("is in-window only for a future start within the next 2 hours", () => {
    expect(isWithinReminderWindow("2026-08-15T13:00:00.000Z", NOW)).toBe(true); // +1h
    expect(isWithinReminderWindow("2026-08-15T13:59:00.000Z", NOW)).toBe(true); // +~2h
    expect(isWithinReminderWindow("2026-08-15T14:30:00.000Z", NOW)).toBe(false); // +2.5h — too early
    expect(isWithinReminderWindow("2026-08-15T11:59:00.000Z", NOW)).toBe(false); // already started
    expect(isWithinReminderWindow("not-a-date", NOW)).toBe(false);
    expect(ATTENDANCE_REMINDER_WINDOW_MS).toBe(2 * 60 * 60 * 1000);
  });

  it("expires a token exactly at event start", () => {
    expect(attendanceTokenExpired("2026-08-15T12:00:00.000Z", NOW)).toBe(true); // at start
    expect(attendanceTokenExpired("2026-08-15T12:00:01.000Z", NOW)).toBe(false); // 1s before
    expect(attendanceTokenExpired("bad", NOW)).toBe(true);
  });
});

describe("attendance tokens", () => {
  it("mints a URL-safe secret and a matching sha-256 hash, and only stores the hash", () => {
    const token = generateAttendanceToken();
    expect(token.raw).toMatch(/^[A-Za-z0-9_-]+$/); // base64url, no padding/query-breaking chars
    expect(token.raw.length).toBeGreaterThanOrEqual(40);
    expect(token.hash).toBe(hashAttendanceToken(token.raw));
    expect(token.hash).toMatch(/^[0-9a-f]{64}$/);
    // Two tokens never collide.
    expect(generateAttendanceToken().raw).not.toBe(generateAttendanceToken().raw);
  });
});

describe("dark email gate (fail closed)", () => {
  it("is disabled unless delivery is explicitly enabled AND a provider is chosen", () => {
    expect(resolveAttendanceEmailProvider({})).toBe("disabled");
    expect(resolveAttendanceEmailProvider({ EMAIL_DELIVERY_ENABLED: "true" })).toBe("disabled"); // no provider
    expect(resolveAttendanceEmailProvider({ EMAIL_DELIVERY_ENABLED: "false", EMAIL_DELIVERY_PROVIDER: "console" })).toBe("disabled");
    expect(resolveAttendanceEmailProvider({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "console" })).toBe("console");
    expect(canSendAttendanceEmails({})).toBe(false);
    expect(resolveAttendanceEmailProvider(gmailEnv)).toBe("gmail");
  });

  it("NEVER invokes the real sender while delivery is off (the dark no-op path)", async () => {
    const send = vi.fn();
    const log = vi.fn();
    const draft = buildAttendanceReminderEmail(baseInput());
    const result = await dispatchAttendanceReminderEmail(draft, { env: {}, send, log });
    expect(result).toEqual({ state: "disabled", provider: "disabled" });
    expect(send).not.toHaveBeenCalled();
  });

  it("simulates (console) without invoking the real sender either", async () => {
    const send = vi.fn();
    const log = vi.fn();
    const draft = buildAttendanceReminderEmail(baseInput());
    const result = await dispatchAttendanceReminderEmail(draft, {
      env: { EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "console" },
      send,
      log,
    });
    expect(result.state).toBe("simulated");
    expect(send).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalled();
  });

  it("invokes Gmail only after the complete fail-closed configuration resolves", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const result = await dispatchAttendanceReminderEmail(buildAttendanceReminderEmail(baseInput()), { env: gmailEnv, send });
    expect(result).toEqual({ state: "sent", provider: "gmail" });
    expect(send).toHaveBeenCalledOnce();
  });
});

function baseInput() {
  return {
    origin: "https://keepitup.social",
    eventId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    rawToken: "raw-token-value-1234567890",
    to: "ana@example.com",
    firstName: "Ana",
    sport: "Tennis",
    areaLabel: "Floreasca",
    city: "Bucharest",
    whenLabel: "Sat 15 Aug, 21:00",
  };
}

describe("buildAttendanceReminderEmail", () => {
  it("builds absolute confirm/cancel links to the tokenized routes and shows only the approximate area", () => {
    const draft = buildAttendanceReminderEmail(baseInput());
    expect(draft.confirmUrl).toBe("https://keepitup.social/e/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/confirm?t=raw-token-value-1234567890");
    expect(draft.cancelUrl).toBe("https://keepitup.social/e/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/cancel?t=raw-token-value-1234567890");
    expect(draft.text).toContain("Floreasca, Bucharest");
    expect(draft.html).toContain("support@keepitup.social");
    // No fake urgency, and it makes clear doing nothing keeps the place.
    expect(draft.text).toContain("If you do nothing, your place is kept");
    // Never leaks an exact venue — only the approximate area label is present.
    expect(draft.text).not.toMatch(/street|str\.|address|venue/i);
  });
});
