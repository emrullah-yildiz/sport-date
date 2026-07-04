import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-email", () => ({
  issueEmailVerificationTokenForUser: vi.fn(),
}));
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { issueEmailVerificationTokenForUser } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

let POST: typeof import("./route").POST;

const SIGNED_IN_USER = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "ana@example.com",
};

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/auth/email-verification/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body ?? {}),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetRateLimitStoreForTests();
  ({ POST } = await import("./route"));
}, 60000);

describe("email verification request route", () => {
  it("rejects cross-site requests before authenticating", async () => {
    const response = await POST(postRequest({}, { origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(getCurrentUser).not.toHaveBeenCalled();
    expect(issueEmailVerificationTokenForUser).not.toHaveBeenCalled();
  });

  it("requires authentication", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const response = await POST(postRequest({}));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Authentication required." });
    expect(issueEmailVerificationTokenForUser).not.toHaveBeenCalled();
  });

  it("prepares delivery and reports the disabled provider state for a fresh token", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(SIGNED_IN_USER as never);
    vi.mocked(issueEmailVerificationTokenForUser).mockResolvedValue({
      state: "created",
      delivery: { state: "unconfigured", origin: null, draft: null, provider: "disabled", messageId: null },
    } as never);

    const response = await POST(postRequest({}));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      delivery: "unconfigured",
      message:
        "A verification flow has been prepared. Delivery remains disabled until an approved email provider is configured.",
    });
    expect(issueEmailVerificationTokenForUser).toHaveBeenCalledWith(SIGNED_IN_USER.id, SIGNED_IN_USER.email);
  });

  it("reports successful Gmail delivery without exposing provider credentials", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(SIGNED_IN_USER as never);
    vi.mocked(issueEmailVerificationTokenForUser).mockResolvedValue({
      state: "created",
      delivery: { state: "sent", origin: "https://keepitup.social", draft: null, provider: "gmail", messageId: "gmail-1" },
    } as never);

    const response = await POST(postRequest({}));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      delivery: "sent",
      message: "Verification instructions were sent to your email address.",
    });
  });

  it("acknowledges an already-verified account without exposing token internals", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(SIGNED_IN_USER as never);
    vi.mocked(issueEmailVerificationTokenForUser).mockResolvedValue({
      state: "already_verified",
      delivery: { state: "unconfigured", origin: null, draft: null, provider: "disabled", messageId: null },
    } as never);

    const response = await POST(postRequest({}));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "This email address is already verified.",
    });
  });

  it("returns 503 when the database is not configured", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(SIGNED_IN_USER as never);
    vi.mocked(issueEmailVerificationTokenForUser).mockRejectedValue(new DatabaseNotConfiguredError());

    const response = await POST(postRequest({}));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Verification is not connected yet. Please try again later.",
    });
  });

  it("returns 429 once the per-user request rate limit is exhausted", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(SIGNED_IN_USER as never);
    vi.mocked(issueEmailVerificationTokenForUser).mockResolvedValue({
      state: "created",
      delivery: { state: "unconfigured", origin: null, draft: null, provider: "disabled", messageId: null },
    } as never);

    // The hourly per-user rule allows 3 requests; the fourth must be throttled.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const ok = await POST(postRequest({}));
      expect(ok.status).toBe(202);
    }

    const throttled = await POST(postRequest({}));
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("Retry-After")).toBeTruthy();
  });
});
