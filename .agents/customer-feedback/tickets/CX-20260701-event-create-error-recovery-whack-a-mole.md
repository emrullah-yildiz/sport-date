# CX-20260701-event-create-error-recovery-whack-a-mole

- Status: `implemented`
- Severity: `medium`
- Priority: `P1 high` — owner-blocking: publishing appears to do NOTHING. The form relies on native HTML5 `required` validation, so an incomplete submit is silently blocked by the browser (jumps to the first empty field, easy to miss) and the app shows no visible error near the action. Bumped from P2 after owner report 2026-07-01. Every first-time host hits this; fix is contained.
- Customer journey: intent → commitment (hosting / event creation → publish)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths; especially 375px and long-scroll desktop
- Found by: Experience & Design Explorer — pass 13, create-event × completeness-of-states + information/copy (2026-07-01)
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-event-create-form-no-step-progress-friction` (ready — that ticket is about breaking the ~18-field wall into ordered steps/progress; THIS ticket is about what happens when a submitted form is rejected — error surfacing, recovery, and prevention — and is independently fixable), `CX-20260630-native-date-inputs-unstyled-mismatch` (verified — datetime field visual styling, not its `min`/validation)

## Customer outcome

As a first-time host filling out the event form, when I get something wrong I want to see everything that needs fixing at once, tied to the right fields, and be taken to the first problem — so that I can correct it in one calm pass instead of resubmitting over and over to discover one new error each time.

## What I observed

On the create-event form (`/events/new`, `CreateEventForm.tsx`) a rejected submission recovers poorly:

1. **Whack-a-mole errors.** The API (`api/events/route.ts`) validates the whole event and returns the FULL list of problems as `errors: [...]` (from `validateEventCreation` in `packages/domain/src/event.ts`, which accumulates every failure into an array). But the form throws away the array and shows only `result.error` — i.e. `errors[0]`, a single message. A host who left the description too short AND set a past start time fixes the first, resubmits, and only THEN learns about the second. Each mistake costs a full round-trip.
2. **Error stranded at the bottom.** The single `.error-message` (`role="alert"`) renders at line 76 of the form, just above "Publish the invitation" — i.e. below all ~18 inputs. On a long form / at 375px, a mouse host who submitted after scrolling up sees no visible feedback near where they are looking; nothing scrolls the error into view and focus is not moved to it. (A screen-reader host does hear the alert, but is not moved to the offending field.)
3. **No field-level tie.** Errors are prose server strings ("Event must start in the future.", "Event description must contain 20 to 1000 characters.") with no association to the input that caused them, so the host must map sentence → field among eighteen.
4. **Past start time is only caught server-side.** The `datetime-local` input has no `min`, so the native picker lets a host choose a time in the past; they only learn it is invalid after submitting and round-tripping to the server ("Event must start in the future."). A `min` set to now would let the browser prevent the mistake before it is ever submitted.

## What I expected

- All current validation problems shown together on a rejected submit (the API already returns them), each written in the existing calm host voice.
- The host taken to (focus + scroll) the first problem, with each message tied to its field (e.g. `aria-describedby` / an inline message under the input), so recovery is one pass, not many.
- Obviously-preventable client mistakes prevented before submit where cheap — notably a `min` on the start-time input so a past time cannot be picked — without weakening the server validation, which stays authoritative.
- Entered data is never lost on a rejected submit (already true — preserve it).
- Copy claims only what is true; no new required fields; the public/private location separation and existing defaults unchanged.

## Reproduction

1. Sign in, open "Host an event" (`/events/new`).
2. Fill the form but introduce two mistakes at once: a description under 20 characters AND a start time in the past.
3. Submit. Observe only ONE error appears ("Event description must contain 20 to 1000 characters." OR the start-time error — whichever the array orders first), at the very bottom of the form, with no scroll/focus move and no tie to a field.
4. Fix that one, resubmit; observe the SECOND error only now appears — a second round-trip for a mistake that already existed.
5. Separately: open the start-time picker and note a past date/time can be selected (no `min`), only rejected after submit.

Reproduction rate: `confirmed via source (CreateEventForm.tsx errors[0]-only + no min; route.ts returns errors[]; event.ts accumulates array) 2026-07-01`

## Customer impact

Multi-error whack-a-mole plus a bottom-anchored, field-detached error turns a rejected publish into several frustrating round-trips at the exact moment a host is offering their generosity — working directly against the owner goal "event creation is easy." Emotional cost is disproportionately high for a first-time host who cannot tell what is wrong or where. Accessibility is involved: on a rejected submit the keyboard/screen-reader host is not moved to the offending field, and a sighted mouse host may see no visible feedback near their viewport. No authorization/privacy/data-loss issue, provided entered values and the public/private location split are preserved.

## Evidence and limits

- Evidence: `CreateEventForm.tsx` lines 44-48 (`result.error` only; no `errors` array use; no scroll/focus on error; no `min` on the `startsAt` `datetime-local`); `api/events/route.ts` line 27 (`{ error: validation.errors[0], errors: validation.errors }` — array is sent but unused by the client); `packages/domain/src/event.ts` `validateEventCreation`/`validateEventForPublishing` (accumulate every failure into `errors`, de-duped). `.error-message` CSS at globals.css:325.
- Redactions made: none needed (no personal data).
- Facts: only `errors[0]` is displayed; the error block sits below all inputs; no field association; datetime field has no `min`.
- Hypotheses to verify during implementation: best presentation of multiple errors (inline-per-field vs a grouped summary at the top that links to each field, à la a form-error summary pattern) — a top summary that moves focus to the first field tends to serve both AT and sighted users; exact `min` value formatting for `datetime-local` (local time, minute precision) and that it never blocks a valid near-future time due to timezone rounding.
- Paths or surfaces not tested live this pass: the live submit round-trip (pooled browser-auth was IP-rate-limited 429 during the pass; not polled per handshake). Mobile app create flow — verify parity separately.

## Duplicate check

- Search terms used: "create event", "error", "validation", "recovery", "whack", "min", "datetime", "focus", "alert".
- Tickets reviewed: full queue. `event-create-form-no-step-progress-friction` covers the form's *length/step* clarity, not error handling; `native-date-inputs-unstyled-mismatch` covers the datetime field's *appearance*, not its `min`/validation; `login-rate-limited-state-no-recovery-guidance` and `join-request-commitment-hard-reload-no-confirmation` are different surfaces (their focus-on-result pattern is worth reusing here).
- Why this is new: no ticket addresses the create-event form's rejected-submit recovery — multi-error surfacing, field association, focus/scroll to the problem, or client-side prevention of a past start time.

## Acceptance criteria

- [ ] On a rejected submit, ALL current validation problems are shown together (using the `errors` array the API already returns), each in calm host-voice copy — no whack-a-mole of one-at-a-time round-trips for problems that co-exist.
- [ ] Each error is tied to its field (inline under the input and/or a top summary that links to the field), and submitting moves focus to the first problem field so a keyboard/screen-reader host lands on what to fix; a sighted host sees the problem without hunting.
- [ ] A past start time cannot be picked (a `min` on the start-time input reflects "now"), and this does not block valid near-future times; the server validation remains authoritative and unchanged.
- [ ] Entered values are preserved across a rejected submit; no field becomes newly required; existing defaults (duration 90, capacity 4, levels beginner+intermediate, ages 24–38) and inline help are unchanged.
- [ ] The public (discovery) vs private (accepted-only) location separation is unchanged; no precise location is exposed to discovery.
- [ ] A successful publish still lands on the existing verified "It's live" success state (`/events/{id}?published=1`).
- [ ] Mobile (375px) and desktop layouts remain usable; keyboard order, focus visibility, screen-reader naming, contrast, 44px targets, and reduced-motion covered.
- [ ] Relevant automated tests and repository checks pass (including a test that a multi-error response renders every error, and that a past `startsAt` is prevented client-side).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (pass 13, create-event × completeness-of-states + information/copy); status `ready`.

- 2026-07-01 - Owner report + repro: filled Sport/Event name/Description only, clicked "Publish the invitation" -> "it just moves here without any error." Cause: fields `startsAt, city, countryCode, areaLabel, venueName, address` (and others) are HTML5 `required`; native validation blocks submit and scroll-jumps to the first empty field with an easily-missed browser bubble; the app-level `.error-message` (bottom of form) only renders for JS/server errors, which are never reached. FIX SCOPE (P1): on submit, if the form is invalid, show a VISIBLE, app-styled summary near the Publish button (e.g. "A few required details are still empty below — please complete them to publish"), and scroll + move focus to the first invalid field with app styling (not just the native bubble); also surface the API `errors[]` array (not just errors[0]) near the action with scroll/focus; add `min` to the datetime-local so past times are rejected client-side. Announce via role=alert/aria-live. So publishing NEVER silently appears to do nothing.

- 2026-07-01 - Experience Build Agent - status `in-progress`, took implementation owner. Implementing: form now `noValidate` and runs `checkValidity()` on submit; an empty/invalid Publish renders a VISIBLE app-styled `role=alert` summary at the top of the form (headline "A few required details are still empty below — please complete them to publish" + a per-field list of what needs attention) AND a `role=status` action-alert just above the Publish button, then scrolls + moves focus to the first invalid field (`.field-error` + `aria-invalid`/`aria-describedby` inline under each input). Server rejections now surface the FULL `errors[]` array (not `errors[0]`), each mapped to its field and ordered top-to-bottom, with the same scroll/focus. Added `min={datetimeLocalMin()}` to the `startsAt` `datetime-local` plus a client `isPastLocalDateTime` guard (minute precision, server stays authoritative). New pure lib `src/lib/event-create-recovery.ts` (message→field map, datetime min, issue ordering) with unit tests. Required constraints, defaults, and the public/private location split unchanged.

- 2026-07-01 - Experience Build Agent - status `implemented`. Files: `apps/web/src/components/CreateEventForm.tsx`, `apps/web/src/app/globals.css`, `apps/web/src/lib/event-create-recovery.ts` (new), `apps/web/src/lib/event-create-recovery.test.ts` (new). Checks: typecheck PASS, lint PASS (only pre-existing warning in the uncommitted `qa/full-flows.mjs`, untouched), test PASS (319 passed / 12 skipped, incl. new multi-error + past-time cases), production `next build` PASS. Live-verified once as pooled `host-A` on http://localhost:3000: `/events/new` renders `min="2026-07-01T21:09"` on start-time; POST /api/events with a past start + short description returns BOTH in `errors[]` (now surfaced together, mapped to startsAt+description); a complete POST returns `{success:true,eventId}` → redirects `/events/{id}?published=1`. No migration. Commit `19e93f6`, pushed to origin/main. Ready for independent Explorer retest (esp. live keyboard/SR focus jump + 375px overflow).
