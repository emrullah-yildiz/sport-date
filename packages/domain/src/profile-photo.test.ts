import { describe, expect, it } from "vitest";

import {
  ACCEPTED_PROFILE_PHOTO_MIME_TYPES,
  MAX_PROFILE_PHOTOS,
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_ALT_MAX,
  canAddProfilePhoto,
  resolvePrimaryPhoto,
  resolveProfilePhotoOrder,
  validateProfilePhotoUpload,
} from "./profile-photo";

describe("validateProfilePhotoUpload", () => {
  const ok = { mimeType: "image/jpeg", byteSize: 1024, alt: "on the court" };

  it("accepts a valid candidate under the limit", () => {
    const result = validateProfilePhotoUpload(ok, 0);
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.mimeType).toBe("image/jpeg");
      expect(result.alt).toBe("on the court");
    }
  });

  it("accepts every declared MIME type", () => {
    for (const mimeType of ACCEPTED_PROFILE_PHOTO_MIME_TYPES) {
      expect(validateProfilePhotoUpload({ mimeType, byteSize: 10 }, 0).valid).toBe(true);
    }
  });

  it("rejects a 7th photo (max-6 enforced in the domain layer)", () => {
    const result = validateProfilePhotoUpload(ok, MAX_PROFILE_PHOTOS);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toContain("up to 6");
  });

  it("allows exactly the 6th photo (count 5)", () => {
    expect(validateProfilePhotoUpload(ok, MAX_PROFILE_PHOTOS - 1).valid).toBe(true);
  });

  it("rejects an unsupported format (e.g. HEIC / gif / svg)", () => {
    for (const mimeType of ["image/heic", "image/gif", "image/svg+xml", "application/pdf"]) {
      expect(validateProfilePhotoUpload({ mimeType, byteSize: 10 }, 0).valid).toBe(false);
    }
  });

  it("rejects an oversize file", () => {
    const result = validateProfilePhotoUpload({ mimeType: "image/png", byteSize: MAX_PROFILE_PHOTO_BYTES + 1 }, 0);
    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.errors.join(" ")).toContain("too large");
  });

  it("rejects an empty file", () => {
    expect(validateProfilePhotoUpload({ mimeType: "image/png", byteSize: 0 }, 0).valid).toBe(false);
  });

  it("rejects over-long alt text", () => {
    const alt = "x".repeat(PROFILE_PHOTO_ALT_MAX + 1);
    expect(validateProfilePhotoUpload({ ...ok, alt }, 0).valid).toBe(false);
  });

  it("rejects a non-object candidate", () => {
    expect(validateProfilePhotoUpload(null, 0).valid).toBe(false);
    expect(validateProfilePhotoUpload("nope", 0).valid).toBe(false);
  });
});

describe("canAddProfilePhoto", () => {
  it("is true below the limit and false at/above it", () => {
    expect(canAddProfilePhoto(0)).toBe(true);
    expect(canAddProfilePhoto(MAX_PROFILE_PHOTOS - 1)).toBe(true);
    expect(canAddProfilePhoto(MAX_PROFILE_PHOTOS)).toBe(false);
    expect(canAddProfilePhoto(MAX_PROFILE_PHOTOS + 3)).toBe(false);
    expect(canAddProfilePhoto(-1)).toBe(false);
  });
});

describe("resolveProfilePhotoOrder", () => {
  it("accepts a valid permutation", () => {
    const result = resolveProfilePhotoOrder(["a", "b", "c"], ["c", "a", "b"]);
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.order).toEqual(["c", "a", "b"]);
  });

  it("rejects a different length", () => {
    expect(resolveProfilePhotoOrder(["a", "b"], ["a"]).valid).toBe(false);
  });

  it("rejects a foreign id (cannot smuggle in another member's photo)", () => {
    expect(resolveProfilePhotoOrder(["a", "b"], ["a", "z"]).valid).toBe(false);
  });

  it("rejects duplicates", () => {
    expect(resolveProfilePhotoOrder(["a", "b"], ["a", "a"]).valid).toBe(false);
  });
});

describe("resolvePrimaryPhoto", () => {
  it("accepts an owned id", () => {
    const result = resolvePrimaryPhoto(["a", "b"], "b");
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.primaryId).toBe("b");
  });

  it("rejects an unowned id", () => {
    expect(resolvePrimaryPhoto(["a", "b"], "z").valid).toBe(false);
  });
});
