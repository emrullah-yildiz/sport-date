import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gmail-email-delivery", () => ({ sendGmailEmail: vi.fn().mockResolvedValue({ messageId: "gmail-message-1" }) }));

import { dispatchAuthEmail, canSendAuthEmails, resolveAuthEmailProvider } from "./auth-email-delivery";

const draft = {
  kind: "email_verification" as const,
  to: "ana@example.com",
  subject: "Verify your KeepItUp email",
  html: "<p>hi</p>",
  text: "hi",
  actionUrl: "https://sportdate.example/verify-email?token=sdv_example",
  expiresAt: "2026-07-01T10:00:00.000Z",
  metadata: {
    flow: "email_verification" as const,
    expiresAt: "2026-07-01T10:00:00.000Z",
  },
};

const gmailEnv = {
  EMAIL_DELIVERY_ENABLED: "true",
  EMAIL_DELIVERY_PROVIDER: "gmail",
  GMAIL_CLIENT_ID: "client-id",
  GMAIL_CLIENT_SECRET: "client-secret",
  GMAIL_REFRESH_TOKEN: "refresh-token",
  GMAIL_SENDER_EMAIL: "support@keepitup.social",
};

describe("auth email delivery", () => {
  it("stays disabled by default", () => {
    expect(resolveAuthEmailProvider({})).toBe("disabled");
    expect(canSendAuthEmails({})).toBe(false);
  });

  it("enables the console adapter only when explicitly configured", () => {
    expect(resolveAuthEmailProvider({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "console" })).toBe("console");
    expect(canSendAuthEmails({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "console" })).toBe(true);
    expect(resolveAuthEmailProvider({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "unknown" })).toBe("disabled");
  });

  it("enables Gmail only when every credential and the sender alias are configured", () => {
    expect(resolveAuthEmailProvider(gmailEnv)).toBe("gmail");
    expect(canSendAuthEmails(gmailEnv)).toBe(true);
    expect(resolveAuthEmailProvider({ ...gmailEnv, GMAIL_REFRESH_TOKEN: "" })).toBe("disabled");
  });

  it("simulates delivery through the console adapter without external network calls", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});

    const result = await dispatchAuthEmail(draft, {
      EMAIL_DELIVERY_ENABLED: "true",
      EMAIL_DELIVERY_PROVIDER: "console",
    });

    expect(result.state).toBe("simulated");
    expect(result.provider).toBe("console");
    expect(result.messageId).toMatch(/^sim_email_verification_/);
    expect(info).toHaveBeenCalledOnce();

    info.mockRestore();
  });

  it("reports a real Gmail dispatch as sent", async () => {
    await expect(dispatchAuthEmail(draft, gmailEnv)).resolves.toEqual({ state: "sent", provider: "gmail", messageId: "gmail-message-1" });
  });
});
