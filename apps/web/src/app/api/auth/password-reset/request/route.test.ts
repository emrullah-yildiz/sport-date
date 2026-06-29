import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let POST: typeof import("./route").POST;

beforeAll(async () => {
  ({ POST } = await import("./route"));
});

describe("password reset request route", () => {
  it("returns a neutral success response without revealing account existence", async () => {
    const response = await POST(
      new Request("https://sportdate.example/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "ana@example.com" }),
      }),
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: "If an account exists for that email, password reset instructions will be sent when delivery is configured.",
    });
  });

  it("rejects malformed email input", async () => {
    const response = await POST(
      new Request("https://sportdate.example/api/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "invalid" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Enter a valid email address." });
  });
});
