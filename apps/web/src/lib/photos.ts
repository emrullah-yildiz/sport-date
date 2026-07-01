import "server-only";

import crypto from "node:crypto";

import {
  MAX_PROFILE_PHOTOS,
  resolvePrimaryPhoto,
  resolveProfilePhotoOrder,
} from "@sport-date/domain";

import { getDatabase } from "@/lib/db";
import { deleteProfilePhotoBlob, storeProfilePhoto } from "@/lib/photo-storage";

// Server-side profile photo domain operations (CX-20260701-profile-photo-series-up-to-six).
//
// Every operation is scoped to the owning user_id — a member can only read, order,
// re-primary, delete, or (in the serve route) fetch their OWN photos, or view
// another member's photos only through the authenticated serve route. The max-6
// ceiling is enforced here with a COUNT guard inside the insert (in addition to
// the domain validator and DB indexes), so a race can never exceed six.

export type ProfilePhoto = Readonly<{
  id: string;
  alt: string;
  position: number;
  isPrimary: boolean;
  createdAt: string;
}>;

type PhotoRow = {
  id: string;
  alt: string;
  position: number;
  is_primary: boolean;
  created_at: string;
};

function mapRow(row: PhotoRow): ProfilePhoto {
  return {
    id: String(row.id),
    alt: row.alt,
    position: row.position,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
  };
}

/** The member's photos in presentation order (primary first among equal positions). */
export async function listProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT id, alt, position, is_primary, created_at
    FROM profile_photos
    WHERE user_id = ${userId}
    ORDER BY position ASC, created_at ASC
  `) as unknown as PhotoRow[];
  return rows.map(mapRow);
}

/** Resolve the pathname of a specific photo owned by a user (for the serve route). */
export async function getOwnedPhotoPathname(userId: string, photoId: string): Promise<string | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT blob_pathname FROM profile_photos WHERE id = ${photoId}::uuid AND user_id = ${userId}
  `) as unknown as Array<{ blob_pathname: string }>;
  return rows[0]?.blob_pathname ?? null;
}

export type AddPhotoResult =
  | { ok: true; photo: ProfilePhoto }
  | { ok: false; reason: "not-configured" | "strip-failed" | "storage-error" | "limit" };

/**
 * Store the bytes in the private blob store (metadata stripped there) and record
 * the photo. The insert is guarded by a COUNT so the 6-photo ceiling holds even
 * under concurrency; if the ceiling is hit the just-stored blob is cleaned up.
 */
export async function addProfilePhoto(
  userId: string,
  contentType: string,
  alt: string,
  bytes: Uint8Array,
): Promise<AddPhotoResult> {
  const stored = await storeProfilePhoto(userId, contentType, bytes);
  if (!stored.ok) {
    if (stored.reason === "not-configured") return { ok: false, reason: "not-configured" };
    if (stored.reason === "strip-failed") return { ok: false, reason: "strip-failed" };
    return { ok: false, reason: "storage-error" };
  }

  const sql = getDatabase();
  const id = crypto.randomUUID();
  try {
    const rows = (await sql`
      INSERT INTO profile_photos (id, user_id, blob_pathname, content_type, byte_size, alt, position, is_primary)
      SELECT ${id}::uuid, ${userId}, ${stored.pathname}, ${stored.contentType}, ${stored.byteSize}, ${alt},
        COALESCE((SELECT MAX(position) + 1 FROM profile_photos WHERE user_id = ${userId}), 0),
        NOT EXISTS (SELECT 1 FROM profile_photos WHERE user_id = ${userId})
      WHERE (SELECT COUNT(*) FROM profile_photos WHERE user_id = ${userId}) < ${MAX_PROFILE_PHOTOS}
        AND EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND account_status = 'active')
      RETURNING id, alt, position, is_primary, created_at
    `) as unknown as PhotoRow[];
    if (rows.length === 0) {
      // Ceiling hit (or account gone) between the storage write and the insert —
      // clean up the orphaned blob so no untracked bytes remain.
      await deleteProfilePhotoBlob(stored.pathname);
      return { ok: false, reason: "limit" };
    }
    return { ok: true, photo: mapRow(rows[0]) };
  } catch (error) {
    await deleteProfilePhotoBlob(stored.pathname);
    throw error;
  }
}

