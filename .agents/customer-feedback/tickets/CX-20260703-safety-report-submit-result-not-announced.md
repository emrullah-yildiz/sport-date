# CX-20260703-safety-report-submit-result-not-announced

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — (Reach 3 × Impact 4 × Confidence 5) / Effort 2 = 30. Per the loop's rule an accessibility regression is never below P1, and this sits on the **safety report / appeal submit path** (the moment a member is told whether their report was recorded or failed), so it stays P1 rather than being bucketed down. Components: `apps/web/src/components/ReportSafetyControls.tsx`, `apps/web/src/components/SafetyAppealForm.tsx` (member-facing); the same pattern also in the staff `apps/web/src/components/ModerationCaseForm.tsx` / `ModerationAppealForm.tsx`.
- Customer journey: coordinate & arrive → report/block a member, then track/appeal a decision in the Safety center
- Surface: `web` (both viewports; shared client components)
- Environment and viewport/device: source-verified against the four form components + `apps/web/src/app/globals.css` (`.safety-message`), 2026-07-03. No dev server in this pass.
- Found by: Experience & Design Explorer (safety/moderation × accessibility / completeness-of-states discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-verify-email-async-result-not-announced-to-screen-readers` (archived; same announce-the-async-result theme but a different component — that card swapped a NON-live `<h1>`; these forms already have a `role="status"` but it is mounted only when a message exists, a distinct defect), `CX-20260702-room-safety-options-summary-no-focus-ring-or-hover` (archived; fixed the focus RING on the `.safety-controls summary` disclosure, not the submit-result announcement), `CX-20260702-profile-edit-save-hard-reload-no-focus-or-announcement` and `CX-20260701-peer-feedback-submit-no-focus-confirmation-and-empty-default` (archived; same class of gap on non-safety surfaces)

## Customer outcome

As a member who has just submitted a safety report (or an appeal of a decision) and who may be using a screen reader or otherwise cannot watch the screen change, I want to actually be told whether the report was recorded or failed — reliably, and with a failure announced firmly — so I know my safety report reached the team and I am not left unsure at exactly the moment that most needs closure.

## What I observed

All four report/appeal/moderation forms communicate their async submit result by conditionally mounting the result paragraph only once a message exists:

- `ReportSafetyControls.tsx:53` — `{message ? <p className="safety-message" role="status">{message}</p> : null}` (the member-facing report + block-and-report result).
- `SafetyAppealForm.tsx:39` — `{message ? <p role="status">{message}</p> : null}` (the member-facing appeal-a-decision result).
- `ModerationCaseForm.tsx:70` and `ModerationAppealForm.tsx:48` — identical `{message ? <p role="status">...</p> : null}` (staff case/appeal decision result).

Two problems:

1. **The live region is not persistent.** The `<p role="status">` element does not exist in the DOM until a message is set, so it is inserted *already containing text* in the same commit. A polite live region generally only announces content that changes *after* the region is already present and empty; an element that appears with its text already in it is frequently not announced by assistive technology. So a screen-reader member who submits a safety report may hear nothing back. The correct pattern already exists in this codebase: `RoomLeaveControl.tsx:96` renders a persistent `role="status"` panel (and `:187` a persistent `role="alert"` for errors) rather than mounting them on demand.
2. **Failures are announced only politely.** Both the success path and the error path funnel into the same `role="status"` (polite) region — e.g. `ReportSafetyControls.tsx:28` sets the caught error text ("Report failed.") into the same `setMessage` that success uses. A failed *safety* report is time-sensitive and should be announced assertively (`role="alert"` / `aria-live="assertive"`), not queued behind whatever the reader is currently saying.

Additionally, on a *successful* report with no block (`ReportSafetyControls.tsx:26`) the `<details>` form stays open with category/checkbox retained and focus is never moved to the confirmation, so a member can re-open or re-submit without realising the report already went through.

Observed 2026-07-03; source-confirmed (grep for `aria-live|role="alert"|aria-busy` in these four files returns only the four polite `role="status"` occurrences above — no persistent region, no assertive error, no `aria-busy` during the in-flight "Recording…" state).

## What I expected

After a member submits a safety report or an appeal, the result should be perceivable to assistive technology every time: the outcome text should live in a **persistent** live region that is present (and empty) before submission, so its content change is announced; a **failure** should be announced assertively (`role="alert"`) so the member notices their report did not send and can retry; and on success the member should get clear closure (a focus move to the confirmation, or the confirmation replacing the form), mirroring the shipped `RoomLeaveControl` done-panel pattern.

## Reproduction

1. Open an event/room/host-request surface that renders `ReportSafetyControls` and expand "Safety options for {member}".
2. With a screen reader active, fill the report form and submit.
3. Observe: the confirmation/error paragraph is inserted with its text already present in a non-persistent `role="status"` region — the result is frequently not announced; a failure is announced (if at all) only politely; focus stays on the (now-stale) form.
4. Repeat on `/safety` → "Appeal this decision" (`SafetyAppealForm`) — same non-persistent `role="status"`.

Reproduction rate: `source-confirmed 4/4 forms` — every one uses the mount-on-message `{message ? <p role="status">…</p> : null}` pattern; none has a persistent region, an assertive error branch, or a focus move.

## Customer impact

Accessibility (WCAG 4.1.3 Status Messages) on a **safety** control: a screen-reader member who files a report or appeal may not hear that it was recorded — or that it failed — leaving them unsure whether the safety team received it. Emotional: silence at "did my safety report send?" is precisely the moment that must feel resolved. No authorization, privacy, or precise-location dimension — the copy shown is the same generic confirmation/error already present; this only changes how reliably and firmly it is announced and whether focus lands on it.

## Evidence and limits

- Evidence: source reads of `ReportSafetyControls.tsx:53` / `:26-28`, `SafetyAppealForm.tsx:39` / `:22-26`, `ModerationCaseForm.tsx:70`, `ModerationAppealForm.tsx:48`; contrasted with `RoomLeaveControl.tsx:96` (persistent `role="status"`) and `:187` (persistent `role="alert"`). `globals.css` `.safety-message` styles the paragraph visually only.
- Redactions made: no report content submitted or captured; member names shown as `{member}`.
- Facts: all four forms mount the result element only when a message exists; success and error share one polite region; no `aria-busy` on the in-flight button/form; no focus move on success.
- Hypotheses to verify during implementation: whether a persistent polite region for success + a persistent assertive region for errors (or a single region whose `aria-live` is swapped) is cleanest; whether to additionally move focus to the confirmation on success as `RoomLeaveControl` does. Confirm real assistive-tech announcement once a dev server is available (announcement behaviour of already-populated regions is the crux and is best verified with a live reader).
- Paths or surfaces not tested: real screen-reader end-to-end (no dev server this pass); the staff moderation forms were source-read, not exercised.

## Duplicate check

- Search terms used: `role="status"`, `aria-live`, `role="alert"`, `aria-busy`, `announce`, `screen reader`, `safety report`, `appeal`, `ReportSafetyControls`, `SafetyAppealForm`, `ModerationCaseForm`, `focus confirmation`.
- Tickets reviewed: all open `CX-*` and all archived `CX-*`; closest are `verify-email-async-result-not-announced` (different component; a non-live `<h1>`, not a mount-on-message `role="status"`), `room-safety-options-summary-no-focus-ring-or-hover` (the disclosure's focus ring, not the submit result), `profile-edit-save-hard-reload-no-focus-or-announcement` and `peer-feedback-submit-no-focus-confirmation-and-empty-default` (same pattern on non-safety surfaces).
- Why this is new: no existing ticket covers the safety report / appeal **submit result** being lost to a non-persistent live region or the failure being only polite. Cross-linked, not duplicated.

## Acceptance criteria

- [ ] Submitting a safety report (`ReportSafetyControls`) announces its result to assistive technology reliably: the result text lives in a **persistent** live region (present and empty before submit), so the confirmation is announced when it appears.
- [ ] A **failed** report/appeal is announced assertively (`role="alert"` / `aria-live="assertive"`), so the member notices it did not send; the copy stays the existing generic error (no new internal detail exposed).
- [ ] The same persistent-region treatment is applied to `SafetyAppealForm` (member-facing) and to the staff `ModerationCaseForm` / `ModerationAppealForm` result paragraphs so the pattern is consistent everywhere.
- [ ] On a successful report with no block, the member gets clear closure — focus moves to the confirmation and/or the confirmation visibly replaces the still-editable form — so an already-sent report is not accidentally resubmitted.
- [ ] The in-flight state is exposed programmatically (e.g. `aria-busy` while "Recording…"/"Submitting…") so "sending" is announced, not only shown. — optional if a focus-to-confirmation on resolve already conveys completion; keep if low-cost.
- [ ] No precise location or other sensitive data is exposed to an unauthorized person. — unchanged; only announcement/focus behaviour changes.
- [ ] Keyboard focus is not trapped and is not stolen mid-typing; the emergency reminder line (`ReportSafetyControls.tsx:52`) stays present and reachable.
- [ ] Layout stays overflow-free at 375px and 1280px (no new visible chrome beyond the existing message paragraph).
- [ ] Relevant automated tests and repository checks pass (add a unit test asserting the result renders inside a persistent live region and that the error branch is assertive, for at least `ReportSafetyControls` and `SafetyAppealForm`).

Deleted generic line "The interface explains what happened…without internal terminology" — reason: redundant (copy already generic; this ticket is about announcement, not wording).

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; all four report/appeal/moderation forms now render persistent always-mounted live regions (empty before submit) — polite `role="status"` for success and assertive `role="alert"` for failures — with a focus move to the confirmation on a successful no-block report and `aria-busy` on the in-flight submit; added coral `.safety-message-error` styling and unit tests for `ReportSafetyControls`/`SafetyAppealForm`; typecheck/lint(0 new)/test(747, +7)/build all pass; status `implemented`.
