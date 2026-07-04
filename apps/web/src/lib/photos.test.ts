import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ getDatabase: vi.fn() }));
vi.mock("@/lib/photo-storage", () => ({
  storeProfilePhoto: vi.fn(),
  deleteProfilePhotoBlob: vi.fn(),
}));
vi.mock("@/lib/image-moderation", () => ({ moderateProfileImage: vi.fn() }));

let addProfilePhoto: typeof import("./photos").addProfilePhoto;
let reorderProfilePhotos: typeof import("./photos").reorderProfilePhotos;
let reportProfilePhoto: typeof import("./photos").reportProfilePhoto;
let getDatabase: typeof import("@/lib/db").getDatabase;
let storeProfilePhoto: typeof import("@/lib/photo-storage").storeProfilePhoto;
let deleteProfilePhotoBlob: typeof import("@/lib/photo-storage").deleteProfilePhotoBlob;
let moderateProfileImage: typeof import("@/lib/image-moderation").moderateProfileImage;

// Minimal tagged-template SQL stub. Each call returns the next queued result.
function mockSql(results: unknown[][]) {
  let index = 0;
  const calls: string[] = [];
  const args: unknown[][] = [];
  const sql = (strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push(strings.join("?"));
    args.push(values);
    const result = results[index] ?? [];
    index += 1;
    return Promise.resolve(result);
  };
  (sql as unknown as { transaction: unknown }).transaction = (queries: unknown) =>
    Promise.resolve(Array.isArray(queries) ? queries : []);
  return { sql, calls, args };
}

beforeAll(async () => {
  ({ addProfilePhoto, reorderProfilePhotos, reportProfilePhoto } = await import("./photos"));
  ({ getDatabase } = await import("@/lib/db"));
  ({ storeProfilePhoto, deleteProfilePhotoBlob } = await import("@/lib/photo-storage"));
  ({ moderateProfileImage } = await import("@/lib/image-moderation"));
});

beforeEach(() => {
  vi.mocked(getDatabase).mockReset();
  vi.mocked(storeProfilePhoto).mockReset();
  vi.mocked(deleteProfilePhotoBlob).mockReset();
  vi.mocked(moderateProfileImage).mockReset();
  // Default: a configured provider classed the image clean (approved).
  vi.mocked(moderateProfileImage).mockResolvedValue({ decision: "allow", provider: "test", reason: "clean" });
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
    if (result.ok) {
      expect(result.photo.isPrimary).toBe(true);
      expect(result.held).toBe(false); // clean → approved, visible to others
    }
    expect(deleteProfilePhotoBlob).not.toHaveBeenCalled();
  });

  it("REJECTS an explicit image at upload: nothing is stored and no row is written", async () => {
    vi.mocked(moderateProfileImage).mockResolvedValue({ decision: "reject", provider: "test", reason: "explicit" });
    const result = await addProfilePhoto("42", "image/jpeg", "", new Uint8Array([1]));
    expect(result).toEqual({ ok: false, reason: "rejected" });
    // Fail-safe: the bytes never reached the store and the DB was never touched.
    expect(storeProfilePhoto).not.toHaveBeenCalled();
    expect(getDatabase).not.toHaveBeenCalled();
  });

  it("HOLDS an uncertain/no-provider image as pending and files a system moderation review", async () => {
    vi.mocked(moderateProfileImage).mockResolvedValue({ decision: "review", provider: "none", reason: "no-provider-fail-safe" });
    vi.mocked(storeProfilePhoto).mockResolvedValue({
      ok: true, pathname: "profile-photos/42/x", byteSize: 10, contentType: "image/jpeg",
    });
    const { sql, args } = mockSql([[
      { id: "22222222-2222-4222-8222-222222222222", alt: "", position: 0, is_primary: true, created_at: "t", moderation_status: "pending" },
    ]]);
    let transactionCalls = 0;
    (sql as unknown as { transaction: unknown }).transaction = () => { transactionCalls += 1; return Promise.resolve([]); };
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await addProfilePhoto("42", "image/jpeg", "", new Uint8Array([1]));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.held).toBe(true);
      expect(result.photo.moderationStatus).toBe("pending");
    }
    // The INSERT persisted the pending status…
    expect(args[0]).toContain("pending");
    // …and a system moderation-queue entry was filed (the transaction).
    expect(transactionCalls).toBe(1);
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

  it("reorders 2+ photos in one collision-free set-based statement (CX-20260702)", async () => {
    // Reproduces the old 500: the previous implementation ran a phase-1
    // `SET position = position + 6`, which violates CHECK (position < 6) → 23514.
    // The fix must NOT emit any offset bump and must apply the ordering in a
    // single UPDATE ... FROM unnest(...) so no row transiently collides or goes
    // out of range.
    const { sql, calls, args } = mockSql([[
      { id: "a", alt: "", position: 0, is_primary: true, created_at: "t" },
      { id: "b", alt: "", position: 1, is_primary: false, created_at: "t" },
      { id: "c", alt: "", position: 2, is_primary: false, created_at: "t" },
    ]]);
    vi.mocked(getDatabase).mockReturnValue(sql as never);

    const result = await reorderProfilePhotos("42", ["c", "a", "b"]);
    expect(result.ok).toBe(true);

    // The reorder issues exactly one write after the initial SELECT.
    const writes = calls.slice(1);
    expect(writes).toHaveLength(1);
    const [reorderSql, reorderArgs] = [writes[0], args[1]];
    // No transient constraint-violating offset bump anywhere.
    expect(reorderSql).not.toContain("position + ");
    // Single set-based mapping keyed off the pre-update snapshot.
    expect(reorderSql).toContain("unnest");
    expect(reorderSql).toContain("SET position = v.pos");
    // Reorder touches only positions — is_primary is owned by setPrimaryProfilePhoto,
    // so re-deriving it here would trip the one-primary-per-user partial unique index.
    expect(reorderSql).not.toContain("is_primary");
    // The new order is bound as an id array + a 0..n-1 position array, scoped to
    // the member — so only the member's own rows are touched and every position
    // lands in [0, count): no CHECK (position < 6) violation is possible.
    expect(reorderArgs).toEqual([["c", "a", "b"], [0, 1, 2], "42"]);
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
