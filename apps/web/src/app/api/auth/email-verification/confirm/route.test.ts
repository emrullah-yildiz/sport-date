import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let POST: typeof import("./route").POST;

beforeAll(async () => {
  ({ POST } = await import("./route"));
});

describe("email verification confirm route", () => {
  it("rejects invalid tokens before any database work", async () => {
    const response = await POST(
      new Request("https://sportdate.example/api/auth/email-verification/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: "invalid-token" }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "This verification link is invalid.",
    });
  });
});
