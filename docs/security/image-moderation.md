# Automated image-safety moderation (profile photos)

Owner directive (2026-07-04): nudity / sexually-explicit images are not allowed
(CX-20260704-feature-image-moderation-nudity-block). Every profile-photo upload is
screened before it can be seen by other members, behind a pluggable, **fail-safe** seam.

## The seam

`apps/web/src/lib/image-moderation.ts` — `moderateProfileImage(contentType, bytes)` returns one of:

- **`reject`** — a configured provider classed the image nude / sexually-explicit. The upload
  path returns a clear, non-shaming error (`422`, code `image-rejected`) and **the bytes are never
  stored**.
- **`review`** — uncertain/borderline, OR no provider configured, OR the provider errored. The
  photo is stored `pending` and routed to the human moderation queue. **We never auto-approve an
  image we could not verify**, so explicit content can never fail open.
- **`allow`** — a configured provider positively classed the image clean → stored `approved`.

The real classifier lives behind an owner-provisioned provider (`IMAGE_MODERATION_PROVIDER` + its
key). Sending member images to a third party is an owner-gated decision (prefer an EU/GDPR
provider); the classifier registry is intentionally empty until then, so **every environment
without a provider resolves to `review`** (held pending) — mirroring the `photo-storage` /
`EMAIL_DELIVERY_ENABLED` fail-closed pattern. A provider outage also degrades to `review`, never
`allow`. EXIF/metadata is already stripped before storage; the moderation path stores/logs no
extra image bytes.

## Data model & visibility

`profile_photos.moderation_status` (`approved` | `pending` | `rejected`, migration 035; existing
rows grandfathered to `approved`). Visibility gate:

- **Owner** sees their own approved + pending photos (`listProfilePhotos`), with a "being checked"
  note on held ones. Rejected rows are excluded (their blob is deleted).
- **Other members** only ever receive **approved** photos (`listApprovedProfilePhotos`, used by the
  viewable-profile read), and the authenticated image serve route additionally streams a
  non-approved photo **only to its own owner**. Pending/rejected photos are never shown to anyone
  else.

## Human review

A photo held for `review` files a **system** entry in the existing moderation queue
(`safety_reports` with a null reporter, subject = the photo owner, category `sexual_misconduct` for
a provider "uncertain" signal or `other` for a neutral awaiting-screening hold; `moderation_audit_log`
`actor_type = 'system'`). A moderator/agent resolves it through the protected internal route
`POST /api/internal/photo-moderation/[photoId]` `{ action: "approve" | "reject" }`, guarded by the
fail-closed `MODERATION_AGENT_SECRET` bearer (members can never reach it). `approve` makes the photo
visible; `reject` hides it and deletes its blob.

## Honesty

Automated moderation is assistive, not infallible — the human report + queue path always remains,
and the check is never presented to members as a safety guarantee. The upload point states plainly:
no nudity or sexual content, and that a new photo may be briefly held for a check.
