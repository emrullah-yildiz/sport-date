import "server-only";

import crypto from "node:crypto";

import {
  MAX_PROFILE_PHOTOS,
  resolvePrimaryPhoto,
  resolveProfilePhotoOrder,
} from "@sport-date/domain";

import { getDatabase } from "@/lib/db";
import { moderateProfileImage } from "@/lib/image-moderation";
import { deleteProfilePhotoBlob, storeProfilePhoto } from "@/lib/photo-storage";

export type PhotoModerationStatus = "approved" | "pending" | "rejected";

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
  /** Automated-safety state. Only 'approved' photos are shown to other members. */
  moderationStatus: PhotoModerationStatus;
}>;

type PhotoRow = {
  id: string;
  alt: string;
  position: number;
  is_primary: boolean;
  created_at: string;
  moderation_status: PhotoModerationStatus;
};

function mapRow(row: PhotoRow): ProfilePhoto {
  return {
    id: String(row.id),
    alt: row.alt,
    position: row.position,
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    moderationStatus: row.moderation_status,
  };
}

/**
 * The OWNER's own photos (every status), in presentation order. The owner sees
 * their pending/rejected photos with their state so the UI can explain that a
 * held photo isn't visible to others yet.
 */
export async function listProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
  const sql = getDatabase();
  // Approved + pending (held) only. A 'rejected' photo has had its blob deleted,
  // so it is excluded here — it would otherwise render as a broken image.
  const rows = (await sql`
    SELECT id, alt, position, is_primary, created_at, moderation_status
    FROM profile_photos
    WHERE user_id = ${userId} AND moderation_status <> 'rejected'
    ORDER BY position ASC, created_at ASC
  `) as unknown as PhotoRow[];
  return rows.map(mapRow);
}

/**
 * The APPROVED photos of a member, for viewing by OTHER members. Pending photos
 * (uncertain or awaiting screening) and rejected photos are never surfaced to a
 * viewer — the automated fail-safe hold. Callers must still apply the block gate.
 */
export async function listApprovedProfilePhotos(userId: string): Promise<ProfilePhoto[]> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT id, alt, position, is_primary, created_at, moderation_status
    FROM profile_photos
    WHERE user_id = ${userId} AND moderation_status = 'approved'
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
  | { ok: true; photo: ProfilePhoto; held: boolean }
  | { ok: false; reason: "not-configured" | "strip-failed" | "storage-error" | "limit" | "rejected" };

/**
 * File a SYSTEM entry in the existing moderation queue for a photo held for
 * review (borderline classification, or no provider configured). No member is
 * the reporter (reporter_user_id is left NULL); the subject is the photo owner.
 * The photo id + reason travel in the details/metadata so a moderator can locate
 * it. Best-effort — a queue-write failure must not fail the upload.
 */
async function fileSystemPhotoReview(userId: string, photoId: string, reason: string): Promise<void> {
  try {
    const sql = getDatabase();
    // A provider "uncertain" flag is a potential-sexual-content signal; a plain
    // hold (no provider / not implemented / error) is a neutral awaiting-screening
    // item. Categorise honestly so the queue isn't mislabelled.
    const isSexualSignal = reason === "uncertain" || reason === "explicit";
    const category = isSexualSignal ? "sexual_misconduct" : "other";
    const priority = isSexualSignal ? "urgent" : "standard";
    const details = `[auto image screening] profile photo ${photoId} held for review (reason: ${reason}). Awaiting a moderator decision; the photo is hidden from other members until approved.`;
    const reportId = crypto.randomUUID();
    const metadata = JSON.stringify({ subject: "profile_photo", photoId, reason, source: "image-moderation" });
    await sql.transaction([
      sql`
        INSERT INTO safety_reports (id, reporter_user_id, reported_user_id, category, details, priority)
        VALUES (${reportId}::uuid, NULL, ${userId}, ${category}, ${details}, ${priority})
      `,
      sql`
        INSERT INTO moderation_audit_log (report_id, actor_type, actor_user_id, action, next_status, metadata)
        VALUES (${reportId}::uuid, 'system', NULL, 'report_created', 'open', ${metadata}::jsonb)
      `,
    ]);
  } catch (error) {
    console.error("Failed to file system photo-review report (non-fatal):", error);
  }
}

/**
 * Screen, then store. The image is FIRST run through the fail-safe moderation
 * seam (`moderateProfileImage`):
 *   - "reject" (nude/sexually-explicit) → the bytes are NEVER stored; a calm,
 *     non-shaming rejection is returned.
 *   - "review" (uncertain, or no provider configured, or provider error) → the
 *     photo is stored as `pending` (shown only to its owner) and a system entry
 *     is filed in the moderation queue for human review. We never auto-approve
 *     an unverifiable image, so explicit content can never fail open.
 *   - "allow" (a configured provider classed it clean) → stored `approved`.
 * The 6-photo ceiling is still enforced by the COUNT-guarded insert; a held/
 * approved orphan blob is cleaned up if the ceiling is hit.
 */
