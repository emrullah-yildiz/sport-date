import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  isImageModerationConfigured,
  moderateProfileImage,
  resolveImageModerationProvider,
} from "./image-moderation";

const BYTES = new Uint8Array([1, 2, 3]);

describe("image moderation is FAIL-SAFE (never auto-approves the unverifiable)", () => {
  it("holds for review when NO provider is configured — never 'allow'", async () => {
    const outcome = await moderateProfileImage("image/jpeg", BYTES, { env: {} });
    expect(outcome.decision).toBe("review");
    expect(outcome.provider).toBe("none");
    expect(isImageModerationConfigured({})).toBe(false);
    expect(resolveImageModerationProvider({})).toBeNull();
  });

  it("holds for review when a provider is set but has no implemented classifier", async () => {
    const outcome = await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" } });
    expect(outcome.decision).toBe("review");
    expect(outcome.reason).toBe("provider-not-implemented");
    expect(isImageModerationConfigured({ IMAGE_MODERATION_PROVIDER: "acme" })).toBe(true);
  });

  it("REJECTS an image the classifier flags as explicit", async () => {
    const classify = vi.fn().mockResolvedValue({ explicit: true, uncertain: false });
    const outcome = await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" }, classify });
    expect(outcome.decision).toBe("reject");
    expect(classify).toHaveBeenCalledWith({ contentType: "image/jpeg", bytes: BYTES });
  });

  it("holds an uncertain image for review", async () => {
    const classify = vi.fn().mockResolvedValue({ explicit: false, uncertain: true });
    expect((await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" }, classify })).decision).toBe("review");
  });

  it("allows a positively-clean classification", async () => {
    const classify = vi.fn().mockResolvedValue({ explicit: false, uncertain: false });
    expect((await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" }, classify })).decision).toBe("allow");
  });

  it("holds (never allows) when the classifier throws or returns null — a provider outage can't fail open", async () => {
    const throwing = vi.fn().mockRejectedValue(new Error("provider down"));
    expect((await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" }, classify: throwing })).decision).toBe("review");
    const nulling = vi.fn().mockResolvedValue(null);
    expect((await moderateProfileImage("image/jpeg", BYTES, { env: { IMAGE_MODERATION_PROVIDER: "acme" }, classify: nulling })).decision).toBe("review");
  });
});
