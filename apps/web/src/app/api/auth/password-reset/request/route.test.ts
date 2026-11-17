import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth-email", () => ({
  requestPasswordResetTokenForEmail: vi.fn(),
}));
vi.mock("next/server", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/server")>(),
  after: vi.fn(),
}));

import { after } from "next/server";
import { requestPasswordResetTokenForEmail } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { resetRateLimitStoreForTests } from "@/lib/rate-limit";

let POST: typeof import("./route").POST;
const scheduledTasks: Array<() => unknown> = [];

const NEUTRAL_MESSAGE =
  "If an account exists for that email, check your inbox for a password reset link.";

function postRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://sportdate.example/api/auth/password-reset/request", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body ?? {}),
  });
}

beforeEach(async () => {
  vi.clearAllMocks();
  scheduledTasks.length = 0;
  vi.mocked(after).mockImplementation((task) => {
    if (typeof task !== "function") throw new Error("Expected a deferred reset callback.");
    scheduledTasks.push(task);
  });
  await resetRateLimitStoreForTests();
  vi.mocked(requestPasswordResetTokenForEmail).mockResolvedValue({} as never);
  ({ POST } = await import("./route"));
}, 60000);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("password reset request route", () => {
  it("rejects cross-site requests before any token work", async () => {
    const response = await POST(postRequest({ email: "ana@example.com" }, { origin: "https://evil.example" }));
    expect(response.status).toBe(403);
    expect(after).not.toHaveBeenCalled();
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
  });

  it("returns a neutral success response without revealing account existence", async () => {
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
    expect(after).toHaveBeenCalledOnce();
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
    await scheduledTasks[0]();
    expect(requestPasswordResetTokenForEmail).toHaveBeenCalledTimes(1);
  });

  it("returns the response while the deferred reset core remains unresolved", async () => {
    let finishCore!: (value: Awaited<ReturnType<typeof requestPasswordResetTokenForEmail>>) => void;
    vi.mocked(requestPasswordResetTokenForEmail).mockReturnValue(new Promise((resolve) => {
      finishCore = resolve;
    }));

    const response = await POST(postRequest({ email: "member@example.invalid" }));
    expect(response.status).toBe(202);
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();

    let workFinished = false;
    const backgroundWork = Promise.resolve(scheduledTasks[0]()).then(() => { workFinished = true; });
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
    expect(requestPasswordResetTokenForEmail).toHaveBeenCalledOnce();
    expect(workFinished).toBe(false);

    finishCore({} as never);
    await backgroundWork;
    expect(workFinished).toBe(true);
  });

  it("captures the requester IP before returning and running deferred work", async () => {
    const request = postRequest({ email: "member@example.invalid" }, { "x-forwarded-for": "203.0.113.7" });
    await POST(request);
    request.headers.set("x-forwarded-for", "198.51.100.9");

    await scheduledTasks[0]();
    expect(requestPasswordResetTokenForEmail).toHaveBeenCalledWith("member@example.invalid", "203.0.113.7");
  });

  it("returns the identical response whether or not the account exists (enumeration neutrality)", async () => {
    // Delivery occurs only for an active account with a persisted token, but
    // neither the response status nor its body reveals which path ran.
    vi.mocked(requestPasswordResetTokenForEmail)
      .mockResolvedValueOnce({ delivery: { state: "sent", messageId: "mock-message" } } as never)
      .mockResolvedValueOnce({ delivery: { state: "ready", draft: null, messageId: null } } as never);
    const existing = await POST(postRequest({ email: "real@example.com" }));
    const missing = await POST(postRequest({ email: "nobody@example.com" }));

    expect(existing.status).toBe(missing.status);
    await expect(existing.json()).resolves.toEqual(await missing.json());
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
    for (const task of scheduledTasks) await task();
    expect(requestPasswordResetTokenForEmail).toHaveBeenCalledTimes(2);
  });

  it("rejects malformed email input", async () => {
    const response = await POST(postRequest({ email: "invalid" }));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Enter a valid email address." });
    expect(after).not.toHaveBeenCalled();
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
  });

  it("does not queue additional work after the request rate limit is reached", async () => {
    for (let index = 0; index < 3; index += 1) {
      expect((await POST(postRequest({ email: "limited@example.invalid" }))).status).toBe(202);
    }
    const limited = await POST(postRequest({ email: "limited@example.invalid" }));
    expect(limited.status).toBe(429);
    expect(after).toHaveBeenCalledTimes(3);
    expect(requestPasswordResetTokenForEmail).not.toHaveBeenCalled();
  });

  it("catches a missing database configuration inside the background callback", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(requestPasswordResetTokenForEmail).mockRejectedValue(new DatabaseNotConfiguredError());
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
    await expect(scheduledTasks[0]()).resolves.toBeUndefined();
    expect(errorLog).not.toHaveBeenCalled();
  });

  it.each(["Database request failed.", "Gmail authorization failed.", "Gmail delivery failed."])("catches and privately logs background failure: %s", async (message) => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error(message);
    vi.mocked(requestPasswordResetTokenForEmail).mockRejectedValue(error);
    const response = await POST(postRequest({ email: "ana@example.com" }));
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ success: true, message: NEUTRAL_MESSAGE });
    await expect(scheduledTasks[0]()).resolves.toBeUndefined();
    expect(errorLog).toHaveBeenCalledWith("Password reset request failed:", error);
  });
});
