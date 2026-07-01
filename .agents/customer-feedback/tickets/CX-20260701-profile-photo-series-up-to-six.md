# CX-20260701-profile-photo-series-up-to-six

- Status: `blocked-owner`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 5 × Confidence 4) / Effort 4 = 25, held at P1: owner-requested and central to "who am I meeting" trust. BLOCKED: owner is choosing the production image storage stack before build begins.
- Owner decision (2026-07-01): HOLD build until the owner selects a production storage provider. Launch moderation stance chosen = **report-based + manual review** (photos visible on upload; members can report; existing moderation queue handles takedowns) — build to this model once unblocked. Do not scaffold against a stub in the meantime.
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

## Escalation note (owner decision)

This needs decisions that fall under the escalation policy before production: image storage/hosting provider and cost, content moderation approach for user-uploaded images, and retention/deletion. The implementer should build the UI + data model and a dev-safe storage path first, and raise the storage/moderation/cost decision to the owner (mark `blocked-owner` on those sub-parts) rather than silently choosing a paid or production service.

## Acceptance criteria

- [ ] A member can upload, reorder, set primary, and delete up to 6 photos; the limit and accepted formats/sizes are explained.
- [ ] Photos appear on the member's profile as a browsable series; a primary photo is used where a single image is shown.
- [ ] Upload has clear loading, failure, and oversize/invalid-type states; deletion is confirmable and effective (including from export/deletion flows).
- [ ] Photos are not retrievable by unauthenticated requests; URLs are not guessable/scrapeable; no precise-location EXIF is leaked (strip metadata).
- [ ] Accessibility: alt handling, keyboard reorder/delete, focus, 44px targets; reduced-motion safe; on-brand.
- [ ] No attractiveness scoring, ranking, or public popularity metric is introduced.
- [ ] Storage/moderation/cost decision recorded; account export and deletion include photos.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready` (storage/moderation sub-parts pending owner decision).
- 2026-07-01 - Owner elected to HOLD until a production storage stack is chosen; moderation stance set to report-based + manual review. Status → `blocked-owner`. Loop skips this ticket until the owner unblocks the storage choice.