/** Delete a member's photo and its blob. Re-primaries the series if needed. */
export async function deleteProfilePhoto(userId: string, photoId: string): Promise<boolean> {
  const sql = getDatabase();
  const rows = (await sql`
    DELETE FROM profile_photos WHERE id = ${photoId}::uuid AND user_id = ${userId}
    RETURNING blob_pathname, is_primary
  `) as unknown as Array<{ blob_pathname: string; is_primary: boolean }>;
  const removed = rows[0];
  if (!removed) return false;

  // Best-effort blob delete; the row is already gone so the photo no longer shows.
  await deleteProfilePhotoBlob(removed.blob_pathname);

  // If the primary was removed, promote the lowest-position remaining photo so a
  // single-image surface still has something to show.
  if (removed.is_primary) {
    await sql`
      UPDATE profile_photos SET is_primary = TRUE
      WHERE id = (
        SELECT id FROM profile_photos WHERE user_id = ${userId}
        ORDER BY position ASC, created_at ASC LIMIT 1
      )
    `;
  }
  return true;
}

/** Persist a member-chosen ordering. Requested order must be a permutation of theirs. */
export async function reorderProfilePhotos(
  userId: string,
  requestedOrder: readonly string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await listProfilePhotos(userId);
  const resolution = resolveProfilePhotoOrder(current.map((photo) => photo.id), requestedOrder);
  if (!resolution.valid) return { ok: false, error: resolution.error };

  const sql = getDatabase();
  // Two-phase to avoid tripping the (user_id, position) unique index mid-update:
  // offset all positions high, then set the final positions.
  await sql.transaction([
    sql`UPDATE profile_photos SET position = position + ${MAX_PROFILE_PHOTOS} WHERE user_id = ${userId}`,
    ...resolution.order.map(
      (photoId, index) =>
        sql`UPDATE profile_photos SET position = ${index} WHERE id = ${photoId}::uuid AND user_id = ${userId}`,
    ),
  ]);
  return { ok: true };
}

/** Set a member's primary photo. Requested id must be one they own. */
export async function setPrimaryProfilePhoto(
  userId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const current = await listProfilePhotos(userId);
  const resolution = resolvePrimaryPhoto(current.map((photo) => photo.id), photoId);
  if (!resolution.valid) return { ok: false, error: resolution.error };

  const sql = getDatabase();
  await sql.transaction([
    sql`UPDATE profile_photos SET is_primary = FALSE WHERE user_id = ${userId} AND is_primary`,
    sql`UPDATE profile_photos SET is_primary = TRUE WHERE id = ${resolution.primaryId}::uuid AND user_id = ${userId}`,
  ]);
  return { ok: true };
}

/**
 * Purge every photo a member has: delete each private blob (best-effort) and the
 * rows. Called from the account-deletion path so a member's sensitive images are
 * removed from the private store — not just orphaned — when they leave. The DB FK
 * (ON DELETE CASCADE) additionally guarantees the rows go on user hard-deletion,
 * but the external blobs must be deleted explicitly, which is what this does.
 */
export async function purgeProfilePhotosForUser(userId: string): Promise<{ removed: number }> {
  const sql = getDatabase();
  const rows = (await sql`
    DELETE FROM profile_photos WHERE user_id = ${userId} RETURNING blob_pathname
  `) as unknown as Array<{ blob_pathname: string }>;
  await Promise.all(rows.map((row) => deleteProfilePhotoBlob(row.blob_pathname)));
  return { removed: rows.length };
}

export type PhotoReportResult =
  | { ok: true; reportId: string }
  | { ok: false; reason: "not-found" | "self" };

/**
 * Report a photo. Routes into the EXISTING moderation queue (safety_reports +
 * moderation_audit_log) as a report against the photo's owner, tagged with the
 * photo id so a moderator can locate it. A member cannot report their own photo.
 */
export async function reportProfilePhoto(
  reporterId: string,
  photoId: string,
  category: string,
  details: string,
): Promise<PhotoReportResult> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT user_id FROM profile_photos WHERE id = ${photoId}::uuid
  `) as unknown as Array<{ user_id: string | number }>;
  const owner = rows[0];
  if (!owner) return { ok: false, reason: "not-found" };
  const ownerId = String(owner.user_id);
  if (ownerId === reporterId) return { ok: false, reason: "self" };

  const reportId = crypto.randomUUID();
  const detailWithContext = `[profile photo ${photoId}] ${details}`;
  const auditMetadata = JSON.stringify({ category, subject: "profile_photo", photoId });
  await sql.transaction([
    sql`
      INSERT INTO safety_reports (id, reporter_user_id, reported_user_id, category, details, priority)
      VALUES (${reportId}::uuid, ${reporterId}, ${ownerId}, ${category}, ${detailWithContext}, 'standard')
    `,
    sql`
      INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, next_status, metadata)
      VALUES (${reportId}::uuid, 'member', ${reporterId}, 'report_created', 'open', ${auditMetadata}::jsonb)
    `,
  ]);
  return { ok: true, reportId };
}
