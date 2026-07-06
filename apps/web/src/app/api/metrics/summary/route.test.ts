import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  summarizeClickMetrics: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
vi.mock("@/lib/click-metrics", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/click-metrics")>();
  return { ...actual, summarizeClickMetrics: mocks.summarizeClickMetrics };
});

import { DatabaseNotConfiguredError } from "@/lib/db";

import { GET } from "./route";

const OWNER = { id: "1", email: "ey.myacc@gmail.com" };
const MEMBER = { id: "2", email: "someone@example.com" };
const ORIGINAL_SECRET = process.env.SOCIAL_AGENT_SECRET;
const ORIGINAL_OWNERS = process.env.OWNER_EMAILS;

const ROW = { day: "2026-07-06", event: "landing_cta_join", pathClass: "/", count: 12 };

function get(query = "", auth?: string) {
  return new Request(`https://keepitup.example/api/metrics/summary${query}`, {
    headers: { Accept: "application/json", ...(auth ? { authorization: auth } : {}) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  delete process.env.OWNER_EMAILS; // exercise the default owner allow-list
  mocks.summarizeClickMetrics.mockResolvedValue([ROW]);
});
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_OWNERS === undefined) delete process.env.OWNER_EMAILS; else process.env.OWNER_EMAILS = ORIGINAL_OWNERS;
});

describe("GET /api/metrics/summary — owner or internal agent", () => {
  it("200s for the owner session with the default 14-day window", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const res = await GET(get());
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    await expect(res.json()).resolves.toEqual({ days: 14, rows: [ROW] });
    expect(mocks.summarizeClickMetrics).toHaveBeenCalledWith(14);
  });

  it("200s for the internal agent secret without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET(get("?days=7", "Bearer social-secret"));
    expect(res.status).toBe(200);
    expect(mocks.summarizeClickMetrics).toHaveBeenCalledWith(7);
  });

  it("401s signed-out, 403s non-owner, 401s wrong secret — never summarizes", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get("", "Bearer wrong"))).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    expect((await GET(get())).status).toBe(403);
    expect(mocks.summarizeClickMetrics).not.toHaveBeenCalled();
  });

  it("fails closed on the agent path when the secret is unset", async () => {
    delete process.env.SOCIAL_AGENT_SECRET;
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(get("", "Bearer anything"))).status).toBe(401);
    expect(mocks.summarizeClickMetrics).not.toHaveBeenCalled();
  });

  it("clamps or defaults a nonsense days parameter", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    await GET(get("?days=99999"));
    expect(mocks.summarizeClickMetrics).toHaveBeenLastCalledWith(90);
    await GET(get("?days=0"));
    expect(mocks.summarizeClickMetrics).toHaveBeenLastCalledWith(1);
    await GET(get("?days=abc"));
    expect(mocks.summarizeClickMetrics).toHaveBeenLastCalledWith(14);
  });

  it("503s when the database is not configured", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    mocks.summarizeClickMetrics.mockRejectedValue(new DatabaseNotConfiguredError());
    const res = await GET(get());
    expect(res.status).toBe(503);
  });
});
