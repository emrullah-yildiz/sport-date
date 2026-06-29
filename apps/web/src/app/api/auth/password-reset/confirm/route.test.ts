import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let POST: typeof import("./route").POST;

beforeAll(async () => {
  ({ POST } = await import("./route"));
}, 20000);

describe("password reset confirm route", () => {
  it("rejects invalid tokens before any database work", async () => {
    const response = await POST(
      new Request("https://sportdate.example/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token", password: "LongEnough123" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      state: "invalid",
      error: "This reset link is invalid.",
    });
  });
});
