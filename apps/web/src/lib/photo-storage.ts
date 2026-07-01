import "server-only";

import crypto from "node:crypto";

import { stripImageMetadata } from "@sport-date/domain";
import { del, get, put } from "@vercel/blob";

// Private photo storage behind Vercel Blob (CX-20260701-profile-photo-series-up-to-six).
//
// Design rules enforced here:
//   1. FAIL CLOSED on missing credential. The read-write token is an owner-provided
//      secret read from the environment (BLOB_READ_WRITE_TOKEN). It is NEVER
//      hardcoded or committed. When it is absent — the default in local/dev/CI —
//      every operation returns a calm { ok: false, reason: "not-configured" } so
//      the rest of /profile keeps working and uploads show a "photo uploads aren't
//      available yet" state instead of throwing.
//   2. EXIF/metadata is stripped BEFORE any bytes reach the store, so a member's
//      precise GPS location can never leak (delegated to the pure, tested
//      stripImageMetadata domain helper).
//   3. Blobs are PRIVATE (access: 'private'); the pathname is non-guessable
//      (random UUIDs) and bytes are only ever streamed back through an
//      authenticated app route — never a public URL.
//   4. All Vercel Blob calls are isolated behind this module so routes/domain code
//      never import @vercel/blob directly, keeping them mockable in tests.

export type PhotoStorageUnavailable = { ok: false; reason: "not-configured" | "strip-failed" | "error" };
export type PhotoUploadSuccess = { ok: true; pathname: string; byteSize: number; contentType: string };
export type PhotoUploadResult = PhotoUploadSuccess | PhotoStorageUnavailable;
export type PhotoStreamResult =
  | { ok: true; stream: ReadableStream<Uint8Array>; contentType: string }
  | PhotoStorageUnavailable;

const TOKEN_ENV_KEYS = ["BLOB_READ_WRITE_TOKEN"] as const;

/** Read the owner-provided Blob token from the environment, or null if unset. */
function readBlobToken(): string | null {
  for (const key of TOKEN_ENV_KEYS) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

/**
 * Whether photo uploads/serving are available. False in local/dev/CI where the
 * token is unset; the UI uses this to render the calm fail-closed state.
 */
export function isPhotoStorageConfigured(): boolean {
  return readBlobToken() !== null;
}

/**
 * Store an image for a member. Strips metadata first (fail closed if the container
 * is unrecognised), then uploads the scrubbed bytes to a private, non-guessable
 * pathname. Returns a typed unavailable result rather than throwing when the token
 * is absent or the store errors.
 */
export async function storeProfilePhoto(
  userId: string,
  contentType: string,
  bytes: Uint8Array,
): Promise<PhotoUploadResult> {
  const token = readBlobToken();
  if (!token) return { ok: false, reason: "not-configured" };

  const scrubbed = stripImageMetadata(contentType, bytes);
  if (!scrubbed) return { ok: false, reason: "strip-failed" };

  // Non-guessable pathname: member scope + two random UUIDs. Kept private so the
  // resulting blob URL is never directly retrievable without authentication.
  const pathname = `profile-photos/${userId}/${crypto.randomUUID()}-${crypto.randomUUID()}`;
  try {
    const result = await put(pathname, Buffer.from(scrubbed), {
      access: "private",
      contentType,
      addRandomSuffix: false,
      token,
    });
    return { ok: true, pathname: result.pathname, byteSize: scrubbed.byteLength, contentType };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Stream a private blob's bytes back (used only by the authenticated serve route). */
export async function readProfilePhoto(pathname: string): Promise<PhotoStreamResult> {
  const token = readBlobToken();
  if (!token) return { ok: false, reason: "not-configured" };
  try {
    const result = await get(pathname, { access: "private", token });
    if (!result || result.statusCode !== 200 || !result.stream) return { ok: false, reason: "error" };
    return { ok: true, stream: result.stream, contentType: result.blob.contentType };
  } catch {
    return { ok: false, reason: "error" };
  }
}

/** Delete a member's blob (best-effort; used on photo delete and account deletion). */
export async function deleteProfilePhotoBlob(pathname: string): Promise<{ ok: boolean }> {
  const token = readBlobToken();
  if (!token) return { ok: false };
  try {
    await del(pathname, { token });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
