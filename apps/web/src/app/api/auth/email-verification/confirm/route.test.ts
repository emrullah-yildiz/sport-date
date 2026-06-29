import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-email", () => ({
  confirmEmailVerificationToken: vi.fn(),
}));

import { confirmEmailVerificationToken } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

let POST: typeof import("./route").POST;

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/auth/email-verification/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  resetRateLimitStoreForTests();
  ({ POST } = await import("./route"));
}, 60000);

describe("email verification confirm route", () => {
  it("rejects cross-site requests before reading the body", async () => {
    const response = await POST(postRequest({ token: "x" }, { origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(confirmEmailVerificationToken).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body with 400", async () => {
    const response = await POST(postRequest("{not json"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request body must be valid JSON." });
    expect(confirmEmailVerificationToken).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens", async () => {
    vi.mocked(confirmEmailVerificationToken).mockResolvedValue({ state: "invalid" });
    const response = await POST(postRequest({ token: "invalid-token" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      state: "invalid",
      error: "This verification link is invalid.",
    });
  });

  it("confirms a valid token", async () => {
    vi.mocked(confirmEmailVerificationToken).mockResolvedValue({ state: "verified" });
    const response = await POST(postRequest({ token: "  good-token  " }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      state: "verified",
      message: "Email verified.",
    });
    // The route trims the submitted token before handing it to the core.
    expect(confirmEmailVerificationToken).toHaveBeenCalledWith("good-token");
  });

  it("acknowledges an already-verified token without re-running side effects", async () => {
    vi.mocked(confirmEmailVerificationToken).mockResolvedValue({ state: "already_verified" });
    const response = await POST(postRequest({ token: "good-token" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      state: "already_verified",
      message: "Email was already verified.",
    });
  });

  it("returns 410 for an expired token", async () => {
    vi.mocked(confirmEmailVerificationToken).mockResolvedValue({ state: "expired" });
    const response = await POST(postRequest({ token: "expired-token" }));
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      state: "expired",
      error: "This verification link expired. Request a new one.",
    });
  });

  it("returns 503 when the database is not configured", async () => {
    vi.mocked(confirmEmailVerificationToken).mockRejectedValue(new DatabaseNotConfiguredError());
    const response = await POST(postRequest({ token: "good-token" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      state: "unavailable",
      error: "Verification is not connected yet. Please try again later.",
    });
  });
});
