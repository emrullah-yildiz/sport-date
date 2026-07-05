import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listStandupDecisions: vi.fn(),
  decideStandupDirection: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
// Keep the pure helpers real; only stub the DB-touching functions.
vi.mock("@/lib/standup-directions", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/standup-directions")>();
  return { ...actual, listStandupDecisions: mocks.listStandupDecisions, decideStandupDirection: mocks.decideStandupDirection };
});

import { GET, POST } from "./route";

const OWNER = { id: "1", email: "ey.myacc@gmail.com" };
const MEMBER = { id: "2", email: "someone@example.com" };
const ORIGINAL_SECRET = process.env.SOCIAL_AGENT_SECRET;
const ORIGINAL_OWNERS = process.env.OWNER_EMAILS;

const DECISION = {
  directionId: "SD-20260705-1",
  action: "approve",
  comment: null,
  decidedBy: OWNER.email,
  decidedAt: "2026-07-05T10:00:00.000Z",
};

function get(auth?: string) {
  return new Request("https://keepitup.example/api/standup/directions", {
    headers: { Accept: "application/json", ...(auth ? { authorization: auth } : {}) },
  });
}
function post(body: unknown) {
  return new Request("https://keepitup.example/api/standup/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  delete process.env.OWNER_EMAILS; // exercise the default owner allow-list
  mocks.listStandupDecisions.mockResolvedValue([DECISION]);
  mocks.decideStandupDirection.mockResolvedValue(DECISION);
});
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_OWNERS === undefined) delete process.env.OWNER_EMAILS; else process.env.OWNER_EMAILS = ORIGINAL_OWNERS;
});

describe("GET /api/standup/directions — owner or internal agent", () => {
  it("200s for the owner session", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const res = await GET(get());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ decisions: [DECISION] });
  });

  it("200s for the internal agent secret without a session", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET(get("Bearer social-secret"));
    expect(res.status).toBe(200);
    expect(mocks.listStandupDecisions).toHaveBeenCalledOnce();
  });

  it("401s signed-out, 403s non-owner, 401s wrong secret — never lists", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get("Bearer wrong"))).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    expect((await GET(get())).status).toBe(403);
    expect(mocks.listStandupDecisions).not.toHaveBeenCalled();
  });

  it("fails closed on the agent path when the secret is unset", async () => {
    delete process.env.SOCIAL_AGENT_SECRET;
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await GET(get("Bearer anything"))).status).toBe(401);
    expect(mocks.listStandupDecisions).not.toHaveBeenCalled();
  });
});

describe("POST /api/standup/directions — owner-gated decision", () => {
  it("records an approve with a comment for the owner", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const res = await POST(post({ id: "SD-20260705-1", action: "approve", comment: "go" }));
    expect(res.status).toBe(200);
    expect(mocks.decideStandupDirection).toHaveBeenCalledWith("SD-20260705-1", "approve", "go", OWNER.email);
  });

  it("401s signed-out and 403s non-owner without deciding", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await POST(post({ id: "SD-20260705-1", action: "deny" }))).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    expect((await POST(post({ id: "SD-20260705-1", action: "deny" }))).status).toBe(403);
    expect(mocks.decideStandupDirection).not.toHaveBeenCalled();
  });

  it("400s a malformed id, bad action, or non-string comment", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    expect((await POST(post({ id: "not-a-direction", action: "approve" }))).status).toBe(400);
    expect((await POST(post({ id: "SD-20260705-1", action: "maybe" }))).status).toBe(400);
    expect((await POST(post({ id: "SD-20260705-1", action: "approve", comment: 42 }))).status).toBe(400);
    expect(mocks.decideStandupDirection).not.toHaveBeenCalled();
  });
});
