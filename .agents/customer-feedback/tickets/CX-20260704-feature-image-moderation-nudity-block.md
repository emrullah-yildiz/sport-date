# CX-20260704-feature-image-moderation-nudity-block

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — owner-directive (2026-07-04): nudes / sexually-explicit images are NOT allowed. Safety + brand integrity depend on this.
- Customer journey: a member uploads a profile photo → it is automatically screened → sexual/nude content is rejected before it is ever shown; borderline goes to the moderation queue.
- Surface: photo upload pipeline (`photo-storage.ts` / profile photos) + `moderation.ts`
- Environment and viewport/device: web
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`

## Task

Add an **automated image-safety check** to the photo-upload path that blocks nude / sexually-explicit images, as a **pluggable, fail-safe seam** (mirror the `photo-storage.ts` / `EMAIL_DELIVERY_ENABLED` dark pattern).

## Acceptance criteria

- On upload, before an image is publicly visible, run it through a moderation check. If a provider is configured (env key — e.g. a SafeSearch / nudity-detection API), **reject** images classed as nude/sexually-explicit (clear, non-shaming error to the uploader; the file is not stored or is deleted) and send borderline/uncertain to the existing **moderation queue** for human review.
- **Pluggable + fail-safe:** the provider is behind an env flag/key (owner provisions it — see HQ card). When NO provider is configured, DO NOT silently allow everything: fall back to (a) the existing report-based + manual moderation, and (b) hold new photos as pending/limited-visibility if that's cheap — i.e. fail toward caution, documented. Never fail *open* to explicit content.
- Never store or log the image bytes in the moderation path beyond what's needed; respect existing privacy (EXIF already stripped).
- Clear guideline copy at the upload point: no nudity or sexual content; this is not that kind of platform.
- typecheck/lint/test/prod build green; tests cover: provider-rejects-explicit path, borderline→queue, provider-absent fail-safe behavior (does NOT auto-approve explicit), and the uploader error contract.
- Docs updated (the moderation seam + provider dependency).

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).
- 2026-07-04 | build | implemented in commit 775939a — **MIGRATION ADDED `db/035_profile_photo_moderation.sql` (moderation_status), committed NOT pushed** (orchestrator pushes; deploy auto-migrate; applied to dev DB). Fail-safe pluggable seam `lib/image-moderation.ts` (reject/review/allow; no-provider/error/null → review, never allow; explicit → reject). `addProfilePhoto` screens BEFORE storing: reject → not stored (422 image-rejected), review → pending + system moderation-queue entry, allow → approved. Visibility gate: `listApprovedProfilePhotos` for cross-member views + serve route owner-or-approved. Owner sees pending with "being checked" note; upload guideline copy added. Human review via protected `POST /api/internal/photo-moderation/[id]` {approve|reject} behind fail-closed `MODERATION_AGENT_SECRET`. Checks: typecheck ✓ lint ✓ vitest 900 ✓ (18 new incl. provider-rejects-explicit, borderline→queue, no-provider-never-auto-approves, uploader error contract, fail-closed internal route) prod build ✓. Live-verified internal route (401 no-secret; approve→200 + DB pending→approved; seed cleaned). Docs: `docs/security/image-moderation.md` + runbook env. Unverified: full browser upload happy-path (no BLOB_READ_WRITE_TOKEN in dev) — covered by lib/route tests; prod migration + provider/secret provisioning owner-orchestrated.

## Guardrails

- Automated moderation is assistive, not infallible — always keep the human report/queue path; never present the check as a safety guarantee.
- No storing/transmitting member images to a vendor without the owner having provisioned + accepted that vendor (owner-gated card). Prefer an EU/GDPR-appropriate provider.

## Process

- If it needs a table/column (e.g. photo moderation_status), additive migration → commit-not-push + report number. `git pull --rebase`. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
