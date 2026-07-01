import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/photo-storage", () => ({
  storeProfilePhoto: vi.fn(),
  deleteProfilePhotoBlob: vi.fn(),
}));

let addProfilePhoto: typeof import("./photos").addProfilePhoto;
let reorderProfilePhotos: typeof import("./photos").reorderProfilePhotos;
let reportProfilePhoto: typeof import("./photos").reportProfilePhoto;
let getDatabase: typeof import("@/lib/db").getDatabase;
let storeProfilePhoto: typeof import("@/lib/photo-storage").storeProfilePhoto;
let deleteProfilePhotoBlob: typeof import("@/lib/photo-storage").deleteProfilePhotoBlob;

// Minimal tagged-template SQL stub. Each call returns the next queued result.
function mockSql(results: unknown[][]) {
  let index = 0;
  const calls: string[] = [];
  const sql = (strings: TemplateStringsArray) => {
    calls.push(strings.join("?"));
    const result = results[index] ?? [];
    index += 1;
    return Promise.resolve(result);
  };
  (sql as unknown as { transaction: unknown }).transaction = (queries: unknown) =>
    Promise.resolve(Array.isArray(queries) ? queries : []);
  return { sql, calls };
}

beforeAll(async () => {
  ({ addProfilePhoto, reorderProfilePhotos, reportProfilePhoto } = await import("./photos"));
  ({ getDatabase } = await import("@/lib/db"));
  ({ storeProfilePhoto, deleteProfilePhotoBlob } = await import("@/lib/photo-storage"));
});

beforeEach(() => {
  vi.mocked(getDatabase).mockReset();
  vi.mocked(storeProfilePhoto).mockReset();
  vi.mocked(deleteProfilePhotoBlob).mockReset();
});

describe("addProfilePhoto", () => {
  it("fails closed when storage is not configured (never touches the DB)", async () => {
    vi.mocked(storeProfilePhoto).mockResolvedValue({ ok: false, reason: "not-configured" });
    const result = await addProfilePhoto("42", "image/jpeg", "", new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: "not-configured" });
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("propagates a strip failure without writing a row", async () => {
    vi.mocked(storeProfilePhoto).mockResolvedValue({ ok: false, reason: "strip-failed" });
    const result = await addProfilePhoto("42", "image/jpeg", "", new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: "strip-failed" });
  });

  it("cleans up the orphaned blob and reports 'limit' when the 6-photo guard blocks the insert", async () => {
    vi.mocked(storeProfilePhoto).mockResolvedValue({
      ok: true, pathname: "profile-photos/42/x", byteSize: 10, contentType: "image/jpeg",
    });
    // The guarded INSERT returns zero rows (ceiling reached).
    const { sql } = mockSql([[]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    vi.mocked(deleteProfilePhotoBlob).mockResolvedValue({ ok: true });

    const result = await addProfilePhoto("42", "image/jpeg", "", new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: "limit" });
    expect(deleteProfilePhotoBlob).toHaveBeenCalledWith("profile-photos/42/x");
  });

  it("returns the stored photo on success", async () => {
    vi.mocked(storeProfilePhoto).mockResolvedValue({
      ok: true, pathname: "profile-photos/42/x", byteSize: 10, contentType: "image/jpeg",
    });
    const { sql } = mockSql([[
      { id: "11111111-1111-4111-8111-111111111111", alt: "court", position: 0, is_primary: true, created_at: "2026-07-01T00:00:00Z" },
    ]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await addProfilePhoto("42", "image/jpeg", "court", new Uint8Array([1]));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.photo.isPrimary).toBe(true);
    expect(deleteProfilePhotoBlob).not.toHaveBeenCalled();
  });
});

describe("reorderProfilePhotos", () => {
  it("rejects an order that is not a permutation of the member's photos", async () => {
    const { sql } = mockSql([[
      { id: "a", alt: "", position: 0, is_primary: true, created_at: "t" },
      { id: "b", alt: "", position: 1, is_primary: false, created_at: "t" },
    ]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await reorderProfilePhotos("42", ["a", "z"]);
    expect(result.ok).toBe(false);
  });

  it("accepts a valid permutation", async () => {
    const { sql } = mockSql([[
      { id: "a", alt: "", position: 0, is_primary: true, created_at: "t" },
      { id: "b", alt: "", position: 1, is_primary: false, created_at: "t" },
    ]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await reorderProfilePhotos("42", ["b", "a"]);
    expect(result.ok).toBe(true);
  });
});

describe("reportProfilePhoto", () => {
  it("rejects a report on a non-existent photo", async () => {
    const { sql } = mockSql([[]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await reportProfilePhoto("42", "11111111-1111-4111-8111-111111111111", "other", "bad photo here");
    expect(result).toEqual({ ok: false, reason: "not-found" });
  });

  it("rejects reporting your own photo", async () => {
    const { sql } = mockSql([[{ user_id: "42" }]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await reportProfilePhoto("42", "11111111-1111-4111-8111-111111111111", "other", "bad photo here");
    expect(result).toEqual({ ok: false, reason: "self" });
  });

  it("routes another member's photo into the moderation queue", async () => {
    const { sql, calls } = mockSql([[{ user_id: "99" }]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);
    const result = await reportProfilePhoto("42", "11111111-1111-4111-8111-111111111111", "harassment", "this is harmful content");
    expect(result.ok).toBe(true);
    // Only the ownership lookup ran as a tagged call; the inserts run in a transaction.
    expect(calls[0]).toContain("profile_photos");
  });
});
