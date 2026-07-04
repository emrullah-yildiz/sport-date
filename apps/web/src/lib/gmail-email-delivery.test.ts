import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { buildGmailRawMessage, sendGmailEmail } from "./gmail-email-delivery";

const env = {
  EMAIL_DELIVERY_ENABLED: "true",
  EMAIL_DELIVERY_PROVIDER: "gmail",
  GMAIL_CLIENT_ID: "client-id",
  GMAIL_CLIENT_SECRET: "client-secret",
  GMAIL_REFRESH_TOKEN: "refresh-token",
  GMAIL_SENDER_EMAIL: "support@keepitup.social",
  GMAIL_SENDER_NAME: "KeepItUp",
  GMAIL_REPLY_TO: "support@keepitup.social",
};

const draft = { to: "ana@example.com", subject: "Reset your KeepItUp password", text: "Reset safely", html: "<p>Reset safely</p>" };

describe("Gmail transactional delivery", () => {
  it("builds a multipart message from the verified support alias", () => {
    const raw = buildGmailRawMessage(draft, env);
    expect(raw).toContain("From: KeepItUp <support@keepitup.social>");
    expect(raw).toContain("Reply-To: support@keepitup.social");
    expect(raw).toContain("To: ana@example.com");
    expect(raw).toContain("multipart/alternative");
    expect(raw).not.toContain("client-secret");
    expect(raw).not.toContain("refresh-token");
  });

  it("exchanges the refresh token and sends a base64url MIME message", async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "short-lived-access" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "gmail-123" }), { status: 200 }));

    await expect(sendGmailEmail(draft, { env, fetchImpl: fetchImpl as typeof fetch })).resolves.toEqual({ messageId: "gmail-123" });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://oauth2.googleapis.com/token");
    expect(String(fetchImpl.mock.calls[0][1].body)).toContain("grant_type=refresh_token");
    expect(fetchImpl.mock.calls[1][0]).toBe("https://gmail.googleapis.com/gmail/v1/users/me/messages/send");
    expect(fetchImpl.mock.calls[1][1].headers).toMatchObject({ Authorization: "Bearer short-lived-access" });
    const payload = JSON.parse(String(fetchImpl.mock.calls[1][1].body)) as { raw: string };
    const mime = Buffer.from(payload.raw, "base64url").toString("utf8");
    expect(mime).toContain("To: ana@example.com");
  });

  it("fails closed before sending when token exchange fails", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response("no", { status: 401 }));
    await expect(sendGmailEmail(draft, { env, fetchImpl: fetchImpl as typeof fetch })).rejects.toThrow("Gmail authorization failed");
    expect(fetchImpl).toHaveBeenCalledOnce();
  });
});
