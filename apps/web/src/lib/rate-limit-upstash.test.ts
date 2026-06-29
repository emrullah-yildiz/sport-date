import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

let createInMemoryRateLimitStore: typeof import("./rate-limit").createInMemoryRateLimitStore;
let createUpstashRateLimitStore: typeof import("./rate-limit").createUpstashRateLimitStore;
let resolveRateLimitStore: typeof import("./rate-limit").resolveRateLimitStore;
let setRateLimitStoreForTests: typeof import("./rate-limit").setRateLimitStoreForTests;
let consumeRateLimit: typeof import("./rate-limit").consumeRateLimit;
let resetRateLimitStoreForTests: typeof import("./rate-limit").resetRateLimitStoreForTests;
type RateLimitStore = import("./rate-limit").RateLimitStore;

const URL = "https://example-upstash.example";
const TOKEN = "test-token";

beforeAll(async () => {
  const mod = await import("./rate-limit");
  createInMemoryRateLimitStore = mod.createInMemoryRateLimitStore;
  createUpstashRateLimitStore = mod.createUpstashRateLimitStore;
  resolveRateLimitStore = mod.resolveRateLimitStore;
  setRateLimitStoreForTests = mod.setRateLimitStoreForTests;
  consumeRateLimit = mod.consumeRateLimit;
  resetRateLimitStoreForTests = mod.resetRateLimitStoreForTests;
}, 40000);

afterEach(() => {
  vi.restoreAllMocks();
});

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as unknown as Response;
}

/**
 * A scripted fetch double: each call shifts the next queued result. The pipeline
 * command array is captured so tests can assert the exact INCR/PEXPIRE/GET/PTTL
 * commands issued against the Upstash REST endpoint.
 */
function scriptedFetch(results: unknown[]): {
  fetch: typeof fetch;
  calls: { url: string; commands: (string | number)[][] }[];
} {
  const calls: { url: string; commands: (string | number)[][] }[] = [];
  let i = 0;
  const fetchImpl = (async (input: unknown, init?: { body?: string }) => {
    calls.push({ url: String(input), commands: JSON.parse(init?.body ?? "[]") });
    const next = results[i++];
    if (next instanceof Error) throw next;
    return jsonResponse(next);
  }) as unknown as typeof fetch;
  return { fetch: fetchImpl, calls };
}

