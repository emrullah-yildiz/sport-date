// Profile photo series rules (CX-20260701-profile-photo-series-up-to-six).
//
// Pure, storage-agnostic domain logic for a member's optional series of up to six
// profile photos. The rules here are the single source of truth for: how many
// photos are allowed, which formats/sizes are accepted, and how a series is
// reordered / re-primaried / trimmed. They are intentionally free of any I/O,
// blob-storage, or database concern so they can be unit-tested in isolation and
// reused by both the upload validator and the server-side domain layer.
//
// Product stance: photos exist for RECOGNITION and trust before an in-person
// meeting — never for ranking, scoring, or popularity. Nothing here computes an
// "attractiveness", order-of-desirability, or view-count signal. Order is purely
// the member's own presentation choice; "primary" is just which single image is
// shown where one image is shown.

export const MAX_PROFILE_PHOTOS = 6;

// Accepted upload formats. Kept to widely-supported, non-animated raster formats
// that our EXIF-stripping re-encode path understands. HEIC and animated formats
// are deliberately excluded to keep the serving/stripping path simple and safe.
export const ACCEPTED_PROFILE_PHOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type ProfilePhotoMimeType = (typeof ACCEPTED_PROFILE_PHOTO_MIME_TYPES)[number];

// Upper bound on a single upload, before re-encode. 8 MiB comfortably covers a
// phone photo while bounding memory use and abuse.
export const MAX_PROFILE_PHOTO_BYTES = 8 * 1024 * 1024;

// A human-readable summary of the accepted formats/sizes, surfaced to the member
// in the upload UI so the limit and rules are explained (acceptance criterion).
export const PROFILE_PHOTO_RULES_SUMMARY =
  `Up to ${MAX_PROFILE_PHOTOS} photos. JPEG, PNG or WebP, ${Math.round(
    MAX_PROFILE_PHOTO_BYTES / (1024 * 1024),
  )} MB or smaller each. Location and other hidden metadata are removed automatically.`;

// Optional alt text a member can attach for accessibility. Kept short; free-text
// but bounded so it can't become a scraping/contact-detail vector.
export const PROFILE_PHOTO_ALT_MAX = 120;

export type ProfilePhotoUploadCandidate = Readonly<{
  mimeType: string;
  byteSize: number;
  alt?: string | null;
}>;

export type ProfilePhotoUploadValidation =
  | { valid: true; mimeType: ProfilePhotoMimeType; byteSize: number; alt: string }
  | { valid: false; errors: readonly string[] };

/**
 * Validate a single upload candidate against format, size, and current-count
 * rules. `currentCount` is the number of photos the member already has, so the
 * max-6 ceiling is enforced here (the domain layer), not only in SQL. This is the
 * primary guard for the upload path and is fully unit-tested.
 */
export function validateProfilePhotoUpload(
  candidate: unknown,
  currentCount: number,
): ProfilePhotoUploadValidation {
  if (!candidate || typeof candidate !== "object") {
    return { valid: false, errors: ["Photo details are required."] };
  }
  const input = candidate as Record<string, unknown>;
  const mimeType = typeof input.mimeType === "string" ? input.mimeType.trim().toLowerCase() : "";
  const byteSize = typeof input.byteSize === "number" && Number.isFinite(input.byteSize) ? input.byteSize : NaN;
  const alt = typeof input.alt === "string" ? input.alt.trim() : "";
  const errors: string[] = [];

  if (!Number.isInteger(currentCount) || currentCount < 0) {
    errors.push("Could not read your current photos.");
  } else if (currentCount >= MAX_PROFILE_PHOTOS) {
    errors.push(`You can have up to ${MAX_PROFILE_PHOTOS} photos. Remove one to add another.`);
  }
  if (!ACCEPTED_PROFILE_PHOTO_MIME_TYPES.includes(mimeType as ProfilePhotoMimeType)) {
    errors.push("Choose a JPEG, PNG or WebP image.");
  }
  if (!Number.isFinite(byteSize) || byteSize <= 0) {
    errors.push("The image file looks empty.");
  } else if (byteSize > MAX_PROFILE_PHOTO_BYTES) {
    errors.push(`That image is too large. Keep it to ${Math.round(MAX_PROFILE_PHOTO_BYTES / (1024 * 1024))} MB or smaller.`);
  }
  if (alt.length > PROFILE_PHOTO_ALT_MAX) {
    errors.push(`Keep the photo description to ${PROFILE_PHOTO_ALT_MAX} characters or fewer.`);
  }

  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, mimeType: mimeType as ProfilePhotoMimeType, byteSize, alt };
}

export function canAddProfilePhoto(currentCount: number): boolean {
  return Number.isInteger(currentCount) && currentCount >= 0 && currentCount < MAX_PROFILE_PHOTOS;
}

export type ProfilePhotoRef = Readonly<{ id: string }>;

/**
 * Given the member's current photo ids and a requested ordering, return the
 * canonical ordering to persist. The requested order must be a permutation of
 * exactly the current ids (no additions, removals, or duplicates) — otherwise the
 * change is rejected so a reorder can never smuggle in a foreign photo id.
 */
export function resolveProfilePhotoOrder(
  currentIds: readonly string[],
  requestedOrder: readonly string[],
): { valid: true; order: readonly string[] } | { valid: false; error: string } {
  if (requestedOrder.length !== currentIds.length) {
    return { valid: false, error: "The photo order does not match your photos." };
  }
  const currentSet = new Set(currentIds);
  const seen = new Set<string>();
  for (const id of requestedOrder) {
    if (!currentSet.has(id)) return { valid: false, error: "The photo order does not match your photos." };
    if (seen.has(id)) return { valid: false, error: "A photo appears more than once in the order." };
    seen.add(id);
  }
  return { valid: true, order: requestedOrder };
}

/**
 * Decide which photo id is primary after a set-primary request. The requested id
 * must be one the member owns. If the series is empty the result is null.
 */
export function resolvePrimaryPhoto(
  currentIds: readonly string[],
  requestedPrimaryId: string,
): { valid: true; primaryId: string } | { valid: false; error: string } {
  if (!currentIds.includes(requestedPrimaryId)) {
    return { valid: false, error: "That photo is not part of your series." };
  }
  return { valid: true, primaryId: requestedPrimaryId };
}