export async function addProfilePhoto(
  userId: string,
  contentType: string,
  alt: string,
  bytes: Uint8Array,
): Promise<AddPhotoResult> {
  // Screen BEFORE anything is stored, so rejected bytes never reach the store.
  const moderation = await moderateProfileImage(contentType, bytes);
  if (moderation.decision === "reject") {
    return { ok: false, reason: "rejected" };
  }
  const status: PhotoModerationStatus = moderation.decision === "allow" ? "approved" : "pending";

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
      INSERT INTO profile_photos (id, user_id, blob_pathname, content_type, byte_size, alt, position, is_primary, moderation_status)
      SELECT ${id}::uuid, ${userId}, ${stored.pathname}, ${stored.contentType}, ${stored.byteSize}, ${alt},
        COALESCE((SELECT MAX(position) + 1 FROM profile_photos WHERE user_id = ${userId}), 0),
        NOT EXISTS (SELECT 1 FROM profile_photos WHERE user_id = ${userId}),
        ${status}
      WHERE (SELECT COUNT(*) FROM profile_photos WHERE user_id = ${userId}) < ${MAX_PROFILE_PHOTOS}
        AND EXISTS (SELECT 1 FROM users WHERE id = ${userId} AND account_status = 'active')
      RETURNING id, alt, position, is_primary, created_at, moderation_status
    `) as unknown as PhotoRow[];
    if (rows.length === 0) {
      // Ceiling hit (or account gone) between the storage write and the insert —
      // clean up the orphaned blob so no untracked bytes remain.
      await deleteProfilePhotoBlob(stored.pathname);
      return { ok: false, reason: "limit" };
    }
    if (status === "pending") {
      await fileSystemPhotoReview(userId, id, moderation.reason);
    }
    return { ok: true, photo: mapRow(rows[0]), held: status === "pending" };
  } catch (error) {
    await deleteProfilePhotoBlob(stored.pathname);
    throw error;
  }
}

/**
 * Resolve a photo held for review — the moderator/agent decision. `approve`
 * makes it visible to others; `reject` hides it and deletes its blob (the bytes
 * leave the store). Returns false when the photo doesn't exist. Used by the
 * protected internal moderation route.
 */
export async function setPhotoModerationStatus(photoId: string, action: "approve" | "reject"): Promise<boolean> {
  const sql = getDatabase();
  if (action === "reject") {
    const rows = (await sql`
      UPDATE profile_photos SET moderation_status = 'rejected'
      WHERE id = ${photoId}::uuid AND moderation_status <> 'rejected'
      RETURNING blob_pathname
    `) as unknown as Array<{ blob_pathname: string }>;
    if (rows.length === 0) return false;
    // A rejected image should not linger in the store.
    await deleteProfilePhotoBlob(rows[0].blob_pathname);
    return true;
  }
  const rows = (await sql`
    UPDATE profile_photos SET moderation_status = 'approved'
    WHERE id = ${photoId}::uuid
    RETURNING id
  `) as unknown as Array<{ id: string }>;
  return rows.length > 0;
}

export type PendingModerationPhoto = Readonly<{
  id: string;
  memberId: string;
  contentType: string;
  alt: string;
  createdAt: string;
}>;

/**
 * The pending photo queue for the internal photo-moderation agent
 * (CX-20260704-photo-review-agent-access). Minimal metadata only — the photo id
 * (to view + decide), the internal member id (so a moderator can act on the
 * owner if needed), content type, alt, and when it was uploaded. No member PII
 * beyond the internal id, and NO image bytes. Caller (internal route) enforces
 * the MODERATION_AGENT_SECRET bearer.
 */
export async function listPendingPhotosForModeration(limit = 100): Promise<PendingModerationPhoto[]> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT id, user_id, content_type, alt, created_at
    FROM profile_photos
    WHERE moderation_status = 'pending'
    ORDER BY created_at ASC
    LIMIT ${Math.min(Math.max(1, limit), 200)}
  `) as unknown as Array<{ id: string; user_id: string | number; content_type: string; alt: string; created_at: string }>;
  return rows.map((row) => ({
    id: String(row.id),
    memberId: String(row.user_id),
    contentType: row.content_type,
    alt: row.alt,
    createdAt: row.created_at,
  }));
}

/**
 * Resolve a photo's private blob pathname for the internal moderation image view,
 * regardless of moderation status or owner. Used ONLY by the secret-guarded
 * internal image route so the agent can look at a pending image before deciding.
 * Never exposed publicly. Returns null when the photo doesn't exist.
 */
export async function getPhotoBlobForModeration(photoId: string): Promise<{ pathname: string; contentType: string } | null> {
  const sql = getDatabase();
  const rows = (await sql`
    SELECT blob_pathname, content_type FROM profile_photos WHERE id = ${photoId}::uuid
  `) as unknown as Array<{ blob_pathname: string; content_type: string }>;
  return rows[0] ? { pathname: rows[0].blob_pathname, contentType: rows[0].content_type } : null;
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
  // Apply the whole new ordering in ONE set-based statement inside a transaction.
  // Each row's final position is computed from the pre-update snapshot via
  // unnest(ids, positions), and the (user_id, position) uniqueness is now a
  // DEFERRABLE INITIALLY DEFERRED constraint (migration 028), so it is checked
  // once at COMMIT rather than per row — the mid-permutation state where two rows
  // briefly share a slot is allowed as long as the final positions are unique.
  //
  // This replaces the old two-phase hack that bumped every position by +6 to dodge
  // a non-deferrable unique index; +6 violated the CHECK (position < 6) and 500'd
  // for anyone with 2+ photos (CX-20260702). The order is already validated as an
  // exact permutation of the member's own ids above, so only their rows match and
  // every final position lands in [0, count).
  //
  // Reorder ONLY changes positions — it does not touch is_primary. Which photo is
  // primary is an independent choice owned by setPrimaryProfilePhoto; re-deriving
  // it here would transiently leave two rows primary and trip the one-primary
  // partial unique index (which is not deferrable).
  const ids = [...resolution.order];
  const positions = resolution.order.map((_photoId, index) => index);
  await sql.transaction([
    sql`
      UPDATE profile_photos AS p
      SET position = v.pos
      FROM unnest(${ids}::uuid[], ${positions}::int[]) AS v(id, pos)
      WHERE p.id = v.id AND p.user_id = ${userId}
    `,
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
