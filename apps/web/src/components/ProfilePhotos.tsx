"use client";

import {
  ACCEPTED_PROFILE_PHOTO_MIME_TYPES,
  MAX_PROFILE_PHOTOS,
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_ALT_MAX,
  PROFILE_PHOTO_RULES_SUMMARY,
  validateProfilePhotoUpload,
} from "@sport-date/domain";
import { useEffect, useRef, useState } from "react";

type Photo = {
  id: string;
  alt: string;
  position: number;
  isPrimary: boolean;
  createdAt: string;
  moderationStatus?: "approved" | "pending" | "rejected";
};

const ACCEPT = ACCEPTED_PROFILE_PHOTO_MIME_TYPES.join(",");

// The member's own photo manager: a browsable, reorderable series with upload,
// set-primary, and confirmable delete. Fails closed to a calm message when the
// blob store is not configured (local/dev/CI). No scores, no ranking — order is
// purely the member's presentation choice.
export default function ProfilePhotos({ firstName }: { firstName: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [storageConfigured, setStorageConfigured] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/account/photos")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error())))
      .then((data) => {
        if (!active) return;
        setPhotos(data.photos ?? []);
        setStorageConfigured(Boolean(data.storageConfigured));
        setLoaded(true);
      })
      .catch(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  async function refresh() {
    const response = await fetch("/api/account/photos");
    if (response.ok) {
      const data = await response.json();
      setPhotos(data.photos ?? []);
      setStorageConfigured(Boolean(data.storageConfigured));
    }
  }

  async function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setStatus("");
    const file = event.target.files?.[0];
    if (!file) return;
    // Client-side validation for calm, immediate oversize/invalid-type feedback.
    const validation = validateProfilePhotoUpload({ mimeType: file.type, byteSize: file.size }, photos.length);
    if (!validation.valid) {
      setError(validation.errors[0]);
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("photo", file);
      const response = await fetch("/api/account/photos", { method: "POST", body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "The photo couldn’t be saved.");
      await refresh();
      setStatus(data.held
        ? "Photo added — it’s being checked before others can see it."
        : "Photo added.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "The photo couldn’t be saved.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    const next = [...photos];
    [next[index], next[target]] = [next[target], next[index]];
    setPhotos(next);
    setError("");
    const response = await fetch("/api/account/photos/order", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((photo) => photo.id) }),
    });
    if (!response.ok) {
      setError("Couldn’t save the new order.");
      await refresh();
    } else {
      setStatus("Order updated.");
    }
  }

  async function setPrimary(id: string) {
    setError("");
    const response = await fetch(`/api/account/photos/${id}/primary`, { method: "PUT" });
    if (!response.ok) {
      setError("Couldn’t set the main photo.");
      return;
    }
    setStatus("Main photo updated.");
    await refresh();
  }

  async function remove(id: string) {
    setError("");
    const response = await fetch(`/api/account/photos/${id}`, { method: "DELETE" });
    setPendingDelete(null);
    if (!response.ok) {
      setError("Couldn’t remove that photo.");
      return;
    }
    setStatus("Photo removed.");
    await refresh();
  }

  const atLimit = photos.length >= MAX_PROFILE_PHOTOS;

  return (
    <section className="profile-photos" aria-labelledby="profile-photos-heading">
      <p className="panel-label">Your photos</p>
      <h2 id="profile-photos-heading">How {firstName} looks in person</h2>
      <p className="profile-photos-intro">
        A small series so people can recognise you at the meeting point. Optional, always yours to change — no scores,
        no ranking. {PROFILE_PHOTO_RULES_SUMMARY}
      </p>
      <p className="profile-photos-guideline">
        No nudity or sexual content — this isn’t that kind of platform. Photos are screened automatically before others
        can see them; a new photo may be held briefly for a quick check.
      </p>

      {!storageConfigured && loaded ? (
        <p className="profile-photos-notice" role="status">
          Photo uploads aren’t available yet. Everything else on your profile works as normal — you can add photos once
          this is switched on.
        </p>
      ) : null}

      {error ? <p className="profile-photos-error" role="alert">{error}</p> : null}
      {status ? <p className="profile-photos-status" role="status">{status}</p> : null}

      {loaded && photos.length === 0 ? (
        <p className="profile-empty">No photos yet. Adding one or two helps people feel confident saying yes.</p>
      ) : null}

      {photos.length > 0 ? (
        <ol className="profile-photos-series" aria-label={`${firstName}'s photos, in order`}>
          {photos.map((photo, index) => (
            <li className="profile-photo-item" key={photo.id}>
              <div className="profile-photo-frame">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="profile-photo-image"
                  src={`/api/photos/${photo.id}`}
                  alt={photo.alt || `${firstName}, photo ${index + 1} of ${photos.length}`}
                  loading="lazy"
                  width={220}
                  height={220}
                />
                {photo.isPrimary ? <span className="profile-photo-primary-tag">Main photo</span> : null}
                {photo.moderationStatus === "pending" ? (
                  <span className="profile-photo-pending-tag" role="status">Being checked — only you can see this yet</span>
                ) : null}
                {pendingDelete === photo.id ? (
                  <div className="profile-photo-delete-confirm" role="group" aria-label={`Remove photo ${index + 1}?`}>
                    <span>Remove?</span>
                    <button type="button" className="ppd-yes" onClick={() => remove(photo.id)} aria-label={`Confirm remove photo ${index + 1}`}>
                      Delete
                    </button>
                    <button type="button" className="ppd-no" onClick={() => setPendingDelete(null)} aria-label="Keep photo">
                      Keep
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="profile-photo-delete"
                    onClick={() => setPendingDelete(photo.id)}
                    aria-label={`Remove photo ${index + 1}`}
                    title="Remove photo"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="profile-photo-controls">
                <button
                  type="button"
                  className="profile-photo-btn"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move photo ${index + 1} earlier`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="profile-photo-btn"
                  onClick={() => move(index, 1)}
                  disabled={index === photos.length - 1}
                  aria-label={`Move photo ${index + 1} later`}
                >
                  ↓
                </button>
                {!photo.isPrimary ? (
                  <button type="button" className="profile-photo-btn" onClick={() => setPrimary(photo.id)}>
                    Make main
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {storageConfigured ? (
        <div className="profile-photos-upload">
          <label className="profile-photos-upload-label">
            {atLimit ? `You have the maximum of ${MAX_PROFILE_PHOTOS} photos` : uploading ? "Adding your photo…" : "Add a photo"}
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              onChange={onUpload}
              disabled={uploading || atLimit}
              aria-describedby="profile-photos-heading"
            />
          </label>
          <p className="profile-photos-hint">
            {photos.length} of {MAX_PROFILE_PHOTOS} used · up to {Math.round(MAX_PROFILE_PHOTO_BYTES / (1024 * 1024))} MB ·
            location and hidden metadata are removed automatically.
          </p>
          <p className="profile-photos-hint">
            Alt text can be up to {PROFILE_PHOTO_ALT_MAX} characters for screen readers.
          </p>
        </div>
      ) : null}
    </section>
  );
}
