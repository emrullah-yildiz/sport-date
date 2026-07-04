# CX-20260704-feature-image-moderation-nudity-block

- Status: `ready`
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

## Guardrails

- Automated moderation is assistive, not infallible — always keep the human report/queue path; never present the check as a safety guarantee.
- No storing/transmitting member images to a vendor without the owner having provisioned + accepted that vendor (owner-gated card). Prefer an EU/GDPR-appropriate provider.

## Process

- If it needs a table/column (e.g. photo moderation_status), additive migration → commit-not-push + report number. `git pull --rebase`. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
