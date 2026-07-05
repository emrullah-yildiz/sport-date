import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  recordDispatchRequest: vi.fn(),
  countApprovedUnscheduled: vi.fn(),
  latestUnhandledDispatch: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
vi.mock("@/lib/social-dispatch", () => ({
  recordDispatchRequest: mocks.recordDispatchRequest,
  countApprovedUnscheduled: mocks.countApprovedUnscheduled,
  latestUnhandledDispatch: mocks.latestUnhandledDispatch,
}));

import { GET, POST } from "./route";

const OWNER = { id: "1", email: "ey.myacc@gmail.com" };
const MEMBER = { id: "2", email: "someone@example.com" };
const ORIGINAL_SECRET = process.env.SOCIAL_AGENT_SECRET;
const ORIGINAL_OWNERS = process.env.OWNER_EMAILS;

const REQUEST = {
  id: "11111111-1111-4111-8111-111111111111",
  requestedBy: "ey.myacc@gmail.com",
  requestedAt: "2026-07-05T00:00:00.000Z",
  handledAt: null,
};

function getReq(auth?: string) {
  return new Request("https://keepitup.example/api/social/dispatch", {
    method: "GET",
    headers: { Accept: "application/json", ...(auth ? { authorization: auth } : {}) },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  delete process.env.OWNER_EMAILS; // exercise the default owner allow-list
  mocks.recordDispatchRequest.mockResolvedValue(REQUEST);
  mocks.countApprovedUnscheduled.mockResolvedValue(3);
  mocks.latestUnhandledDispatch.mockResolvedValue(REQUEST);
});
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_OWNERS === undefined) delete process.env.OWNER_EMAILS; else process.env.OWNER_EMAILS = ORIGINAL_OWNERS;
});

describe("POST /api/social/dispatch — owner-gated record", () => {
  it("records a request and returns the approved-unscheduled count for the owner", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const res = await POST();
    expect(res.status).toBe(201);
    await expect(res.json()).resolves.toEqual({ ok: true, approvedUnscheduled: 3 });
    expect(mocks.recordDispatchRequest).toHaveBeenCalledWith("ey.myacc@gmail.com");
    expect(mocks.countApprovedUnscheduled).toHaveBeenCalledOnce();
  });

  it("401s when signed out and never records", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
    expect(mocks.recordDispatchRequest).not.toHaveBeenCalled();
  });

  it("403s for a non-owner member and never records", async () => {
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    const res = await POST();
    expect(res.status).toBe(403);
    expect(mocks.recordDispatchRequest).not.toHaveBeenCalled();
  });

  it("honors a custom OWNER_EMAILS allow-list", async () => {
    process.env.OWNER_EMAILS = "someone@example.com, other@x.io";
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    expect((await POST()).status).toBe(201);
    mocks.getCurrentUser.mockResolvedValue(OWNER); // default owner now excluded
    expect((await POST()).status).toBe(403);
  });
});

describe("GET /api/social/dispatch — internal secret-guarded latest unhandled", () => {
  it("returns the latest unhandled request for the correct secret", async () => {
    const res = await GET(getReq("Bearer social-secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ request: REQUEST });
  });

  it("returns null when there is no unhandled request (handled ones hidden)", async () => {
    mocks.latestUnhandledDispatch.mockResolvedValue(null);
    const res = await GET(getReq("Bearer social-secret"));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ request: null });
  });

  it("401s without the secret and never queries", async () => {
    expect((await GET(getReq())).status).toBe(401);
    expect((await GET(getReq("Bearer wrong"))).status).toBe(401);
    expect(mocks.latestUnhandledDispatch).not.toHaveBeenCalled();
  });

  it("fails closed (401) when SOCIAL_AGENT_SECRET is unset", async () => {
    delete process.env.SOCIAL_AGENT_SECRET;
    expect((await GET(getReq("Bearer anything"))).status).toBe(401);
    expect(mocks.latestUnhandledDispatch).not.toHaveBeenCalled();
  });
});
