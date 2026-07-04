"use client";

import { motion } from "framer-motion";
import {
  ACCEPTED_PROFILE_PHOTO_MIME_TYPES,
  MAX_PROFILE_PHOTOS,
  MAX_PROFILE_PHOTO_BYTES,
  validateProfilePhotoUpload,
} from "@sport-date/domain";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSignUpStore } from "@/lib/sign-up-store";

const ACCEPT = ACCEPTED_PROFILE_PHOTO_MIME_TYPES.join(",");

// A local preview whose object URL is created for the file and revoked when it
// changes or unmounts, so selecting photos during signup never leaks blob URLs.
function PhotoPreview({ file, index, onRemove }: { file: File; index: number; onRemove: () => void }) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(url), [url]);
  return (
    <li className="signup-photo-item">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="signup-photo-thumb" src={url} alt={`Selected photo ${index + 1}`} width={96} height={96} />
      <button type="button" className="signup-photo-remove" onClick={onRemove} aria-label={`Remove photo ${index + 1}`}>Remove</button>
    </li>
  );
}

// Optional photos, collected during signup and uploaded to the existing
// /api/account/photos endpoint right after the account is created (see
// SignUpForm). Skippable — a nudge, never a gate. Automated moderation still
// applies once uploaded.
export default function StepPhotos() {
  const photos = useSignUpStore((state) => state.additionalPhotos);
  const addAdditionalPhoto = useSignUpStore((state) => state.addAdditionalPhoto);
  const removeAdditionalPhoto = useSignUpStore((state) => state.removeAdditionalPhoto);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const atLimit = photos.length >= MAX_PROFILE_PHOTOS;

  function onSelect(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    const file = event.target.files?.[0];
    if (fileInput.current) fileInput.current.value = "";
    if (!file) return;
    const validation = validateProfilePhotoUpload({ mimeType: file.type, byteSize: file.size }, photos.length);
    if (!validation.valid) return setError(validation.errors[0]);
    addAdditionalPhoto(file);
  }

  return (
    <motion.div className="signup-step">
      <h1>Add a photo or two?</h1>
      <p>Optional, but a friendly face helps people feel confident saying yes. You can always add or change photos later. No nudity or sexual content — new photos are checked before others can see them.</p>

      {photos.length > 0 ? (
        <ul className="signup-photo-series" aria-label="Photos you've selected">
          {photos.map((file, index) => (
            <PhotoPreview key={`${file.name}-${file.size}-${index}`} file={file} index={index} onRemove={() => removeAdditionalPhoto(index)} />
          ))}
        </ul>
      ) : null}

      {error ? <p className="field-error" role="alert">{error}</p> : null}

      <div className="form-group">
        <label className="signup-photo-add">
          {atLimit ? `You've selected the maximum of ${MAX_PROFILE_PHOTOS}` : "Choose a photo"}
          <input ref={fileInput} type="file" accept={ACCEPT} onChange={onSelect} disabled={atLimit} />
        </label>
        <p className="field-format-hint">
          {photos.length} of {MAX_PROFILE_PHOTOS} selected · up to {Math.round(MAX_PROFILE_PHOTO_BYTES / (1024 * 1024))} MB each · location and hidden metadata are removed automatically. This step is optional — you can skip it.
        </p>
      </div>
    </motion.div>
  );
}
