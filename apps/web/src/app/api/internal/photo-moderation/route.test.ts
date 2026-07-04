import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ listPendingPhotosForModeration: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/photos", () => ({ listPendingPhotosForModeration: mocks.listPendingPhotosForModeration }));
vi.mock("@/lib/db", () => ({ DatabaseNotConfiguredError: class DatabaseNotConfiguredError extends Error {} }));

import { GET } from "./route";

const ORIGINAL = process.env.MODERATION_AGENT_SECRET;

function req(auth?: string): Request {
  return new Request("https://keepitup.example/api/internal/photo-moderation", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MODERATION_AGENT_SECRET = "mod-secret";
  mocks.listPendingPhotosForModeration.mockResolvedValue([
    { id: "p1", memberId: "42", contentType: "image/jpeg", alt: "", createdAt: "2026-07-04T10:00:00Z" },
  ]);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MODERATION_AGENT_SECRET;
  else process.env.MODERATION_AGENT_SECRET = ORIGINAL;
});

describe("GET /api/internal/photo-moderation — pending queue (agent)", () => {
  it("lists pending photos for a correct secret", async () => {
    const response = await GET(req("Bearer mod-secret"));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      photos: [{ id: "p1", memberId: "42", contentType: "image/jpeg", alt: "", createdAt: "2026-07-04T10:00:00Z" }],
    });
  });

  it("401s without the secret and never queries (members can't reach it)", async () => {
    expect((await GET(req())).status).toBe(401);
    expect((await GET(req("Bearer wrong"))).status).toBe(401);
    expect(mocks.listPendingPhotosForModeration).not.toHaveBeenCalled();
  });

  it("fails closed (401) when the secret is unset", async () => {
    delete process.env.MODERATION_AGENT_SECRET;
    expect((await GET(req("Bearer anything"))).status).toBe(401);
  });
});
