import "server-only";

import { NextResponse } from "next/server";

import { hashSessionToken } from "@/lib/auth";

type RateLimitRule = Readonly<{
  name: string;
  limit: number;
  windowMs: number;
  key: string;
}>;

type StoredWindow = {
  count: number;
  resetAt: number;
};

type RateLimitHit = Readonly<{
  name: string;
  retryAfterSeconds: number;
}>;

/**
 * Storage seam for the fixed-window counters.
 *
 * The limiter needs three primitives over a keyed window record: read the
 * current window (`peek`), create-or-increment it for the active window
 * (`bump`), and sweep expired keys (`sweepExpired`) plus a test reset (`clear`).
 * Every method is async because the durable backing store (Upstash Redis over
 * its REST API, Gate 6) is necessarily async; the in-memory default below
 * resolves immediately and so is behavior-identical to the synchronous Map the
 * limiter has always used.
 *
 * The consume logic in `consumeRateLimit` is deliberately split into a read
 * phase (peek every rule, decide block) and a commit phase (bump every rule
 * only when NOT blocked). This preserves the original fixed-window semantics
 * exactly — a blocked request never increments any counter — for both the
 * in-memory and the Upstash store. `bump` is the atomic create-or-increment;
 * for Upstash it is a single pipelined INCR + PEXPIRE.
 */
export type RateLimitStore = {
  /** Read the current window for `key`, or undefined if none is stored. */
  peek(key: string, nowMs: number): Promise<StoredWindow | undefined>;
  /**
   * Create-or-increment the active window for `key`. If no window exists or the
   * stored window has expired at `nowMs`, start a fresh window of `windowMs`
   * with count 1; otherwise increment the existing window's count.
   */
  bump(key: string, nowMs: number, windowMs: number): Promise<void>;
  sweepExpired(nowMs: number): Promise<void>;
  clear(): Promise<void>;
};

function createInMemoryRateLimitStore(): RateLimitStore {
  const windows = new Map<string, StoredWindow>();
  return {
    async peek(key) {
      return windows.get(key);
    },
    async bump(key, nowMs, windowMs) {
      const entry = windows.get(key);
      if (!entry || entry.resetAt <= nowMs) {
        windows.set(key, { count: 1, resetAt: nowMs + windowMs });
        return;
      }
      entry.count += 1;
    },
    async sweepExpired(nowMs) {
      for (const [key, entry] of windows.entries()) {
        if (entry.resetAt <= nowMs) windows.delete(key);
      }
    },
    async clear() {
      windows.clear();
    },
  };
}

type UpstashEnvironment = Readonly<Record<string, string | undefined>>;

/**
 * Upstash Redis REST adapter (Gate 6). Activated ONLY when BOTH
 * UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are present; otherwise the
 * in-memory store is used so dev/test/default behavior is untouched. Mirrors the
 * env-gated, disabled-by-default email-delivery adapter seam.
 *
 * Each `bump` is a single atomic Upstash REST *pipeline* of INCR + PEXPIRE on
 * the same key/window the in-memory store uses, so concurrent replicas share one
 * counter. `peek` reads the counter (GET) and its TTL (PTTL) to reconstruct the
 * { count, resetAt } shape the consume logic expects.
 *
 * GRACEFUL DEGRADATION (documented choice): on ANY Upstash error, non-2xx, or
 * timeout, the adapter falls back to the in-process in-memory limiter for that
 * single operation and logs ONE warning. It never fails OPEN to unlimited — an
 * Upstash outage degrades shared enforcement to per-process enforcement, but
 * abuse protection is never silently disabled.
 */
