import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-email", () => ({
  confirmPasswordResetToken: vi.fn(),
}));

import { confirmPasswordResetToken } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

let POST: typeof import("./route").POST;

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/auth/password-reset/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetRateLimitStoreForTests();
  ({ POST } = await import("./route"));
}, 60000);

describe("password reset confirm route", () => {
  it("rejects cross-site requests before reading the body", async () => {
    const response = await POST(
      postRequest({ token: "x", password: "LongEnough123" }, { origin: "https://evil.example" }),
    );
    expect(response.status).toBe(403);
    expect(confirmPasswordResetToken).not.toHaveBeenCalled();
  });

  it("rejects a non-JSON body with 400", async () => {
    const response = await POST(postRequest("{not json"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request body must be valid JSON." });
    expect(confirmPasswordResetToken).not.toHaveBeenCalled();
  });

  it("rejects invalid tokens", async () => {
    vi.mocked(confirmPasswordResetToken).mockResolvedValue({ state: "invalid" });
    const response = await POST(postRequest({ token: "invalid-token", password: "LongEnough123" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      state: "invalid",
      error: "This reset link is invalid.",
    });
  });

  it("surfaces password validation errors with a 400", async () => {
    vi.mocked(confirmPasswordResetToken).mockResolvedValue({
      state: "validation_error",
      errors: ["Use at least 12 characters.", "Add a number."],
    });
    const response = await POST(postRequest({ token: "good-token", password: "short" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      state: "validation_error",
      error: "Use at least 12 characters.",
      errors: ["Use at least 12 characters.", "Add a number."],
    });
  });

  it("completes a reset and tells the member other devices were signed out", async () => {
    vi.mocked(confirmPasswordResetToken).mockResolvedValue({ state: "reset" });
    const response = await POST(postRequest({ token: "good-token", password: "LongEnough123" }));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      state: "reset",
      message: "Password updated. Other signed-in devices were signed out.",
    });
    expect(confirmPasswordResetToken).toHaveBeenCalledWith("good-token", "LongEnough123");
  });

  it("returns 410 for an expired reset token", async () => {
    vi.mocked(confirmPasswordResetToken).mockResolvedValue({ state: "expired" });
    const response = await POST(postRequest({ token: "expired-token", password: "LongEnough123" }));
    expect(response.status).toBe(410);
    await expect(response.json()).resolves.toEqual({
      state: "expired",
      error: "This reset link expired. Request a new one.",
    });
  });

  it("returns 503 when the database is not configured", async () => {
    vi.mocked(confirmPasswordResetToken).mockRejectedValue(new DatabaseNotConfiguredError());
    const response = await POST(postRequest({ token: "good-token", password: "LongEnough123" }));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      state: "unavailable",
      error: "Password reset is not connected yet. Please try again later.",
    });
  });
});
