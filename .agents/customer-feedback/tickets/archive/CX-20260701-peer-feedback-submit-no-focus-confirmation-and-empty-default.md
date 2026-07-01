# CX-20260701-peer-feedback-submit-no-focus-confirmation-and-empty-default

- Status: `verified`
- Severity: `medium`
- Priority: `P1` — (Reach 2 × Impact 3 × Confidence 4) / Effort 2 = 12. Arithmetic lands P2, but this is an **accessibility floor** gap (async success is not focus-managed), which the rubric never puts below P1. The empty-default-submit is a separate, smaller data-quality concern folded in because it shares the same submit handler.
- Customer journey: activity → reflection → trust (leaving a private word after a shared event)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Experience & Design Explorer — pass 16, peer-feedback panel × accessibility + completeness-of-states (2026-07-01)
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-post-attendance-peer-signal-safe-minimum` (the verified feature this refines), `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (the shipped focus+announce pattern to mirror), `CX-20260701-verify-email-async-result-not-announced-to-screen-readers` (sibling async-announce gap), `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (product-feedback surface, distinct)

## Customer outcome

As a member leaving a private reliability & respect note about someone I met, I want to clearly know my note was recorded — including as a keyboard or screen-reader user — and I do not want to accidentally file an empty "prefer not to say" note that then locks for 24h, so that the quiet-trust signal stays honest and I stay oriented.

## What I observed

On the ended-event coordination room, `PeerFeedbackPanel` renders one collapsible `<details>` per co-attendee with three radio groups (They showed up / I felt respected / I felt safe) and a submit button. Two issues, both confirmed at source (`apps/web/src/components/PeerFeedbackPanel.tsx`):

1. **Async success is not focus-managed.** On a successful submit the handler sets a `role="status"` message and calls `router.refresh()`, but focus is never moved — it stays on the submit button (now relabelled "Update private note"), and the `<details>` stays expanded showing the still-mutable form beneath a small status line. This is the exact accessibility floor the shipped join-request fix (commit `1d1897a`) established with a focus-moving callback ref (`attachConfirmation` → `node.focus()` on the confirmation heading). The peer-feedback panel, the newest surface, does not follow it: a keyboard/SR member gets a polite announcement but no focus landing and no visible "done" state change, so it is unclear whether the note saved.

2. **All three radios default to `prefer_not_to_say`, and an all-`prefer_not_to_say` submit is accepted and then locks.** `useState` seeds each answer to `prefer_not_to_say` when there is no prior note (`target.given?.showedUp ?? "prefer_not_to_say"`). `validatePeerFeedback` only checks each field is a valid enum, so three `prefer_not_to_say` answers pass. A member who expands a person's `<details>` out of curiosity and clicks "Record privately" without touching a radio silently files a content-free row that occupies the one-per-(event,from,to) slot and locks after the 24h edit window — a wasted, misleading signal about a real person.

## What I expected

- After a successful submit, focus should move to a confirmation element (mirroring the join-request pattern), the form should visibly resolve to a "recorded privately" state rather than leaving the mutable form open, and the announcement should remain (it already uses `role="status"`).
- The submit should not persist a note where the member expressed nothing: either require at least one substantive answer (not all three `prefer_not_to_say`) before enabling submit, or make the initial state clearly unselected so a click without a choice is caught. The "no pressure / you can skip" promise is preserved by simply not creating a row — skipping means leaving the `<details>` closed, not filing an empty one.

## Reproduction

1. As a member who co-attended an event that has now ended, open the coordination room and scroll to "A private word on who you met".
2. Expand a co-attendee's `<details>` and, without changing any radio, click "Record privately".
3. Observe: the submission succeeds with all three answers `prefer_not_to_say`; the row locks after 24h; and (keyboard/SR) focus stays on the button with the form still open.

Reproduction rate: `confirmed via source 2026-07-01` (live all-`prefer_not_to_say` submit not driven to avoid filing a real locked row against a pooled account; route/validation path source-confirmed — a valid-shape payload is accepted, only ratings are rejected).

## Customer impact

Accessibility: a keyboard/screen-reader member cannot tell the note saved and is left with focus stranded on a now-relabelled button over an unchanged form — the same disorientation the join-request ticket fixed. Data quality/trust: content-free notes silently occupy the one-per-pair slot and lock, quietly degrading the honest trust signal the feature exists to build. No authorization, privacy, or precise-location exposure is involved (the verified gating holds). This refines, not reopens, the verified safe-minimum feature.

## Evidence and limits

- Evidence: `PeerFeedbackPanel.tsx` lines 66-98 (default `prefer_not_to_say`, submit handler with `router.refresh()` and no focus move), 100-146 (`<details>` stays open, `role="status"` message but no focus target); `packages/domain/src/peer-feedback.ts` `validatePeerFeedback` (accepts all-`prefer_not_to_say`); `JoinRequestControls.tsx` lines 57-61,131 (the `attachConfirmation` focus pattern to mirror).
- Redactions made: none needed (no member data, no locations, no report narratives).
- Facts: focus is not moved on success; the `<details>` stays expanded; radios default to `prefer_not_to_say`; validation accepts an all-`prefer_not_to_say` payload; the row locks after 24h.
- Hypotheses to verify during implementation: exact desired resolved-state UI (collapse `<details>` vs. inline "recorded" panel); whether "require one substantive answer" or "start unselected" is the better guard against accidental empty submits.
- Paths or surfaces not tested: live all-`prefer_not_to_say` submit (not driven — would file a real locked row); mobile screen-reader.

## Acceptance criteria

- [x] After a successful submit, keyboard/screen-reader focus moves to a confirmation element and the announcement persists (`role="status"`), mirroring the join-request confirmation pattern; the mutable form no longer sits open beneath an ambiguous status line.
- [x] A member cannot silently file a note that says nothing: submitting with no substantive answer (all `prefer_not_to_say` and no note) is prevented or clearly requires a choice first; skipping a person simply leaves no row (no pressure, no penalty).
- [x] The private-by-default, one-per-pair, block-aware, ended-only, edit-window-then-lock, and no-rating guarantees of the parent feature are unchanged.
- [x] Loading/submitting, success, failure, and locked states are all clearly distinguishable to sighted and non-sighted members; the safety "no" nudge to Report/Block still appears and never replaces reporting.
- [x] Mobile and web layouts remain usable; touch targets ≥44px, visible focus, AA contrast, reduced-motion parity (any resolve animation has an instant-swap fallback).
- [x] No precise location or private safety content is exposed to an unauthorized person.
- [x] Relevant automated tests (focus-move on success, empty-submit guard, unchanged gating) and repository checks pass.

## Duplicate check

- Search terms used: "peer", "feedback", "focus", "announce", "confirm", "prefer_not_to_say", "status".
- Tickets reviewed: full queue. `feedback-success-flat-dead-end` is the `/feedback` product form (different surface); `join-request-commitment` and `verify-email-async` are the pattern references, not this surface; `post-attendance-peer-signal-safe-minimum` is the verified feature (this refines it).
- Why this is new: the peer-feedback panel's async submit confirmation + empty-default guard are not covered by any existing ticket.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (pass 16, peer-feedback × accessibility + completeness-of-states); status `ready`.
- 2026-07-01 - Experience Build Agent picked up (P1, highest actionable `ready`); status `in-progress`, owner recorded.
- 2026-07-01 - Experience Build Agent implemented (commit `5953329`); status `implemented` for independent retest. Changes: no pre-selected radio + submit disabled with calm guidance until substantive (one yes/no answer or a note); `validatePeerFeedback` now rejects an all-`prefer_not_to_say`+no-note content-free payload server-side (added `peerFeedbackHasSubstance`); success resolves the `<details>` form in place to a focus-managed "recorded privately" confirmation (`role=status` + focus move via `attachConfirmation`, mirroring `JoinRequestControls`, reduced-motion-safe); failure now `role=alert`; locked state unchanged. Gating (co-attendance/one-per-pair/ended-only/edit-window/no-rating) untouched; Report/Block stays primary. Checks: typecheck pass, lint pass (only warning is in untracked qa/full-flows.mjs), domain test 96 pass, web test 223 pass (added PeerFeedbackPanel + content-floor tests). Live: all-prefer_not_to_say+no-note → 400 content-free reject; one substantive answer → 409 eligibility gate (gating holds). Focus-move-on-success + resolved-state branch source-verified against the shipped join-request pattern (two-co-attendee ended-event path not driven, per ticket, to avoid filing a real locked row).
- 2026-07-01 - **Verified** by Tester (source + unit + static render; the two-co-attendee ended-event live submit is deliberately not driven to avoid filing a real locked row, as the ticket notes). `PeerFeedbackPanel.tsx`: on save, `setResolved(...)` swaps the mutable form for a `.peer-feedback-recorded` `role="status" tabIndex={-1}` confirmation and `attachConfirmation` (callback ref → `node.focus()`) moves focus to it — the exact shipped join-request pattern; no timer/motion so reduced-motion is identical (instant swap). Empty-default guard: radios initialise to `""` (no pre-check), `canSubmit = peerFeedbackHasSubstance(...)` disables the button until a substantive answer/note/star, and `submit()` early-returns on `!canSubmit`; a calm hint says skipping is fine (no row filed). Defense in depth: the domain `validatePeerFeedback` also rejects a content-free payload server-side via `peerFeedbackHasSubstance` (packages/domain/src/peer-feedback.ts:147) — a star now counts as substance too. Failure → `role="alert"`; locked → `role="note"` unchanged; the Report/Block safety nudge stays primary and never replaces reporting. Gating (co-attendance / one-per-pair / ended-only / edit-window / no-rating-in-summary) untouched. 8 panel render tests (no pre-selected radio, disabled-until-substance, re-seed on edit, locked state, safety reminder, labelled keyboard star input) + domain content-floor tests. Repo checks: typecheck/lint pass, test 319 pass/12 skip, production build pass. All criteria met (focus-move-on-async-success is source-verified against the already-live-verified join-request confirmation).