function createUpstashRateLimitStore(
  url: string,
  token: string,
  fallback: RateLimitStore,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 1_000,
): RateLimitStore {
  const base = url.replace(/\/+$/, "");
  let warned = false;

  function warnOnce(error: unknown): void {
    if (warned) return;
    warned = true;
    console.warn(
      "Upstash rate-limit store unavailable; falling back to in-memory enforcement for this process.",
      error instanceof Error ? error.message : String(error),
    );
  }

  // Upstash REST pipeline: POST /pipeline with a JSON array of command arrays.
  // Each element of the returned array is { result } | { error }. We treat any
  // transport failure, non-2xx, embedded { error }, or timeout as a failure and
  // let the caller fall back.
  async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${base}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(commands),
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Upstash responded ${response.status}`);
      }
      const payload = (await response.json()) as unknown;
      if (!Array.isArray(payload)) {
        throw new Error("Upstash pipeline returned a non-array payload");
      }
      for (const entry of payload) {
        if (entry && typeof entry === "object" && "error" in entry && entry.error != null) {
          throw new Error(`Upstash command error: ${String((entry as { error: unknown }).error)}`);
        }
      }
      return payload;
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async peek(key, nowMs) {
      try {
        const results = await pipeline([
          ["GET", key],
          ["PTTL", key],
        ]);
        const rawCount = (results[0] as { result?: unknown } | undefined)?.result ?? null;
        const rawTtl = (results[1] as { result?: unknown } | undefined)?.result ?? null;
        if (rawCount == null) return undefined;
        const count = Number(rawCount);
        const ttl = Number(rawTtl);
        // PTTL: -2 = key missing, -1 = no expiry. Without a positive TTL we
        // cannot reconstruct resetAt, so treat the window as absent (the next
        // bump will (re)establish it with an expiry).
        if (!Number.isFinite(count) || !Number.isFinite(ttl) || ttl <= 0) return undefined;
        return { count, resetAt: nowMs + ttl };
      } catch (error) {
        warnOnce(error);
        return fallback.peek(key, nowMs);
      }
    },
    async bump(key, nowMs, windowMs) {
      try {
        // Atomic fixed-window bump: INCR creates the key at 1 (or increments an
        // existing window) and PEXPIRE arms/refreshes its expiry. Both run in
        // one pipeline so a single key advance is one round trip. PEXPIRE every
        // time keeps the window length stable across the window's lifetime
        // (fixed window: the key is whole-key-expired, then recreated).
        await pipeline([
          ["INCR", key],
          ["PEXPIRE", key, windowMs],
        ]);
      } catch (error) {
        warnOnce(error);
        await fallback.bump(key, nowMs, windowMs);
      }
    },
    async sweepExpired(nowMs) {
      // Upstash expires keys itself; only the in-memory fallback needs sweeping.
      await fallback.sweepExpired(nowMs);
    },
    async clear() {
      await fallback.clear();
    },
  };
}

function resolveRateLimitStore(env: UpstashEnvironment = process.env): RateLimitStore {
  const fallback = createInMemoryRateLimitStore();
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    return createUpstashRateLimitStore(url, token, fallback);
  }
  return fallback;
}

let store: RateLimitStore = resolveRateLimitStore();
let mutationCount = 0;

async function maybeCleanup(nowMs: number): Promise<void> {
  mutationCount += 1;
  if (mutationCount % 250 === 0) await store.sweepExpired(nowMs);
}

function firstForwardedIp(value: string | null): string {
  return value?.split(",")[0]?.trim() ?? "";
}

export function getRequestIp(request: Request): string {
  return firstForwardedIp(request.headers.get("cf-connecting-ip"))
    || firstForwardedIp(request.headers.get("x-forwarded-for"))
    || firstForwardedIp(request.headers.get("x-real-ip"))
    || "unknown";
}

export function normalizeRateLimitKeyPart(value: unknown): string {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase().slice(0, 256);
}

function windowKey(scope: string, rule: RateLimitRule): string {
  return `${scope}:${rule.name}:${hashSessionToken(rule.key)}`;
}

export async function consumeRateLimit(
  scope: string,
  rules: readonly RateLimitRule[],
  nowMs = Date.now(),
): Promise<{ ok: true } | { ok: false; hit: RateLimitHit }> {
  await maybeCleanup(nowMs);

  let blockingHit: RateLimitHit | null = null;
  for (const rule of rules) {
    const key = windowKey(scope, rule);
    const entry = await store.peek(key, nowMs);
    if (entry && entry.resetAt > nowMs && entry.count >= rule.limit) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000));
      if (!blockingHit || retryAfterSeconds > blockingHit.retryAfterSeconds) {
        blockingHit = { name: rule.name, retryAfterSeconds };
      }
    }
  }

  if (blockingHit) return { ok: false, hit: blockingHit };

  for (const rule of rules) {
    const key = windowKey(scope, rule);
    await store.bump(key, nowMs, rule.windowMs);
  }

  return { ok: true };
}

export async function enforceRateLimit(
  scope: string,
  rules: readonly RateLimitRule[],
  message: string,
  nowMs = Date.now(),
): Promise<NextResponse | null> {
  const result = await consumeRateLimit(scope, rules, nowMs);
  if (result.ok) return null;
  return NextResponse.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(result.hit.retryAfterSeconds),
        "X-RateLimit-Policy": result.hit.name,
      },
    },
  );
}

export function browserAuthRateLimitRules(request: Request, email: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "browser-auth-ip", limit: 10, windowMs: 15 * 60 * 1000, key: `ip:${ip}` },
    { name: "browser-auth-email", limit: 5, windowMs: 15 * 60 * 1000, key: `email:${email}` },
  ];
}

export function browserRegistrationRateLimitRules(request: Request, email: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "browser-registration-ip", limit: 5, windowMs: 60 * 60 * 1000, key: `ip:${ip}` },
    { name: "browser-registration-email", limit: 3, windowMs: 60 * 60 * 1000, key: `email:${email}` },
  ];
}

export function mobileAuthRateLimitRules(request: Request, email: string, deviceId: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "mobile-auth-ip", limit: 10, windowMs: 15 * 60 * 1000, key: `ip:${ip}` },
    { name: "mobile-auth-email", limit: 5, windowMs: 15 * 60 * 1000, key: `email:${email}` },
    { name: "mobile-auth-device", limit: 8, windowMs: 15 * 60 * 1000, key: `device:${deviceId}` },
  ];
}

export function mobileRefreshRateLimitRules(request: Request, deviceId: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "mobile-refresh-ip", limit: 60, windowMs: 15 * 60 * 1000, key: `ip:${ip}` },
    { name: "mobile-refresh-device", limit: 30, windowMs: 15 * 60 * 1000, key: `device:${deviceId}` },
  ];
}

export function joinRequestRateLimitRules(request: Request, userId: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "join-request-ip", limit: 30, windowMs: 10 * 60 * 1000, key: `ip:${ip}` },
    { name: "join-request-user", limit: 12, windowMs: 10 * 60 * 1000, key: `user:${userId}` },
  ];
}

export function safetyReportRateLimitRules(request: Request, userId: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "safety-report-ip", limit: 12, windowMs: 60 * 60 * 1000, key: `ip:${ip}` },
    { name: "safety-report-user", limit: 6, windowMs: 60 * 60 * 1000, key: `user:${userId}` },
  ];
}

export function verificationRequestRateLimitRules(request: Request, userId: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "verification-request-ip-hour", limit: 3, windowMs: 60 * 60 * 1000, key: `ip:${ip}` },
    { name: "verification-request-user-hour", limit: 3, windowMs: 60 * 60 * 1000, key: `user:${userId}` },
    { name: "verification-request-user-day", limit: 6, windowMs: 24 * 60 * 60 * 1000, key: `user:${userId}` },
  ];
}

export function passwordResetRequestRateLimitRules(request: Request, email: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "password-reset-request-ip", limit: 10, windowMs: 60 * 60 * 1000, key: `ip:${ip}` },
    { name: "password-reset-request-email", limit: 3, windowMs: 60 * 60 * 1000, key: `email:${email}` },
  ];
}

export function authTokenConfirmRateLimitRules(request: Request, token: string): readonly RateLimitRule[] {
  const ip = getRequestIp(request);
  return [
    { name: "auth-token-confirm-ip", limit: 10, windowMs: 60 * 60 * 1000, key: `ip:${ip}` },
    { name: "auth-token-confirm-token", limit: 5, windowMs: 60 * 60 * 1000, key: `token:${token}` },
  ];
}

export async function resetRateLimitStoreForTests(): Promise<void> {
  await store.clear();
  mutationCount = 0;
}

/**
 * Test-only seam to swap the active store (e.g. an Upstash adapter built over a
 * mocked `fetch`). Returns the previous store so a test can restore it. The
 * runtime path never calls this; the module-level default is chosen once by
 * `resolveRateLimitStore` from the environment.
 */
export function setRateLimitStoreForTests(next: RateLimitStore): RateLimitStore {
  const previous = store;
  store = next;
  mutationCount = 0;
  return previous;
}

// Exported for the Gate 6 Upstash adapter and its tests: construct a fresh
// in-memory fallback store, build the env-gated Upstash adapter directly (with
// an injectable `fetch` for tests), and resolve the env-selected store. The
// module-level default above is created the same way via `resolveRateLimitStore`.
export {
  createInMemoryRateLimitStore,
  createUpstashRateLimitStore,
  resolveRateLimitStore,
};
