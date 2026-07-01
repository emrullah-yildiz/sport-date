import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const put = vi.fn();
const del = vi.fn();
const get = vi.fn();
vi.mock("@vercel/blob", () => ({ put, del, get }));

let storeProfilePhoto: typeof import("./photo-storage").storeProfilePhoto;
let deleteProfilePhotoBlob: typeof import("./photo-storage").deleteProfilePhotoBlob;
let readProfilePhoto: typeof import("./photo-storage").readProfilePhoto;
let isPhotoStorageConfigured: typeof import("./photo-storage").isPhotoStorageConfigured;

const GPS_SENTINEL = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x47, 0x50, 0x53]; // "Exif\0\0GPS"

function contains(haystack: Uint8Array, needle: number[]): boolean {
  outer: for (let i = 0; i + needle.length <= haystack.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (haystack[i + j] !== needle[j]) continue outer;
    return true;
  }
  return false;
}

function jpegWithGps(): Uint8Array {
  const app1 = [...GPS_SENTINEL, 0x11];
  const app1Len = app1.length + 2;
  return Uint8Array.from([
    0xff, 0xd8,
    0xff, 0xe1, (app1Len >> 8) & 0xff, app1Len & 0xff, ...app1,
    0xff, 0xda, 0x00, 0x02, 0x99, 0x88,
    0xff, 0xd9,
  ]);
}

beforeAll(async () => {
  ({ storeProfilePhoto, deleteProfilePhotoBlob, readProfilePhoto, isPhotoStorageConfigured } = await import(
    "./photo-storage"
  ));
});

beforeEach(() => {
  put.mockReset();
  del.mockReset();
  get.mockReset();
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

afterEach(() => {
  delete process.env.BLOB_READ_WRITE_TOKEN;
});

describe("fail closed when the token is absent (local/dev/CI default)", () => {
  it("reports storage unconfigured", () => {
    expect(isPhotoStorageConfigured()).toBe(false);
  });

  it("does not upload and returns not-configured", async () => {
    const result = await storeProfilePhoto("42", "image/jpeg", jpegWithGps());
    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(put).not.toHaveBeenCalled();
  });

  it("does not attempt to read or delete", async () => {
    expect(await readProfilePhoto("profile-photos/42/x")).toEqual({ ok: false, reason: "not-configured" });
    expect(await deleteProfilePhotoBlob("profile-photos/42/x")).toEqual({ ok: false });
    expect(get).not.toHaveBeenCalled();
    expect(del).not.toHaveBeenCalled();
  });
});

describe("with a token present", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_test_token_value";
  });

  it("is configured", () => {
    expect(isPhotoStorageConfigured()).toBe(true);
  });

  it("strips EXIF/GPS metadata before the bytes ever reach the store", async () => {
    put.mockResolvedValue({ pathname: "profile-photos/42/abc" });
    const original = jpegWithGps();
    expect(contains(original, GPS_SENTINEL)).toBe(true);

    const result = await storeProfilePhoto("42", "image/jpeg", original);
    expect(result.ok).toBe(true);
    expect(put).toHaveBeenCalledTimes(1);

    // The buffer handed to the store must NOT contain the GPS/EXIF sentinel.
    const uploadedBody = put.mock.calls[0][1] as Uint8Array;
    expect(contains(Uint8Array.from(uploadedBody), GPS_SENTINEL)).toBe(false);

    // Uploaded privately with a non-guessable, member-scoped pathname.
    const uploadedPath = put.mock.calls[0][0] as string;
    const options = put.mock.calls[0][2] as { access: string; token: string };
    expect(uploadedPath.startsWith("profile-photos/42/")).toBe(true);
    expect(options.access).toBe("private");
    expect(options.token).toBe("vercel_blob_rw_test_token_value");
  });

  it("fails closed (strip-failed) on an unrecognised container, never uploading raw bytes", async () => {
    const result = await storeProfilePhoto("42", "image/jpeg", Uint8Array.from([0x00, 0x01, 0x02]));
    expect(result).toEqual({ ok: false, reason: "strip-failed" });
    expect(put).not.toHaveBeenCalled();
  });

  it("returns error (not a throw) when the store call fails", async () => {
    put.mockRejectedValue(new Error("network"));
    const result = await storeProfilePhoto("42", "image/png", Uint8Array.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 0, 0x49, 0x45, 0x4e, 0x44, 0, 0, 0, 0,
    ]));
    expect(result).toEqual({ ok: false, reason: "error" });
  });

  it("streams a private blob back only through the store client", async () => {
    const stream = new ReadableStream<Uint8Array>();
    get.mockResolvedValue({ statusCode: 200, stream, blob: { contentType: "image/jpeg" } });
    const result = await readProfilePhoto("profile-photos/42/abc");
    expect(result.ok).toBe(true);
    expect(get.mock.calls[0][1]).toMatchObject({ access: "private" });
  });

  it("deletes a blob through the store client", async () => {
    del.mockResolvedValue(undefined);
    expect(await deleteProfilePhotoBlob("profile-photos/42/abc")).toEqual({ ok: true });
    expect(del).toHaveBeenCalledWith("profile-photos/42/abc", expect.objectContaining({ token: expect.any(String) }));
  });
});
