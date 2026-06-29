import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let consumeRateLimit: typeof import("./rate-limit").consumeRateLimit;
let enforceRateLimit: typeof import("./rate-limit").enforceRateLimit;
let getRequestIp: typeof import("./rate-limit").getRequestIp;
let normalizeRateLimitKeyPart: typeof import("./rate-limit").normalizeRateLimitKeyPart;
let resetRateLimitStoreForTests: typeof import("./rate-limit").resetRateLimitStoreForTests;

beforeAll(async () => {
  const mod = await import("./rate-limit");
  consumeRateLimit = mod.consumeRateLimit;
  enforceRateLimit = mod.enforceRateLimit;
  getRequestIp = mod.getRequestIp;
  normalizeRateLimitKeyPart = mod.normalizeRateLimitKeyPart;
  resetRateLimitStoreForTests = mod.resetRateLimitStoreForTests;
}, 40000);

afterEach(async () => {
  await resetRateLimitStoreForTests();
});

describe("rate limiting", () => {
  it("prefers the first forwarded client address", () => {
    const request = new Request("https://sportdate.example/api/auth/login", {
      headers: {
        "x-forwarded-for": "198.51.100.2, 203.0.113.9",
      },
    });
    expect(getRequestIp(request)).toBe("198.51.100.2");
  });

  it("normalizes actor keys before hashing them into buckets", () => {
    expect(normalizeRateLimitKeyPart(" ANA@Example.com ")).toBe("ana@example.com");
    expect(normalizeRateLimitKeyPart(undefined)).toBe("");
  });

  it("blocks once the configured fixed window is exhausted and resets after expiry", async () => {
    const rules = [{ name: "login-email", limit: 2, windowMs: 60_000, key: "email:ana@example.com" }] as const;
    expect(await consumeRateLimit("auth:login", rules, 1_000)).toEqual({ ok: true });
    expect(await consumeRateLimit("auth:login", rules, 2_000)).toEqual({ ok: true });
    expect(await consumeRateLimit("auth:login", rules, 3_000)).toEqual({
      ok: false,
      hit: { name: "login-email", retryAfterSeconds: 58 },
    });
    expect(await consumeRateLimit("auth:login", rules, 62_000)).toEqual({ ok: true });
  });

  it("returns a 429 response with retry metadata", async () => {
    const first = await enforceRateLimit(
      "auth:login",
      [{ name: "login-ip", limit: 1, windowMs: 60_000, key: "ip:198.51.100.2" }],
      "Too many login attempts.",
      1_000,
    );
    expect(first).toBeNull();

    const limited = await enforceRateLimit(
      "auth:login",
      [{ name: "login-ip", limit: 1, windowMs: 60_000, key: "ip:198.51.100.2" }],
      "Too many login attempts.",
      2_000,
    );
    expect(limited?.status).toBe(429);
    expect(limited?.headers.get("retry-after")).toBe("59");
    expect(limited?.headers.get("x-ratelimit-policy")).toBe("login-ip");
  });
});
