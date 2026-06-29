import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-email", () => ({
  requestPasswordResetTokenForEmail: vi.fn(),
}));

import { requestPasswordResetTokenForEmail } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

let POST: typeof import("./route").POST;

const NEUTRAL_MESSAGE =
  "If an account exists for that email, password reset instructions will be sent when delivery is configured.";

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  await resetRateLimitStoreForTests();
  vi.mocked(requestPasswordResetTokenForEmail).mockResolvedValue({} as never);
  ({ POST } = await import("./route"));
}, 60000);

describe("password reset request route", () => {
  it("rejects cross-site requests before any token work", async () => {
    const response = await POST(postRequest({ email: "ana@example.com" }, { origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
  });

  it("returns a neutral success response without revealing account existence", async () => {
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
    expect(requestPasswordResetTokenForEmail).toHaveBeenCalledTimes(1);
  });

  it("returns the identical response whether or not the account exists (enumeration neutrality)", async () => {
    // The core resolves regardless of whether a matching user row was found.
    const existing = await POST(postRequest({ email: "real@example.com" }));
    const missing = await POST(postRequest({ email: "nobody@example.com" }));

    expect(existing.status).toBe(missing.status);
    await expect(existing.json()).resolves.toEqual(await missing.json());
  });

  it("rejects malformed email input", async () => {
    const response = await POST(postRequest({ email: "invalid" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Enter a valid email address." });
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
  });

  it("stays neutral even when the database is not configured", async () => {
    vi.mocked(requestPasswordResetTokenForEmail).mockRejectedValue(new DatabaseNotConfiguredError());
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
  });

  it("stays neutral even when token preparation throws unexpectedly", async () => {
    vi.mocked(requestPasswordResetTokenForEmail).mockRejectedValue(new Error("boom"));
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
  });
});
