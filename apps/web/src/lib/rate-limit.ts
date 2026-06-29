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

const store = new Map<string, StoredWindow>();
let mutationCount = 0;

function cleanupExpired(nowMs: number): void {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= nowMs) store.delete(key);
  }
}

function maybeCleanup(nowMs: number): void {
  mutationCount += 1;
  if (mutationCount % 250 === 0) cleanupExpired(nowMs);
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

export function consumeRateLimit(
  scope: string,
  rules: readonly RateLimitRule[],
  nowMs = Date.now(),
): { ok: true } | { ok: false; hit: RateLimitHit } {
  maybeCleanup(nowMs);

  let blockingHit: RateLimitHit | null = null;
  for (const rule of rules) {
    const key = windowKey(scope, rule);
    const entry = store.get(key);
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
    const entry = store.get(key);
    if (!entry || entry.resetAt <= nowMs) {
      store.set(key, { count: 1, resetAt: nowMs + rule.windowMs });
      continue;
    }
    entry.count += 1;
  }

  return { ok: true };
}

export function enforceRateLimit(
  scope: string,
  rules: readonly RateLimitRule[],
  message: string,
  nowMs = Date.now(),
): NextResponse | null {
  const result = consumeRateLimit(scope, rules, nowMs);
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

export function resetRateLimitStoreForTests(): void {
  store.clear();
  mutationCount = 0;
}
