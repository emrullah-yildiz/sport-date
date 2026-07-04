import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/gmail-email-delivery", () => ({ sendGmailEmail: vi.fn() }));

import { sendGmailEmail } from "@/lib/gmail-email-delivery";
import { POST } from "./route";

function request(secret = "test-secret") {
  return new Request("https://keepitup.social/api/internal/email-mock", {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
}

describe("POST /api/internal/email-mock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "test-secret";
    process.env.EMAIL_TEST_RECIPIENT = "owner@example.test";
  });

  it("fails closed without the internal bearer secret", async () => {
    expect((await POST(request("wrong"))).status).toBe(401);
    expect(sendGmailEmail).not.toHaveBeenCalled();
  });

  it("sends a clearly marked mock with the shared attendance template", async () => {
    vi.mocked(sendGmailEmail).mockResolvedValue({ messageId: "message-1" });
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(sendGmailEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "owner@example.test",
      subject: expect.stringContaining("[Mockup]"),
      html: expect.stringMatching(/>Approve<[\s\S]*>Cancel</),
    }), expect.objectContaining({
      env: expect.objectContaining({ EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "gmail" }),
    }));
  });
});
