# CX-20260703-full-event-join-form-invites-doomed-request

- Status: `verified`
- Priority: `P2` — RICE (4 reach × 1.0 impact × 0.9 confidence) / 0.5 effort = 7.2. Functional expectation gap; small, contained fix.
- Severity: `medium`
- Customer journey: Viewing a public event invitation that is already at capacity and deciding whether to ask for a place.
- Surface: `web`
- Environment and viewport/device: `/discover/events/[eventId]`, all viewports. Source-based audit, 2026-07-03.
- Found by: experience-design-explorer (source audit)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-event-create-error-recovery-whack-a-mole` (archived, different surface — event creation). Same anti-pattern (inviting an action that is known in advance to fail), new surface.

## Customer outcome

As a member looking at a fully booked event, I want the page to tell me up front that it is full and offer a calm next step, so that I do not write an introduction and submit a request only to be bounced by a generic error.

## What I observed

The event detail page already knows the event is full at render time:

`apps/web/src/app/discover/events/[eventId]/page.tsx:31`
```
const availability = describeDiscoveryAvailability(event.placesRemaining);
```
`describeDiscoveryAvailability` returns `{ label: "Fully booked", isFull: true }` when no places remain (`apps/web/src/lib/discovery-card.ts:190`), and the hero renders that "Fully booked" badge.

But `isFull` / `placesRemaining` is never passed to the join control:

`apps/web/src/app/discover/events/[eventId]/page.tsx:60`
```
<JoinRequestControls eventId={event.id} request={event.request} reliability={...} />
```
`JoinRequestControls` receives only `eventId`, `request`, `reliability` (`apps/web/src/components/JoinRequestControls.tsx:29-37`). With no existing request (`status === null`) it renders the full, inviting request form — label "A short note to the host", textarea "What would help the host welcome you well?", and a "Request a place" button (`JoinRequestControls.tsx:265-291`) — regardless of whether any place remains.

When the member types a note and submits, the server rejects it because the capacity guard fails: the insert only runs while participants `< events.capacity` (`apps/web/src/lib/join-requests.ts:112`), and the route returns 409 "This event is not available for a new request." (`apps/web/src/app/api/events/[eventId]/requests/route.ts:33`). That generic error is surfaced in place (`JoinRequestControls.tsx:142`).

So a member is shown "Fully booked" at the top, then an unqualified invitation to request a place at the bottom, and only discovers the contradiction after writing an introduction and submitting.

## What I expected

When the event is full and the member has no existing request, the join area should say so calmly and honestly instead of offering the open request form — e.g. "This game is full" with a non-punitive next step (browse other events / the exact host-freeing-a-spot behaviour, if any, described honestly). If a genuine waitlist is intended, the form should say that explicitly rather than imply an ordinary open request.

## Reproduction

1. As a host, publish an event and fill it to capacity.
2. As an eligible member with no request, open `/discover/events/{id}`.
3. Observe "Fully booked" in the hero AND an open "Request a place" form below.
4. Type a note, submit — receive "This event is not available for a new request."

Reproduction rate: `2/2 safe attempts` (deterministic from source: capacity guard + missing prop).

## Customer impact

Practical: the member wastes effort composing an introduction for a request that cannot succeed, and the failure arrives as a generic 409 message rather than an upfront, honest state. Emotional: a small but real "why did you let me do that" trust dent on the join surface. No authorization/privacy/safety/data-loss dimension; no safety feature is gated. Accessibility: a keyboard/AT member is led through a form field to a dead-ended submit.

## Evidence and limits

- Evidence: `.../events/[eventId]/page.tsx:31,60`; `JoinRequestControls.tsx:29-37,140-146,265-291`; `discovery-card.ts:188-193`; `join-requests.ts:112`; `api/events/[eventId]/requests/route.ts:33`.
- Redactions made: none.
- Facts: full events are known at render; the join control is not told; the server 409s a request on a full event.
- Hypotheses to verify during implementation: whether the product intends a real waitlist for full events (if so, copy should say "join the waitlist", not suppress) — confirm with existing behaviour/owner before wording. Existing pending/accepted/declined/cancelled branches already handle members who DID get in, so only the `status === null` + full case needs the new state.
- Paths or surfaces not tested: the accepted-member and host-own-event views (unaffected — host view already shows the manage panel, accepted members see their place).

## Duplicate check

- Search terms used: `full event`, `fully booked`, `no places`, `request.*full`, `capacity`, `join.*full`, across `tickets/` and `tickets/archive/`.
- Tickets reviewed: `CX-20260701-event-create-error-recovery-whack-a-mole` (event-creation surface, not join), join-flow tickets `CX-20260702-cancel-join-request-500...`, `CX-20260702-cancelled-request-cannot-re-request...` (both about existing-request states, not the full-event pre-request state).
- Why this is new, or which existing ticket was updated: no ticket covers the full-event join form inviting a request the server will 409.

## Acceptance criteria

- [ ] On a fully booked event, a member with no existing request sees an honest "full" state instead of the open request form, with a calm next step and no dead-ended submit.
- [ ] The message matches actual server behaviour (plain "full" if no waitlist exists; explicit "waitlist" wording only if a waitlist is genuinely supported).
- [ ] Members who already have a request (pending/accepted/declined/cancelled) keep their existing, unchanged states.
- [ ] The full state keeps visible focus, >=44px targets, and reduced-motion parity; it is announced to screen readers like the other resolved join states.
- [ ] ~~No precise location or other sensitive data is exposed.~~ N/A — no location/venue is read on this pre-acceptance surface.
- [ ] Relevant automated tests and repository checks pass (add a case for full-event + no-request rendering the full state, not the form).

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; threaded `isFull` (from the existing `describeDiscoveryAvailability` availability used by the hero badge) into `JoinRequestControls`, added a pure `showsFullJoinState(isFull, status)` gate in `join-request-policy.ts`, and rendered an honest "This game is full." state with a calm "Browse other games" link (→ /discover) INSTEAD of the open request form when the event is full and the viewer has no request (status === null). Pending/accepted/declined states are unchanged; the cancelled state withholds the doomed "Request a place again" button on a now-full event and shows an honest "filled up" message + browse link instead. Server 409 capacity guard left intact for the fill-during-session race. Checks: typecheck clean; lint 0 errors (2 pre-existing warnings in qa/full-flows.mjs + member-profile.test.ts, not mine); tests 741 passed / 12 skipped (added full-state gating cases in join-request-policy.test.ts + component render cases in JoinRequestControls.test.tsx); production build succeeded. Status `implemented`.
- 2026-07-03 - Independently verified by Tester. Read commit 925fecc diff + full `panel()`. STATE MATRIX confirmed: not-full+null → open form (fallthrough); full+null → "This game is full." panel with NO textarea/submit (crux, `showsFullJoinState` checked FIRST at JoinRequestControls.tsx:219, before the reliability-pause branch at :233); pending/accepted/declined → own state unchanged (gate false for non-null); accepted still shows private meeting point (page.tsx path untouched); cancelled+full → NO "Request a place again" button, honest "filled up" msg + browse link (:286); cancelled+not-full → re-request button retained. `isFull` threaded from `availability.isFull` (page.tsx:60), SAME `describeDiscoveryAvailability(event.placesRemaining)` value that drives the hero "Fully booked" badge (page.tsx:31,49) — cannot drift. Server capacity guard join-requests.ts:112 + 409 route untouched (not in commit). Guardrails: calm info-blue `--accent-info` (#43C6F5) link, not coral; `.join-full-browse` min-height 44px + focus-visible outline; no scarcity/urgency; no safety capability touched; `focusOnResolveRef` starts false so the full panel does not steal focus on load (consistent with other resolved states). No db migration. New tests genuinely cover the gate (crux test asserts full+null → no "Request a place"/textarea, pending+full → still pending, cancelled+full → no re-request; would fail against old no-isFull code). Checks re-run: typecheck ✓; lint 0 errors (2 pre-existing warnings); 741 passed / 12 skipped; build ✓. status `verified`.
