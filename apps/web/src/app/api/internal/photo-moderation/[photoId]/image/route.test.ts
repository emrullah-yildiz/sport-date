import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPhotoBlobForModeration: vi.fn(),
  readProfilePhoto: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/photos", () => ({ getPhotoBlobForModeration: mocks.getPhotoBlobForModeration }));
vi.mock("@/lib/photo-storage", () => ({ readProfilePhoto: mocks.readProfilePhoto }));

import { GET } from "./route";

const PHOTO_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORIGINAL = process.env.MODERATION_AGENT_SECRET;

function get(auth?: string, photoId = PHOTO_ID): Parameters<typeof GET> {
  const request = new Request(`https://keepitup.example/api/internal/photo-moderation/${photoId}/image`, {
    headers: auth ? { authorization: auth } : {},
  });
  return [request, { params: Promise.resolve({ photoId }) }];
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.MODERATION_AGENT_SECRET = "mod-secret";
  mocks.getPhotoBlobForModeration.mockResolvedValue({ pathname: "profile-photos/42/x", contentType: "image/jpeg" });
  mocks.readProfilePhoto.mockResolvedValue({ ok: true, stream: new ReadableStream(), contentType: "image/jpeg" });
});
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.MODERATION_AGENT_SECRET;
  else process.env.MODERATION_AGENT_SECRET = ORIGINAL;
});

describe("GET /api/internal/photo-moderation/[photoId]/image — agent image view", () => {
  it("streams the bytes for a correct secret, never cached or indexed", async () => {
    const response = await GET(...get("Bearer mod-secret"));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Robots-Tag")).toContain("noindex");
    expect(mocks.readProfilePhoto).toHaveBeenCalledWith("profile-photos/42/x");
  });

  it("401s without the secret and NEVER fetches the bytes (pending images aren't public)", async () => {
    expect((await GET(...get())).status).toBe(401);
    expect((await GET(...get("Bearer wrong"))).status).toBe(401);
    expect(mocks.getPhotoBlobForModeration).not.toHaveBeenCalled();
    expect(mocks.readProfilePhoto).not.toHaveBeenCalled();
  });

  it("fails closed (401) when the secret is unset", async () => {
    delete process.env.MODERATION_AGENT_SECRET;
    expect((await GET(...get("Bearer anything"))).status).toBe(401);
  });

  it("404s an unknown photo and a malformed id", async () => {
    mocks.getPhotoBlobForModeration.mockResolvedValue(null);
    expect((await GET(...get("Bearer mod-secret"))).status).toBe(404);
    expect((await GET(...get("Bearer mod-secret", "not-a-uuid"))).status).toBe(404);
  });
});
