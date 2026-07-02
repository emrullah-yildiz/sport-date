# CX-20260703-event-create-publish-disabled-no-reason

- Status: `verified`
- Severity: `medium`
- Customer journey: Host creates and publishes an event (`/events/new`)
- Surface: `web`
- Environment and viewport/device: Source audit of `apps/web/src/components/CreateEventForm.tsx`; applies to all viewports
- Found by: Experience & Design Explorer (discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-event-create-error-recovery-whack-a-mole` (archived — built the field-tied error summary for *submitted* problems; this is a distinct, pre-submit silent-disable with no message path)

## Customer outcome

As a host filling in my event, I want to understand why I can't publish yet — and how to fix it — so that I'm never left staring at a dead "Publish" button with no explanation.

## What I observed

Priority (RICE): Reach ~0.3 (hosts who adjust the experience-level pills — a normal thing to do) × Impact 2 (a silent, unexplained publish block) × Confidence 0.9 ÷ Effort 0.4 ≈ **P2**.

The "Experience levels welcome" fieldset starts with `["beginner","intermediate"]` pre-checked (`CreateEventForm.tsx:30`). If the host unchecks all of them, the publish button becomes disabled: `disabled={submitting || experienceLevels.length === 0}` (`CreateEventForm.tsx:278`). CSS dims it to `opacity: .5; cursor: not-allowed` (`globals.css:775`).

Nothing tells the host why. There is:
- no visible message near the fieldset or button,
- no `aria-invalid`/`aria-describedby` tie between the fieldset and any hint,
- an *unused* error slot — `fieldMessage("experienceLevels")` renders `#experienceLevels-error` (`CreateEventForm.tsx:260`), but it is only ever populated from a server round-trip, which can never happen because the disabled button blocks submission client-side.

So a host who deselects all levels reaches a hard dead-end: the button is visibly greyed, the legend ("Experience levels welcome") never said at least one was required, and a keyboard/screen-reader user gets no announcement at all — the control is simply `disabled` with no accessible name change or description.

## What I expected

The host should immediately understand that at least one experience level is required, and see (and hear, via AT) a short hint tied to the fieldset the moment the selection becomes empty — rather than a silently disabled button.

## Reproduction

1. Sign in and open `/events/new`.
2. In "Experience levels welcome", uncheck Beginner and Intermediate so none is selected.
3. Observe the "Publish the invitation" button greys out with no message; no hint appears near the fieldset; nothing is announced.

Reproduction rate: `3/3 safe attempts (source-confirmed)`

## Customer impact

A host who narrows the audience (a legitimate action) can be blocked from publishing with zero guidance, and may not connect the greyed button to the empty pill group. Practically it stalls the core hosting task; emotionally it reads as a bug. Accessibility is involved: a disabled control with no accessible reason gives keyboard and screen-reader hosts no way to know what's wrong.

## Evidence and limits

- Evidence: `CreateEventForm.tsx:30, :260, :278`; `globals.css:775`.
- Redactions made: none.
- Facts: button disable is `experienceLevels.length === 0`; the `experienceLevels-error` slot only fills from server errors, which are unreachable while disabled.
- Hypotheses to verify during implementation: simplest fix is a visible, `role`-appropriate hint rendered when `experienceLevels.length === 0`, associated to the fieldset via `aria-describedby` on the group (and/or the legend), so both sighted and AT hosts get the reason; keeping the button enabled and letting the existing summary/validation flow catch it is an alternative — either way the host must get a reason, not a bare disable.
- Paths or surfaces not tested: mobile Safari VoiceOver announcement of the disabled state (source-level only).

## Duplicate check

- Search terms used: `experience level`, `experienceLevels`, `publish disabled`, `silently disabled`, `no reason`, `at least one` across `tickets/*.md` and `tickets/archive/*.md`.
- Tickets reviewed: `CX-20260701-event-create-error-recovery-whack-a-mole` (submitted-error summary), `CX-20260630-signup-step1-disabled-back-above-primary-action` (a dead disabled *Back* on signup — different surface and control), `CX-20260702-*` focus/hover tickets.
- Why this is new: no existing ticket covers the experience-level fieldset or the pre-submit publish disable-with-no-reason on the event-create form.

## Acceptance criteria

- [ ] When no experience level is selected, the host sees a clear inline hint (e.g. "Pick at least one experience level to publish") near the fieldset.
- [ ] The hint is programmatically associated with the experience-level group so keyboard and screen-reader hosts perceive the reason (via `aria-describedby` and/or a live region), not just a silent disabled button.
- [ ] The host can recover to a publishable state by re-selecting a level, and the hint clears when they do.
- [ ] The legend or hint communicates that at least one level is required before the host hits the dead-end.
- [ ] No raw enum, placeholder, or internal text is exposed; copy matches the calm, honest voice of the rest of the form.
- [ ] Contrast (AA), visible focus, and 44px targets on any new/affected control are preserved.
- [ ] Relevant automated tests and repository checks pass.
- ~~No precise location or other sensitive data is exposed~~ — not applicable; this change touches only the experience-level control and publish gating.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent. Replaced the silent `experienceLevels.length === 0` Publish disable with the form's own recovery idiom: added `experienceLevelsIssue()` + `EXPERIENCE_LEVELS_REQUIRED_MESSAGE` to `event-create-recovery.ts` (single source of truth), so an empty selection now (a) shows a live inline reason ("Pick at least one experience level to publish.") in `#experienceLevels-error` the moment the set empties and clears on re-select, (b) is programmatically tied to the fieldset via `aria-describedby` + `aria-invalid` with a persistent `#experienceLevels-hint` requirement cue and `role="status"` announcement, and (c) flows through the on-submit summary + progress-rail like every other required field (button now enabled; `reportEmptyRequired` catches empty levels client-side). Added a coral `fieldset[aria-invalid]` cue. Checks: typecheck pass; lint 0 errors/0 new warnings (2 pre-existing in qa/full-flows.mjs + member-profile.test.ts); tests 765 passed/12 skipped (added 3 `experienceLevelsIssue` cases + copy assert); prod build compiled successfully. Status `implemented`.
- 2026-07-03 - Independently verified by orchestrator (source + repo checks): the Publish button (CreateEventForm.tsx:296) is now `disabled={submitting}` only — the silent `experienceLevels.length === 0` disable is gone. Instead: a persistent `#experienceLevels-hint` states the requirement up front; when the selection empties, a live `#experienceLevels-error` span (`role="status"`, announced) renders the calm reason (derived from `experienceLevels.length`, line 214, so it clears the instant a level is re-checked); the fieldset carries `aria-invalid` + `aria-describedby="experienceLevels-hint experienceLevels-error"` and the button `aria-describedby` the error when present; a coral `fieldset[aria-invalid]` cue gives sighted parity. On submit, `reportEmptyRequired()` (line 159) catches the empty selection client-side via the same `experienceLevelsIssue()` helper and joins the top summary + focus-first + progress-rail "needs attention" flag, exactly like the form's other required fields (consistent idiom, not a one-off); server validation path preserved. Single source of truth: `experienceLevelsIssue`/`EXPERIENCE_LEVELS_REQUIRED_MESSAGE` in event-create-recovery.ts. typecheck/lint/765 tests/prod build pass (commit 23aefe8). Status `verified`.
