# CX-20260702-cancelled-request-cannot-re-request-permanent-lockout

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — (Reach 4 × Impact 4 × Confidence 5) / Effort 2 = 40. Directly contradicts the reassuring cancel copy the product just fixed, and quietly locks a willing member out of an open event. Core commit-loop reversibility failure; cheap to fix.
- Customer journey: commit — request a place → pending → cancel → change my mind → re-request
- Surface: `web` (mobile shares the same API and component behavior)
- Environment and viewport/device: live dev server `http://localhost:3000`, Chromium 1280×900, reduced-motion; observed 2026-07-02
- Found by: user-sim (experience loop), commit-journey re-verify pass
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-cancel-join-request-500-member-stuck-cancelling` (the cancel action itself; now works), `CX-20260701-repeated-cancellation-no-fair-reliability-rule` (the separate late-cancellation reliability pause — a different mechanism), `CX-20260701-graceful-exit-no-show-non-punitive-handling` (dignified leaving)

## Customer outcome

As a cautious adult member who cancelled a pending request (by mistake, or after a genuine
change of heart), I want to be able to request a place again on that same open event, so that
one tap of "Cancel" does not permanently and silently lock me out of an event that still has
places free.

## What I observed

Logged in as a pooled seeker, opened a compatible published future event ("4 places left"),
had a pending request, and clicked **Cancel request**. The cancel now succeeds correctly and
shows the calm closed state:

> "Request cancelled. This invitation is closed for your account."

But that state is **terminal and offers no way back**: there is no "Request a place again" button,
and the join form never returns. The event still has open places and I still match it, yet the
invitation is closed to me forever with no explanation of why or of any way to rejoin.

The pending-state copy immediately before this reads: *"You can cancel quietly at any time."* —
which strongly implies cancelling is a low-stakes, reversible action. Reality is the opposite:
cancelling is a one-way, permanent lockout.

## What I expected

After cancelling a pending request on an open, future, still-compatible event, I expected either
(a) to be able to request a place again (the join form or a clear "Request again" affordance
returns), or (b) if re-requesting is genuinely disallowed by design, a plain-language explanation
of that rule *before or at* the moment I cancel — not a silent, unexplained permanent close. The
word "closed for your account" reads as a punishment I did not knowingly choose.

## Reproduction

1. Log in as a member with a compatible, published, future event on `/discover` that has open places.
2. Open the event detail (`/discover/events/{id}`), click **Request a place** → pending appears.
3. Click **Cancel request** → "Request cancelled. This invitation is closed for your account."
4. Try to request a place again: no button/form is offered; reloading the page keeps the closed state.
5. (Source-confirmed) A re-request API call returns no new request: `createEventJoinRequest` INSERTs
   with `ON CONFLICT (event_id, requester_user_id) DO NOTHING`, and the `JoinRequestControls`
   `cancelled` branch renders a terminal panel with no re-request path.

Reproduction rate: `1/1 live (closed-state terminal, no re-request affordance) + source-confirmed structural cause`

## Customer impact

Emotional: a member who taps Cancel by accident, or briefly reconsiders, is silently and
permanently shut out of an event they still qualify for and that still has room. This feels
punitive and contradicts the deliberately reassuring "cancel quietly at any time" framing, eroding
trust in the whole low-pressure commit model. Practical: lost, willing participants for hosts and
fewer completed meetups. Not a privacy or precise-location exposure. Not the same as the
late-cancellation reliability pause (that is a time-boxed, explained cool-down triggered near event
start; here the event was days out and the block is permanent and unexplained). This is a
reversibility/expectation failure in the core commit loop.

## Evidence and limits

- Evidence: live closed-state screenshot ("Request cancelled. This invitation is closed for your account.", "4 places left" still shown); DELETE returned 200 `{"success":true,"status":"cancelled"}`; no re-request control present.
- Source: `apps/web/src/lib/join-requests.ts` `createEventJoinRequest` uses `ON CONFLICT (event_id, requester_user_id) DO NOTHING` (a prior cancelled row blocks a new INSERT); `apps/web/src/components/JoinRequestControls.tsx` `status === "cancelled"` branch renders a terminal panel with no createRequest path.
- Redactions: event/request IDs and member identity omitted.
- Facts: cancel succeeds and closes the row; the unique constraint + terminal UI together prevent re-requesting.
- Hypotheses to verify during implementation: confirm whether product intends re-requesting to be allowed (likely yes for a self-cancel on an open event) vs. permanently closed; if closed by design, the copy and pre-cancel expectation must say so.
- Paths not tested: did not attempt re-request via a second raw API call this pass (structural cause is clear from source); accepted-place leave → rejoin not separately driven.

## Duplicate check

- Search terms used: re-request, reopen, cancel again, closed for your account, change my mind, locked out.
- Tickets reviewed: `cancel-join-request-500` (the cancel action; now fixed, does not cover re-request), `repeated-cancellation-no-fair-reliability-rule` (the late-cancel reliability pause — a distinct, explained, time-boxed mechanism), `graceful-exit-no-show-non-punitive-handling` (leaving with dignity, not rejoining).
- Why this is new: none of the above address the fact that a *successful, on-time self-cancel* permanently and silently prevents re-requesting an open event with no explanation or affordance.

## Acceptance criteria

- [ ] After cancelling a pending request on an open, future, still-compatible event, the member can request a place again (join form / clear affordance returns) — OR, if disallowed by design, the UI states the rule plainly before/at cancel and the closed state explains why re-requesting is not possible.
- [ ] If re-requesting is allowed, the API path supports it (e.g. reopen/replace the prior cancelled row) rather than silently no-op'ing on the unique constraint.
- [ ] Copy is consistent: the reassuring "cancel quietly at any time" pending message and the closed-state message do not contradict each other about reversibility.
- [ ] Loading, empty, failure, and recovery behavior is appropriate; the member always has a calm, understandable next step.
- [ ] Mobile and web layouts remain usable; keyboard, screen-reader naming, focus, contrast, and 44px touch targets covered for any new affordance.
- [ ] No precise location or other sensitive data exposed to an unauthorized person.
- [ ] Relevant automated tests pass, incl. a test for cancel → re-request on an open event (allowed path) or an explicit test asserting the disallowed-by-design rule + its explanatory copy.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (commit-journey re-verify pass); status `ready`.
- 2026-07-02 - Implemented by build agent (commit b5cdddd). Server `createEventJoinRequest` now reopens the member's OWN cancelled row to pending via `ON CONFLICT ... DO UPDATE ... WHERE join_requests.status = 'cancelled'` (was `DO NOTHING`), scoped so accepted/declined/pending rows are untouched; every join guard stays in the INSERT SELECT (published+future, capacity, host-exclusion, mutual block, age/skill/language), and the reliability cool-down still returns before the upsert so an active late-cancel pause is never bypassed; RETURNING yields the row's real id for a subsequent cancel. UI `JoinRequestControls` cancelled branch replaced the terminal dead-end with a calm "Request a place again" affordance (join form returns, focus lands on the note field, "skip counts stay private" kept). No schema change. Added `join-requests.test.ts` (on-time cancel -> reopen to pending; guards still block closed/full/blocked; active cool-down never bypassed vs. expired pause proceeds). Checks (apps/web): typecheck pass, lint 0 errors, test 546 passed, build pass. Status -> `implemented` for independent Explorer retest.
