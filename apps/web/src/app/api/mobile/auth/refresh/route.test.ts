import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let POST: typeof import("./route").POST;
let resetRateLimitStoreForTests: typeof import("../../../../../lib/rate-limit").resetRateLimitStoreForTests;

beforeAll(async () => {
  ({ POST } = await import("./route"));
  ({ resetRateLimitStoreForTests } = await import("../../../../../lib/rate-limit"));
});

afterEach(() => {
  resetRateLimitStoreForTests();
});

describe("mobile refresh rate limiting", () => {
  it("returns 429 after repeated invalid refresh attempts from the same device", async () => {
    const request = () =>
      new Request("https://sportdate.example/api/mobile/auth/refresh", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sport-Date-Client": "mobile-v1",
          "X-Forwarded-For": "198.51.100.30",
        },
        body: JSON.stringify({
          deviceId: "2c3b5c84-6926-4ba6-b926-5ceaf9e01399",
          refreshToken: "sdr_invalid",
        }),
      });

    for (let attempt = 0; attempt < 30; attempt += 1) {
      const response = await POST(request());
      expect(response.status).toBe(401);
    }

    const limited = await POST(request());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("retry-after")).toBeTruthy();
    await expect(limited.json()).resolves.toMatchObject({
      error: "Too many session refresh attempts. Please sign in again in a few minutes.",
    });
  });
});
