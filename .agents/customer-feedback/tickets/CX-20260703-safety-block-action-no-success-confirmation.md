# CX-20260703-safety-block-action-no-success-confirmation

- Status: `implemented`
- Severity: `medium`
- Priority: `P2` — (Reach 2 × Impact 3 × Confidence 5) / Effort 2 = 15 → P2. It is a feedback/trust gap on a **safety** control (an irreversible block) with a screen-reader dimension (no announced closure), so it is held at P2 rather than a routine P3, but it is not a hard keyboard/contrast regression so it does not claim the P1 accessibility floor. File: `apps/web/src/components/ReportSafetyControls.tsx` (and the `/profile` landing it navigates to).
- Customer journey: coordinate & arrive → block another member for distance/safety
- Surface: `web` (both viewports; shared client component)
- Environment and viewport/device: source-verified against `ReportSafetyControls.tsx` + `apps/web/src/app/profile/page.tsx`, 2026-07-03. No dev server this pass.
- Found by: Experience & Design Explorer (safety/moderation × completeness-of-states discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-room-safety-options-summary-no-focus-ring-or-hover` (archived; the disclosure's focus ring, not the block *outcome*), `CX-20260703-safety-report-submit-result-not-announced` (sibling filed this pass; the *report/appeal* submit result — this ticket is the *block-only quick action*, which does not even set a message before navigating, a distinct code path)

## Customer outcome

As a member who taps "Block {member}" to put distance between me and someone — an action the UI itself says is immediate and not undoable — I want a clear confirmation that the block actually took effect (and, for a screen reader, an announced one), so I trust that the person can no longer see my requests, places, room, or approximate location, instead of just being dropped onto my profile with no acknowledgement.

## What I observed

`ReportSafetyControls` has two block paths that behave inconsistently:

- **Report + also block** (`ReportSafetyControls.tsx:20-30`): on success it sets `setMessage(result.message)` (a visible confirmation) and only then, after a 1200 ms `setTimeout`, navigates to `/profile` (`:27`). So this path shows a brief confirmation.
- **Block-only quick action** (`blockOnly`, `:32-40`): on success it calls `window.location.assign("/profile")` **immediately** (`:38`) with **no message set and no confirmation** — a hard navigation straight to the profile. The button copy warns "Blocking immediately removes shared requests, places, room access, and exact-location access. It does not restore anything if later undone." (`:45`), i.e. it is explicitly irreversible, yet its success produces zero acknowledgement.

The `/profile` page the member lands on does not read any block/confirmation state (`apps/web/src/app/profile/page.tsx` has no `searchParams`/block handling — grep for `block|searchParams|confirmation` finds only unrelated `profile-empty-block` layout classes). So after an irreversible safety block the member arrives at their profile with no "You blocked {member}" confirmation anywhere. For a screen-reader user the only signal is the page change itself; nothing states the outcome. (A block *failure* is handled — `:39` sets an inline message and re-enables — but that message is in the same non-persistent `role="status"` region covered by the sibling ticket.)

Observed 2026-07-03; source-confirmed.

## What I expected

Completing a block should confirm it. Either land on `/profile` with a calm, announced confirmation ("You blocked {member}. They can no longer see your requests, places, room, or approximate location.") surfaced from a redirect signal, or show an in-place confirmation before navigating — consistent with the report+block path and with the `RoomLeaveControl` done-panel pattern already in the codebase. The confirmation should be announced to assistive technology, not conveyed only by the page swap.

## What I expected to avoid (guardrails)

Do NOT slow down or gate the block behind a confirmation *prompt* — instant blocking is a safety feature and must stay one tap. This ticket is about **post**-action confirmation, never a pre-action barrier. Do not expose the blocked member's private data. Do not manufacture urgency or add dark patterns; the confirmation copy stays calm and factual.

## Reproduction

1. Open a surface rendering `ReportSafetyControls` (event detail, host request row, or event room) and expand "Safety options for {member}".
2. Tap the "Block {member}" quick-action button (not the report form).
3. Observe: the page hard-navigates to `/profile` immediately with no confirmation that the block succeeded; `/profile` shows nothing about the block. A screen-reader user hears only the new page, never an outcome.

Reproduction rate: `source-confirmed` — `blockOnly` navigates on success with no message; `/profile` reads no block/confirmation state.

## Customer impact

Trust and closure on a safety-critical, irreversible action: a member who blocks someone for their own safety is left unsure whether it worked, with no stated reassurance of what the block now prevents. Accessibility: no announced outcome for a non-sighted member. Not a keyboard/contrast regression and not a data exposure (the block itself succeeds server-side; the gap is purely the missing acknowledgement) — so medium severity, held at P2 because it is a safety control.

## Evidence and limits

- Evidence: `ReportSafetyControls.tsx:32-40` (`blockOnly` navigates via `window.location.assign("/profile")` on success with no `setMessage`), `:20-30` (report+block sets a message and delays navigation 1200 ms), `:45` (the irreversibility warning copy); `apps/web/src/app/profile/page.tsx` has no block/confirmation/`searchParams` handling (grep). Contrast pattern: `RoomLeaveControl.tsx:96` persistent done panel.
- Redactions made: no member blocked or named; `{member}` placeholder.
- Facts: the block-only path shows no success confirmation; the report+block path does; `/profile` surfaces none.
- Hypotheses to verify during implementation: whether to pass a redirect signal (query param / flash) that `/profile` renders as an announced confirmation, or to show an in-place confirmation before navigating; confirm the block API response carries enough (member first name) to word the confirmation without exposing private data.
- Paths or surfaces not tested: no dev server this pass; navigation-and-confirmation behaviour is source-inferred.

## Duplicate check

- Search terms used: `blockOnly`, `window.location.assign`, block confirmation, `/profile` searchParams, `ReportSafetyControls`, "You blocked", success message.
- Tickets reviewed: all open `CX-*` and all archived `CX-*`; closest are `room-safety-options-summary-no-focus-ring-or-hover` (disclosure focus ring, not the block outcome) and the sibling `safety-report-submit-result-not-announced` (report/appeal submit result; the block-only path is a distinct code path that sets no message at all).
- Why this is new: no ticket addresses the block-only quick action producing no success confirmation on an explicitly irreversible safety action.

## Acceptance criteria

- [ ] Completing a block via the "Block {member}" quick action results in a clear confirmation that the block took effect (e.g. an announced confirmation on the `/profile` landing, or an in-place confirmation before navigation).
- [ ] The confirmation states, in plain calm language, what the block now prevents (shared requests, places, room access, approximate-location access) without exposing the blocked member's private data.
- [ ] The confirmation is announced to assistive technology (persistent live region or focus move), not conveyed only by the page change.
- [ ] Blocking remains a single tap with no added pre-action confirmation prompt — the instant-block safety behaviour is unchanged.
- [ ] The report+block and block-only paths give consistent post-action confirmation.
- [ ] No precise location or other sensitive data about either member is exposed to an unauthorized person.
- [ ] Layout stays usable and overflow-free at 375px and 1280px; any new confirmation control keeps a visible focus ring, AA contrast, and reduced-motion parity.
- [ ] Relevant automated tests and repository checks pass (a test asserting the block-only success path yields a confirmation the member can perceive).

Deleted generic line "Loading, empty, failure, and retry…appropriate to this outcome" — reason: the failure path already sets an inline message; this ticket is specifically the missing *success* confirmation.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; standalone `blockOnly` success now routes through the existing persistent polite live region + focus-move (via `confirmRef`/`announce`) instead of a bare `window.location.assign("/profile")` — the redirect was removed so the announced confirmation is genuinely perceived. Added a `blocked` latch (button becomes disabled "Blocked {name}", `aria-busy` while in flight) for full state coverage, and a calm factual confirmation ("You blocked {name}. They can no longer see your requests, places, room, or approximate location. You can manage blocks anytime from your profile.") extracted as exported `blockConfirmationMessage()`. Extended `ReportSafetyControls.test.tsx` (3 new tests on the confirmation copy: names what the block prevents, points to manage-blocks + no alarmist language, no data beyond the shown name). P1 persistent-region machinery preserved; failure path stays assertive. Checks: typecheck OK, lint OK (only pre-existing qa/full-flows.mjs + member-profile.test.ts warnings), test 744 passed/12 skipped, production build compiled successfully. Status `implemented`.
