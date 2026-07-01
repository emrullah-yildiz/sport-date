import {
  MAX_PROFILE_PHOTO_BYTES,
  validateProfilePhotoUpload,
} from "@sport-date/domain";
import { NextResponse } from "next/server";

import { addProfilePhoto, listProfilePhotos } from "@/lib/photos";
import { isPhotoStorageConfigured } from "@/lib/photo-storage";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

// The member's own photo series (metadata only — bytes are served separately
// through the authenticated image route).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const photos = await listProfilePhotos(user.id);
  return NextResponse.json({ photos, storageConfigured: isPhotoStorageConfigured() });
}

// Upload one photo (multipart form-data: `photo` file + optional `alt`). Fails
// closed with a calm message when the Blob token is absent.
export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Upload the photo as form data." }, { status: 400 });
  }
  const file = form.get("photo");
  const alt = typeof form.get("alt") === "string" ? (form.get("alt") as string) : "";
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a photo to upload." }, { status: 400 });
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return NextResponse.json({ error: "That image is too large." }, { status: 413 });
  }

  const existing = await listProfilePhotos(user.id);
  const validation = validateProfilePhotoUpload(
    { mimeType: file.type, byteSize: file.size, alt },
    existing.length,
  );
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const result = await addProfilePhoto(user.id, validation.mimeType, validation.alt, bytes);
  if (!result.ok) {
    if (result.reason === "not-configured") {
      return NextResponse.json(
        { error: "Photo uploads aren’t available yet. The rest of your profile is unaffected.", code: "storage-unavailable" },
        { status: 503 },
      );
    }
    if (result.reason === "limit") {
      return NextResponse.json({ error: "You can have up to 6 photos. Remove one to add another." }, { status: 409 });
    }
    if (result.reason === "strip-failed") {
      return NextResponse.json({ error: "That image couldn’t be processed. Try a JPEG, PNG or WebP." }, { status: 400 });
    }
    return NextResponse.json({ error: "The photo couldn’t be saved. Please try again." }, { status: 502 });
  }
  return NextResponse.json({ success: true, photo: result.photo }, { status: 201 });
}
