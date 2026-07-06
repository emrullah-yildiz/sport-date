import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recordClickMetric: vi.fn(),
  enforceRateLimit: vi.fn(),
  clickMetricRateLimitRules: vi.fn(() => []),
  isTrustedBrowserMutation: vi.fn(() => true),
  getCurrentUser: vi.fn(),
}));

vi.mock("server-only", () => ({}));
// Keep the pure helpers real (allowlist + path classification are behaviour
// under test); only stub the DB-touching write.
vi.mock("@/lib/click-metrics", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/click-metrics")>();
  return { ...actual, recordClickMetric: mocks.recordClickMetric };
});
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: mocks.enforceRateLimit,
  clickMetricRateLimitRules: mocks.clickMetricRateLimitRules,
}));
vi.mock("@/lib/request-security", () => ({ isTrustedBrowserMutation: mocks.isTrustedBrowserMutation }));
// Tripwire: the beacon must stay identity-free. If anyone wires the session
// into this route, the "never reads identity" tests below fail.
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));

import { NextResponse } from "next/server";

import { POST } from "./route";

function post(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("https://keepitup.example/api/metrics/click", {
    method: "POST",
    // sendBeacon sends JSON strings as text/plain — mirror that here.
    headers: { "Content-Type": "text/plain;charset=UTF-8", origin: "https://keepitup.example", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isTrustedBrowserMutation.mockReturnValue(true);
  mocks.enforceRateLimit.mockResolvedValue(null);
  mocks.recordClickMetric.mockResolvedValue(undefined);
});

describe("POST /api/metrics/click — allowlisted, anonymous, aggregate-only", () => {
  it("records an allowlisted event with its path collapsed to a page class", async () => {
    const response = await POST(post({ event: "landing_cta_join", path: "/landing" }));
    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.recordClickMetric).toHaveBeenCalledWith("landing_cta_join", "/");
  });

  it("collapses an unrecognised or missing path to 'other' instead of storing free text", async () => {
    await POST(post({ event: "share_opened", path: "/events/9a1b-secret-id" }));
    expect(mocks.recordClickMetric).toHaveBeenLastCalledWith("share_opened", "/events/*");
    await POST(post({ event: "share_opened", path: "/totally/unknown?q=x" }));
    expect(mocks.recordClickMetric).toHaveBeenLastCalledWith("share_opened", "other");
    await POST(post({ event: "share_opened" }));
    expect(mocks.recordClickMetric).toHaveBeenLastCalledWith("share_opened", "other");
  });

  it("drops every extra payload field — only (event, path class) can reach storage", async () => {
    const response = await POST(post({
      event: "signup_completed",
      path: "/signup",
      // A buggy or malicious client tries to attach identity — all ignored.
      userId: "42",
      email: "ana@example.com",
      sessionId: "deadbeef",
      fingerprint: { ua: "Mozilla/5.0" },
    }));
    expect(response.status).toBe(204);
    expect(mocks.recordClickMetric).toHaveBeenCalledTimes(1);
    expect(mocks.recordClickMetric).toHaveBeenCalledWith("signup_completed", "/signup");
    // The storage call has exactly two arguments — there is no third slot an
    // identifier could ride in.
    expect(mocks.recordClickMetric.mock.calls[0]).toHaveLength(2);
  });

  it("rejects events outside the fixed allowlist without storing", async () => {
    for (const event of ["pageview", "landing_cta_JOIN", "", 42, null, { name: "x" }]) {
      const response = await POST(post({ event, path: "/" }));
      expect(response.status).toBe(400);
    }
    expect(mocks.recordClickMetric).not.toHaveBeenCalled();
  });

  it("never reads an identity source: no session lookup, no cookie/authorization header", async () => {
    const request = post(
      { event: "discover_viewed", path: "/discover" },
      { cookie: "session=super-secret", authorization: "Bearer member-token" },
    );
    const readHeaders: string[] = [];
    const realGet = request.headers.get.bind(request.headers);
    vi.spyOn(request.headers, "get").mockImplementation((name: string) => {
      readHeaders.push(name.toLowerCase());
      return realGet(name);
    });
    const response = await POST(request);
    expect(response.status).toBe(204);
    // The handler itself reads no header at all (trust + rate-limit checks are
    // separate, mocked modules), and in particular never the identity ones.
    expect(readHeaders).not.toContain("cookie");
    expect(readHeaders).not.toContain("authorization");
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
  });

  it("rejects cross-site posts before rate limiting or storage", async () => {
    mocks.isTrustedBrowserMutation.mockReturnValue(false);
    const response = await POST(post({ event: "landing_cta_join", path: "/" }));
    expect(response.status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
    expect(mocks.recordClickMetric).not.toHaveBeenCalled();
  });

  it("returns the rate-limit response before touching storage", async () => {
    mocks.enforceRateLimit.mockResolvedValue(
      NextResponse.json({ error: "slow down" }, { status: 429, headers: { "Retry-After": "60" } }),
    );
    const response = await POST(post({ event: "landing_cta_join", path: "/" }));
    expect(response.status).toBe(429);
    expect(mocks.recordClickMetric).not.toHaveBeenCalled();
  });

  it("400s a non-JSON body", async () => {
    const response = await POST(post("not json"));
    expect(response.status).toBe(400);
    expect(mocks.recordClickMetric).not.toHaveBeenCalled();
  });

  it("fails soft: a storage failure still answers 204 (analytics never breaks UX)", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.recordClickMetric.mockRejectedValue(new Error("db down"));
    const response = await POST(post({ event: "join_requested", path: "/discover/events/1" }));
    expect(response.status).toBe(204);
    errorSpy.mockRestore();
  });
});
