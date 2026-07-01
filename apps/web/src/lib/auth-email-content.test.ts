import { describe, expect, it } from "vitest";

import {
  buildEmailVerificationDraft,
  buildPasswordResetDraft,
  composeAuthActionUrl,
  resolveAuthEmailOrigin,
} from "./auth-email-content";

describe("auth email content", () => {
  it("resolves a canonical public origin from environment values", () => {
    expect(resolveAuthEmailOrigin({ APP_BASE_URL: "https://sportdate.example/app?ignored=yes" })).toBe("https://sportdate.example");
    expect(resolveAuthEmailOrigin({ NEXT_PUBLIC_APP_URL: "https://beta.sportdate.example/" })).toBe("https://beta.sportdate.example");
    expect(resolveAuthEmailOrigin({ APP_BASE_URL: "mailto:test@example.com", SITE_URL: "https://fallback.example" })).toBe("https://fallback.example");
  });

  it("builds verification links on the public auth routes", () => {
    expect(composeAuthActionUrl("https://sportdate.example", "/verify-email", "sdv_token")).toBe(
      "https://sportdate.example/verify-email?token=sdv_token",
    );
    expect(composeAuthActionUrl("https://sportdate.example", "/reset-password", "sdp_token")).toBe(
      "https://sportdate.example/reset-password?token=sdp_token",
    );
  });

  it("creates a verification draft with secure copy and the action link", () => {
    const draft = buildEmailVerificationDraft({
      origin: "https://sportdate.example",
      email: "ana@example.com",
      token: "sdv_example",
      expiresAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    expect(draft.kind).toBe("email_verification");
    expect(draft.subject).toBe("Verify your Rally email");
    expect(draft.actionUrl).toBe("https://sportdate.example/verify-email?token=sdv_example");
    expect(draft.text).toContain("ignore this email");
    expect(draft.text).not.toContain("identity verification");
    expect(draft.html).toContain("Verify email");
  });

  it("creates a reset draft that promises no change until completion", () => {
    const draft = buildPasswordResetDraft({
      origin: "https://sportdate.example",
      email: "ana@example.com",
      token: "sdp_example",
      expiresAt: new Date("2026-07-01T10:00:00.000Z"),
    });

    expect(draft.kind).toBe("password_reset");
    expect(draft.subject).toBe("Reset your Rally password");
    expect(draft.actionUrl).toBe("https://sportdate.example/reset-password?token=sdp_example");
    expect(draft.text).toContain("Nothing changes unless you complete the reset form");
    expect(draft.html).toContain("Choose a new password");
  });
});
