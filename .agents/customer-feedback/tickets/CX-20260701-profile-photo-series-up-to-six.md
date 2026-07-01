# CX-20260701-profile-photo-series-up-to-six

- Status: `ready`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 5 × Confidence 4) / Effort 4 = 25, held at P1: owner-requested and central to "who am I meeting" trust. UNBLOCKED 2026-07-01: owner selected the production storage stack and moderation stance (see below); build may proceed.
- Owner decision (2026-07-01): storage provider = **Vercel Blob** (private store; signed / non-guessable URLs; EXIF stripped on upload; included in account export + hard-deletion). Moderation stance = **report-based + manual review** via the existing moderation queue (photos visible on upload; members can report; moderators action takedowns). All existing guardrails stand (up to 6, optional, reorder / set-primary / delete, not retrievable unauthenticated, no attractiveness / popularity / ranking mechanics). The Vercel Blob token/credential is an **owner-provided secret** to be added at build/deploy time — the implementer must NOT invent, hardcode, or commit any secret; wire the integration to read the token from the environment and fail closed if it is absent.
- Customer journey: trust check / intent
- Surface: `web` (and mobile later)
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-01)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-profile-lacks-rich-browsable-detail`

## Customer outcome

As a member deciding whether to meet someone, I want to see a small series of their photos (up to 6) so that I can recognise them and feel safer about who I'm meeting.

## What I observed

There is no photo support anywhere — profile, create-event, and event pages are entirely text-only (grep for photo/image/upload/avatar returns nothing in those surfaces). Members are represented only by initials.

## What I expected

A member can add up to 6 photos to their profile, reorder them, set a primary, and remove them. Other members see the series on the profile in a clear, browsable way. Visibility respects the product's privacy posture (photos are not exposed to unauthenticated scraping; approximate-location and pre-acceptance privacy rules are unaffected).

## Reproduction

1. Open `/profile`. There is no way to add a photo.

Reproduction rate: `confirmed; feature absent`

## Customer impact

Without any photo, recognition at the meeting point is harder and the trust check before committing is weaker — directly relevant to a safe in-person encounter. Photos are sensitive personal data: they must be stored, served, and moderated carefully, and must not become a scraping or harassment vector.

## Escalation note (owner decision — RESOLVED 2026-07-01)

The escalation-policy decisions this feature required — image storage/hosting provider, content moderation approach for user-uploaded images, and retention/deletion — have been **made by the owner**: storage = Vercel Blob (private, signed/non-guessable URLs, EXIF stripped on upload, included in export + hard-deletion); moderation = report-based + manual review via the existing moderation queue. The only remaining owner-supplied input is the **Vercel Blob token/credential**, which is a secret to be provided at build/deploy time. The implementer must read that token from the environment (never invent, hardcode, or commit it) and build the UI + data model + upload/serve/delete path against the private store; no further owner escalation is required to begin.

## Acceptance criteria

- [ ] A member can upload, reorder, set primary, and delete up to 6 photos; the limit and accepted formats/sizes are explained.
- [ ] Photos appear on the member's profile as a browsable series; a primary photo is used where a single image is shown.
- [ ] Upload has clear loading, failure, and oversize/invalid-type states; deletion is confirmable and effective (including from export/deletion flows).
- [ ] Photos are stored in **Vercel Blob (private)**; not retrievable by unauthenticated requests; URLs are signed / non-guessable / non-scrapeable; no precise-location EXIF is leaked (strip metadata on upload).
- [ ] The Vercel Blob token is read from the environment (owner-provided secret); no secret is invented, hardcoded, or committed; the integration fails closed if the token is absent.
- [ ] Report-based moderation: a member can report a photo and it routes to the existing moderation queue for manual review/takedown.
- [ ] Accessibility: alt handling, keyboard reorder/delete, focus, 44px targets; reduced-motion safe; on-brand.
- [ ] No attractiveness scoring, ranking, or public popularity metric is introduced.
- [x] Storage/moderation decision recorded (Vercel Blob + report-based manual review, 2026-07-01); account export and deletion include photos.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready` (storage/moderation sub-parts pending owner decision).
- 2026-07-01 - Owner elected to HOLD until a production storage stack is chosen; moderation stance set to report-based + manual review. Status → `blocked-owner`. Loop skips this ticket until the owner unblocks the storage choice.
- 2026-07-01 - **Owner decision — UNBLOCKED.** Storage provider = **Vercel Blob** (private store; signed / non-guessable URLs; EXIF stripped on upload; photos included in account export + hard-deletion). Moderation = **report-based + manual review** via the existing moderation queue. All prior guardrails retained (up to 6, optional, reorder / set-primary / delete, not retrievable unauthenticated, no attractiveness / popularity mechanics). The Vercel Blob token is an **owner-provided secret** added at build/deploy time — the implementer reads it from the environment and must NOT invent, hardcode, or commit a secret; integration fails closed without it. Status `blocked-owner` → `ready`. The loop may pick this up.
