import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  markDispatchHandled: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
vi.mock("@/lib/social-dispatch", () => ({ markDispatchHandled: mocks.markDispatchHandled }));

import { POST } from "./route";

const ORIGINAL_SECRET = process.env.SOCIAL_AGENT_SECRET;
const ID = "11111111-1111-4111-8111-111111111111";

function req(body: unknown, auth?: string) {
  return new Request("https://keepitup.example/api/social/dispatch/handled", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  mocks.markDispatchHandled.mockResolvedValue({ id: ID, requestedBy: null, requestedAt: "2026-07-05T00:00:00.000Z", handledAt: "2026-07-05T00:01:00.000Z" });
});
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SECRET;
});

describe("POST /api/social/dispatch/handled — internal secret-guarded", () => {
  it("stamps a request handled for the correct secret", async () => {
    const res = await POST(req({ id: ID }, "Bearer social-secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ ok: true });
    expect(mocks.markDispatchHandled).toHaveBeenCalledWith(ID);
  });

  it("404s an unknown or already-handled request", async () => {
    mocks.markDispatchHandled.mockResolvedValue(null);
    const res = await POST(req({ id: ID }, "Bearer social-secret"));
    expect(res.status).toBe(404);
  });

  it("400s a missing id without querying", async () => {
    const res = await POST(req({}, "Bearer social-secret"));
    expect(res.status).toBe(400);
    expect(mocks.markDispatchHandled).not.toHaveBeenCalled();
  });

  it("401s without the secret and never queries", async () => {
    expect((await POST(req({ id: ID }))).status).toBe(401);
    expect((await POST(req({ id: ID }, "Bearer wrong"))).status).toBe(401);
    expect(mocks.markDispatchHandled).not.toHaveBeenCalled();
  });

  it("fails closed (401) when SOCIAL_AGENT_SECRET is unset", async () => {
    delete process.env.SOCIAL_AGENT_SECRET;
    expect((await POST(req({ id: ID }, "Bearer anything"))).status).toBe(401);
    expect(mocks.markDispatchHandled).not.toHaveBeenCalled();
  });
});
