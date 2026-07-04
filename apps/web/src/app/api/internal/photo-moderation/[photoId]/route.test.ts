import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ setPhotoModerationStatus: vi.fn() }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/photos", () => ({ setPhotoModerationStatus: mocks.setPhotoModerationStatus }));

import { POST } from "./route";

const PHOTO_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGINAL = process.env.MODERATION_AGENT_SECRET;

function post(body: unknown, auth?: string, photoId = PHOTO_ID): Parameters<typeof POST> {
  const request = new Request(`https://keepitup.example/api/internal/photo-moderation/${photoId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { authorization: auth } : {}) },
    body: JSON.stringify(body),
  });
  return [request, { params: Promise.resolve({ photoId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MODERATION_AGENT_SECRET = "mod-secret";
  mocks.setPhotoModerationStatus.mockResolvedValue(true);
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MODERATION_AGENT_SECRET;
  else process.env.MODERATION_AGENT_SECRET = ORIGINAL;
});

describe("POST /api/internal/photo-moderation/[photoId] — protected approve/reject", () => {
  it("approves a held photo for a correct secret", async () => {
    const response = await POST(...post({ action: "approve" }, "Bearer mod-secret"));
    expect(response.status).toBe(200);
    expect(mocks.setPhotoModerationStatus).toHaveBeenCalledWith(PHOTO_ID, "approve");
  });

  it("rejects a held photo for a correct secret", async () => {
    const response = await POST(...post({ action: "reject" }, "Bearer mod-secret"));
    expect(response.status).toBe(200);
    expect(mocks.setPhotoModerationStatus).toHaveBeenCalledWith(PHOTO_ID, "reject");
  });

  it("401s an unauthenticated / wrong-secret caller and never mutates (members can't reach it)", async () => {
    expect((await POST(...post({ action: "approve" }))).status).toBe(401);
    expect((await POST(...post({ action: "approve" }, "Bearer wrong"))).status).toBe(401);
    expect(mocks.setPhotoModerationStatus).not.toHaveBeenCalled();
  });

  it("fails closed (401) when MODERATION_AGENT_SECRET is unset", async () => {
    delete process.env.MODERATION_AGENT_SECRET;
    expect((await POST(...post({ action: "approve" }, "Bearer anything"))).status).toBe(401);
  });

  it("rejects an unknown action and a missing photo", async () => {
    expect((await POST(...post({ action: "delete" }, "Bearer mod-secret"))).status).toBe(400);
    mocks.setPhotoModerationStatus.mockResolvedValue(false);
    expect((await POST(...post({ action: "approve" }, "Bearer mod-secret"))).status).toBe(404);
  });
});
