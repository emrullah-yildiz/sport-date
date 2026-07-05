import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  decideSocialIdea: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
vi.mock("@/lib/social-ideas", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/social-ideas")>();
  return { ...actual, decideSocialIdea: mocks.decideSocialIdea };
});

import { POST } from "./route";

const OWNER = { id: "1", email: "ey.myacc@gmail.com" };
const MEMBER = { id: "2", email: "someone@example.com" };
const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGINAL_OWNERS = process.env.OWNER_EMAILS;

function post(body: unknown, id = ID): Parameters<typeof POST> {
  const request = new Request(`https://keepitup.example/api/social/ideas/${id}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ id }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.OWNER_EMAILS;
  mocks.getCurrentUser.mockResolvedValue(OWNER);
  mocks.decideSocialIdea.mockImplementation(async (_id: string, decision: { action?: string }) =>
    ({ id: ID, status: decision.action === "approve" ? "approved" : decision.action === "deny" ? "denied" : "pending" }));
});
afterEach(() => {
  if (ORIGINAL_OWNERS === undefined) delete process.env.OWNER_EMAILS; else process.env.OWNER_EMAILS = ORIGINAL_OWNERS;
});

describe("POST /api/social/ideas/[id] — owner decision", () => {
  it("approves: sets status approved", async () => {
    const res = await POST(...post({ action: "approve" }));
    expect(res.status).toBe(200);
    expect(mocks.decideSocialIdea).toHaveBeenCalledWith(ID, { action: "approve" });
    await expect(res.json()).resolves.toEqual({ ok: true, idea: { id: ID, status: "approved" } });
  });

  it("denies: sets status denied", async () => {
    const res = await POST(...post({ action: "deny" }));
    expect(res.status).toBe(200);
    expect(mocks.decideSocialIdea).toHaveBeenCalledWith(ID, { action: "deny" });
    await expect(res.json()).resolves.toMatchObject({ idea: { status: "denied" } });
  });

  it("archives: passes the archive action through", async () => {
    mocks.decideSocialIdea.mockResolvedValue({ id: ID, status: "archived" });
    const res = await POST(...post({ action: "archive" }));
    expect(res.status).toBe(200);
    expect(mocks.decideSocialIdea).toHaveBeenCalledWith(ID, { action: "archive" });
    await expect(res.json()).resolves.toMatchObject({ idea: { status: "archived" } });
  });

  it("comment alone updates owner_comment without an action", async () => {
    const res = await POST(...post({ comment: "Punchier hook please." }));
    expect(res.status).toBe(200);
    expect(mocks.decideSocialIdea).toHaveBeenCalledWith(ID, { comment: "Punchier hook please." });
  });

  it("accepts an action + comment together", async () => {
    const res = await POST(...post({ action: "approve", comment: "Love it." }));
    expect(res.status).toBe(200);
    expect(mocks.decideSocialIdea).toHaveBeenCalledWith(ID, { action: "approve", comment: "Love it." });
  });

  it("401s when signed out and never writes", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await POST(...post({ action: "approve" }));
    expect(res.status).toBe(401);
    expect(mocks.decideSocialIdea).not.toHaveBeenCalled();
  });

  it("403s for a non-owner and never writes", async () => {
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    const res = await POST(...post({ action: "approve" }));
    expect(res.status).toBe(403);
    expect(mocks.decideSocialIdea).not.toHaveBeenCalled();
  });

  it("400s an unknown action and an empty payload", async () => {
    expect((await POST(...post({ action: "maybe" }))).status).toBe(400);
    expect((await POST(...post({}))).status).toBe(400);
    expect(mocks.decideSocialIdea).not.toHaveBeenCalled();
  });

  it("404s a malformed id without writing", async () => {
    const res = await POST(...post({ action: "approve" }, "not-a-uuid"));
    expect(res.status).toBe(404);
    expect(mocks.decideSocialIdea).not.toHaveBeenCalled();
  });

  it("404s when the idea is unknown", async () => {
    mocks.decideSocialIdea.mockResolvedValue(null);
    const res = await POST(...post({ action: "approve" }));
    expect(res.status).toBe(404);
  });
});
