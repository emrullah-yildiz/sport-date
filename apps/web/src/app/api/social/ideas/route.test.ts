import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  listSocialIdeas: vi.fn(),
  insertSocialIdeas: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/session", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));
// Keep the pure helpers real; only stub the DB-touching functions.
vi.mock("@/lib/social-ideas", async (importActual) => {
  const actual = await importActual<typeof import("@/lib/social-ideas")>();
  return { ...actual, listSocialIdeas: mocks.listSocialIdeas, insertSocialIdeas: mocks.insertSocialIdeas };
});

import { GET, POST } from "./route";

const OWNER = { id: "1", email: "ey.myacc@gmail.com" };
const MEMBER = { id: "2", email: "someone@example.com" };
const ORIGINAL_SECRET = process.env.SOCIAL_AGENT_SECRET;
const ORIGINAL_OWNERS = process.env.OWNER_EMAILS;

const validIdea = {
  platform: "instagram",
  format: "carousel",
  title: "Three intents",
  trend: "evergreen",
  hook: "You don't have to want a date to want a teammate.",
  body: {
    slides: ["Slide 1", "Slide 2"],
    caption: "Come as you are.",
    hashtags: ["run", "#community"],
    cta: "Save this.",
    imageConcept: "Three runners, one path.",
  },
};

function get(url = "https://keepitup.example/api/social/ideas") {
  return new Request(url, { headers: { Accept: "application/json" } });
}
function seedReq(body: unknown, auth?: string) {
  return new Request("https://keepitup.example/api/social/ideas", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SOCIAL_AGENT_SECRET = "social-secret";
  delete process.env.OWNER_EMAILS; // exercise the default owner allow-list
  mocks.listSocialIdeas.mockResolvedValue([{ id: "a", status: "pending" }]);
  mocks.insertSocialIdeas.mockResolvedValue([{ id: "a", status: "pending" }]);
});
afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SOCIAL_AGENT_SECRET; else process.env.SOCIAL_AGENT_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_OWNERS === undefined) delete process.env.OWNER_EMAILS; else process.env.OWNER_EMAILS = ORIGINAL_OWNERS;
});

describe("GET /api/social/ideas — owner-gated list", () => {
  it("200s for the owner and returns ideas", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const res = await GET(get());
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ideas: [{ id: "a", status: "pending" }] });
    expect(mocks.listSocialIdeas).toHaveBeenCalledWith(undefined);
  });

  it("401s when signed out and never queries", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(mocks.listSocialIdeas).not.toHaveBeenCalled();
  });

  it("403s for a non-owner member and never queries", async () => {
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    const res = await GET(get());
    expect(res.status).toBe(403);
    expect(mocks.listSocialIdeas).not.toHaveBeenCalled();
  });

  it("respects a ?status= filter and rejects an unknown one", async () => {
    mocks.getCurrentUser.mockResolvedValue(OWNER);
    const ok = await GET(get("https://keepitup.example/api/social/ideas?status=approved"));
    expect(ok.status).toBe(200);
    expect(mocks.listSocialIdeas).toHaveBeenCalledWith("approved");

    const bad = await GET(get("https://keepitup.example/api/social/ideas?status=nope"));
    expect(bad.status).toBe(400);
  });

  it("honors a custom OWNER_EMAILS allow-list", async () => {
    process.env.OWNER_EMAILS = "someone@example.com, other@x.io";
    mocks.getCurrentUser.mockResolvedValue(MEMBER);
    expect((await GET(get())).status).toBe(200);
    mocks.getCurrentUser.mockResolvedValue(OWNER); // default owner now excluded
    expect((await GET(get())).status).toBe(403);
  });
});

describe("POST /api/social/ideas — internal secret-guarded seed", () => {
  it("inserts a single idea for the correct secret", async () => {
    const res = await POST(seedReq(validIdea, "Bearer social-secret"));
    expect(res.status).toBe(201);
    expect(mocks.insertSocialIdeas).toHaveBeenCalledOnce();
    expect(mocks.insertSocialIdeas.mock.calls[0][0]).toHaveLength(1);
  });

  it("inserts a batch via { ideas: [...] }", async () => {
    const res = await POST(seedReq({ ideas: [validIdea, validIdea] }, "Bearer social-secret"));
    expect(res.status).toBe(201);
    expect(mocks.insertSocialIdeas.mock.calls[0][0]).toHaveLength(2);
  });

  it("401s without the secret and never inserts (members can't seed)", async () => {
    expect((await POST(seedReq(validIdea))).status).toBe(401);
    expect((await POST(seedReq(validIdea, "Bearer wrong"))).status).toBe(401);
    expect(mocks.insertSocialIdeas).not.toHaveBeenCalled();
  });

  it("fails closed (401) when SOCIAL_AGENT_SECRET is unset", async () => {
    delete process.env.SOCIAL_AGENT_SECRET;
    expect((await POST(seedReq(validIdea, "Bearer anything"))).status).toBe(401);
    expect(mocks.insertSocialIdeas).not.toHaveBeenCalled();
  });

  it("400s an invalid idea (bad platform / missing body) without inserting", async () => {
    const badPlatform = await POST(seedReq({ ...validIdea, platform: "twitter" }, "Bearer social-secret"));
    expect(badPlatform.status).toBe(400);
    const missingCaption = await POST(seedReq({ ...validIdea, body: { hashtags: [], cta: "x", imageConcept: "y" } }, "Bearer social-secret"));
    expect(missingCaption.status).toBe(400);
    expect(mocks.insertSocialIdeas).not.toHaveBeenCalled();
  });

  it("accepts and trims same-origin body.assets (real image paths)", async () => {
    const withAssets = { ...validIdea, body: { ...validIdea.body, assets: ["/brand/social/photos/padel-01.jpg", " /brand/social/photos/quote-01.jpg "] } };
    const res = await POST(seedReq(withAssets, "Bearer social-secret"));
    expect(res.status).toBe(201);
    const input = mocks.insertSocialIdeas.mock.calls[0][0][0] as { body: { assets?: string[] } };
    expect(input.body.assets).toEqual(["/brand/social/photos/padel-01.jpg", "/brand/social/photos/quote-01.jpg"]);
  });

  it("400s external or path-traversal assets without inserting", async () => {
    const external = { ...validIdea, body: { ...validIdea.body, assets: ["https://evil.example/x.jpg"] } };
    expect((await POST(seedReq(external, "Bearer social-secret"))).status).toBe(400);
    const protocolRel = { ...validIdea, body: { ...validIdea.body, assets: ["//evil.example/x.jpg"] } };
    expect((await POST(seedReq(protocolRel, "Bearer social-secret"))).status).toBe(400);
    const traversal = { ...validIdea, body: { ...validIdea.body, assets: ["/brand/../../etc/passwd"] } };
    expect((await POST(seedReq(traversal, "Bearer social-secret"))).status).toBe(400);
    expect(mocks.insertSocialIdeas).not.toHaveBeenCalled();
  });
});