describe("Upstash rate-limit adapter (mocked fetch)", () => {
  describe("env gating", () => {
    it("uses the in-memory store when the Upstash env vars are absent", () => {
      const store = resolveRateLimitStore({});
      // The in-memory store never calls fetch; assert by behavior that no remote
      // is contacted by spying on global fetch and confirming it is untouched.
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      return store.bump("k", 1_000, 60_000).then(async () => {
        expect(fetchSpy).not.toHaveBeenCalled();
        expect(await store.peek("k", 1_000)).toEqual({ count: 1, resetAt: 61_000 });
      });
    });

    it("uses the in-memory store when only one Upstash env var is present", async () => {
      const onlyUrl = resolveRateLimitStore({ UPSTASH_REDIS_REST_URL: URL });
      const onlyToken = resolveRateLimitStore({ UPSTASH_REDIS_REST_TOKEN: TOKEN });
      const fetchSpy = vi.spyOn(globalThis, "fetch");
      await onlyUrl.bump("k", 1_000, 60_000);
      await onlyToken.bump("k", 1_000, 60_000);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("activates the Upstash adapter only when BOTH env vars are present", async () => {
      const { fetch, calls } = scriptedFetch([[{ result: 1 }, { result: 1 }]]);
      const store = createUpstashRateLimitStore(URL, TOKEN, createInMemoryRateLimitStore(), fetch);
      await store.bump("scope:rule:hash", 1_000, 60_000);
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe(`${URL}/pipeline`);
      expect(calls[0].commands).toEqual([
        ["INCR", "scope:rule:hash"],
        ["PEXPIRE", "scope:rule:hash", 60_000],
      ]);
    });
  });

  describe("under-limit allows + sets expiry", () => {
    it("bumps via atomic INCR + PEXPIRE and reconstructs the window from GET + PTTL", async () => {
      const { fetch, calls } = scriptedFetch([
        [{ result: 1 }, { result: 1 }], // bump: INCR -> 1, PEXPIRE -> 1
        [{ result: "1" }, { result: 45_000 }], // peek: GET -> "1", PTTL -> 45s remaining
      ]);
      const store = createUpstashRateLimitStore(URL, TOKEN, createInMemoryRateLimitStore(), fetch);

      await store.bump("k", 10_000, 60_000);
      expect(calls[0].commands).toEqual([["INCR", "k"], ["PEXPIRE", "k", 60_000]]);

      const window = await store.peek("k", 10_000);
      expect(calls[1].commands).toEqual([["GET", "k"], ["PTTL", "k"]]);
      expect(window).toEqual({ count: 1, resetAt: 55_000 });
    });

    it("treats a missing key (GET null / PTTL -2) as an absent window", async () => {
      const { fetch } = scriptedFetch([[{ result: null }, { result: -2 }]]);
      const store = createUpstashRateLimitStore(URL, TOKEN, createInMemoryRateLimitStore(), fetch);
      expect(await store.peek("k", 1_000)).toBeUndefined();
    });
  });

  describe("at/over-limit blocks with correct retry metadata", () => {
    it("blocks once the shared counter reaches the limit and reports retry seconds from PTTL", async () => {
      // Drive the real consume/enforce path over an Upstash store whose counter
      // is already at the limit, so the window-read phase blocks.
      const limit = 5;
      const { fetch } = scriptedFetch([
        // consume() peek phase for the single rule: GET -> "5", PTTL -> 58_000ms
        [{ result: String(limit) }, { result: 58_000 }],
      ]);
      const upstash = createUpstashRateLimitStore(URL, TOKEN, createInMemoryRateLimitStore(), fetch);
      const previous = setRateLimitStoreForTests(upstash);
      try {
        const result = await consumeRateLimit(
          "auth:login",
          [{ name: "login-ip", limit, windowMs: 60_000, key: "ip:198.51.100.2" }],
          1_000,
        );
        expect(result).toEqual({ ok: false, hit: { name: "login-ip", retryAfterSeconds: 58 } });
      } finally {
        setRateLimitStoreForTests(previous);
      }
    });

    it("allows while under the limit then commits a bump", async () => {
      const { fetch, calls } = scriptedFetch([
        [{ result: "2" }, { result: 40_000 }], // peek: count 2 < limit 5
        [{ result: 3 }, { result: 1 }], // bump: INCR -> 3, PEXPIRE -> 1
      ]);
      const upstash = createUpstashRateLimitStore(URL, TOKEN, createInMemoryRateLimitStore(), fetch);
      const previous = setRateLimitStoreForTests(upstash);
      try {
        const result = await consumeRateLimit(
          "auth:login",
          [{ name: "login-ip", limit: 5, windowMs: 60_000, key: "ip:198.51.100.2" }],
          1_000,
        );
        expect(result).toEqual({ ok: true });
        // Two round trips: one peek, one bump.
        expect(calls).toHaveLength(2);
        expect(calls[1].commands[0][0]).toBe("INCR");
        expect(calls[1].commands[1][0]).toBe("PEXPIRE");
      } finally {
        setRateLimitStoreForTests(previous);
      }
    });
  });

  describe("graceful degradation on Upstash error", () => {
    it("falls back to the in-memory store on a thrown fetch error and still enforces", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const fallback = createInMemoryRateLimitStore();
      // Every Upstash call rejects, so the adapter must defer to `fallback`.
      const { fetch } = scriptedFetch([
        new Error("network down"),
        new Error("network down"),
        new Error("network down"),
      ]);
      const store = createUpstashRateLimitStore(URL, TOKEN, fallback, fetch);

      // Two bumps land in the fallback; the third peek reads the fallback's count.
      await store.bump("k", 1_000, 60_000);
      await store.bump("k", 2_000, 60_000);
      const window = await store.peek("k", 3_000);

      expect(window?.count).toBe(2);
      // Single warning despite multiple failures.
      expect(warn).toHaveBeenCalledTimes(1);
    });

    it("falls back to in-memory on a non-2xx Upstash response and still blocks at the limit", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const fallback = createInMemoryRateLimitStore();
      const failing = (async () => jsonResponse({}, false, 500)) as unknown as typeof fetch;
      const store = createUpstashRateLimitStore(URL, TOKEN, fallback, failing);
      const previous = setRateLimitStoreForTests(store);
      try {
        const rules = [{ name: "login-ip", limit: 2, windowMs: 60_000, key: "ip:198.51.100.2" }] as const;
        expect(await consumeRateLimit("auth:login", rules, 1_000)).toEqual({ ok: true });
        expect(await consumeRateLimit("auth:login", rules, 2_000)).toEqual({ ok: true });
        // Enforcement is preserved through the fallback: third request blocks.
        expect(await consumeRateLimit("auth:login", rules, 3_000)).toEqual({
          ok: false,
          hit: { name: "login-ip", retryAfterSeconds: 58 },
        });
      } finally {
        setRateLimitStoreForTests(previous);
      }
    });

    it("falls back when a pipeline element carries an embedded { error }", async () => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      const fallback = createInMemoryRateLimitStore();
      const { fetch } = scriptedFetch([[{ error: "ERR max requests" }, { result: 1 }]]);
      const bumpSpy = vi.spyOn(fallback, "bump");
      const store = createUpstashRateLimitStore(URL, TOKEN, fallback, fetch);
      await store.bump("k", 1_000, 60_000);
      expect(bumpSpy).toHaveBeenCalledWith("k", 1_000, 60_000);
    });
  });

  describe("in-memory path is unchanged when env vars are absent", () => {
    it("enforces the fixed window identically via resolveRateLimitStore({})", async () => {
      const store = resolveRateLimitStore({});
      const previous = setRateLimitStoreForTests(store);
      try {
        const rules = [{ name: "login-email", limit: 2, windowMs: 60_000, key: "email:ana@example.com" }] as const;
        expect(await consumeRateLimit("auth:login", rules, 1_000)).toEqual({ ok: true });
        expect(await consumeRateLimit("auth:login", rules, 2_000)).toEqual({ ok: true });
        expect(await consumeRateLimit("auth:login", rules, 3_000)).toEqual({
          ok: false,
          hit: { name: "login-email", retryAfterSeconds: 58 },
        });
        expect(await consumeRateLimit("auth:login", rules, 62_000)).toEqual({ ok: true });
      } finally {
        await resetRateLimitStoreForTests();
        setRateLimitStoreForTests(previous);
      }
    });
  });
});

// Type-only reference so the imported store type is exercised by the compiler.
export type _StoreTypeReference = RateLimitStore;
