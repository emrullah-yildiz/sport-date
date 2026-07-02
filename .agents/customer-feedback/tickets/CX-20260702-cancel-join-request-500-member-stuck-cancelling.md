# CX-20260702-cancel-join-request-500-member-stuck-cancelling

- Status: `ready`
- Severity: `high`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 5) / Effort 2 = 50. Core commit-loop action (cancel a pending request / leave an accepted place) is completely broken on the live QA environment and the button hangs forever; owner-reported-style breakage.
- Customer journey: commit — request a place → pending → cancel/unjoin (and the accepted-place graceful exit, same code path)
- Surface: `web` (mobile shares the API)
- Environment and viewport/device: live dev server `http://localhost:3000`, Chromium 1280×900 and 375×800, reduced-motion; observed 2026-07-02
- Found by: user-sim (experience loop), commit-journey pass
- Related tickets: `CX-20260701-graceful-exit-no-show-non-punitive-handling` (the change that introduced the write), `CX-20260701-no-automatic-production-migration-on-deploy` (broader deploy-pipeline root cause — this ticket is the member-facing live failure + missing route/UI resilience)

## Customer outcome

As a member who requested a place (or was accepted), I want to cancel/leave and get a calm
confirmation, so that I stay in control and can change my mind without getting stuck.

## What I observed

Logged in as a pooled seeker, opened a compatible published event, and clicked **Request a place**
— the pending state appeared correctly ("Your request is with the host. You can cancel quietly at
any time."). I then clicked **Cancel request**:

- The button changed to **"Cancelling…"** and **stayed there permanently**. The request was never
  cancelled and no confirmation or error ever appeared.
- Network: `DELETE /api/events/{eventId}/requests/{requestId}` returned **HTTP 500 with an empty
  response body** (no JSON `error` field). Reproduced 2/2.
- Because the API threw before returning JSON, the client `fetch(...).json()` path could not surface
  a readable message; the control simply hung in its submitting state.

Root cause (verified in source): the graceful-exit change (`cancelEventJoinRequest` in
`apps/web/src/lib/join-requests.ts`) now writes `exit_reason` / `exit_note`, columns added only by
migration `apps/web/db/029_join_request_exit_reasons.sql`. That migration is **not applied to the
live QA database**, so the UPDATE fails and the route 500s. The same function backs the accepted-place
**graceful-exit / leave** flow (`RoomLeaveControl`), so that dignified leave path is broken too. This
is exactly the deploy-ordering hazard the graceful-exit ticket's own handoff flagged.

## What I expected

Clicking **Cancel request** cancels my pending request and shows the calm "Request cancelled" state
(and for an accepted place, the graceful-exit acknowledgement). If the server ever fails, I expect a
readable, calm error — "Your place is still yours, nothing changed, try again" — and the button to
return to a clickable state, never an indefinite "Cancelling…".

## Reproduction

1. Log in as a member with a compatible, published, future event available on `/discover`.
2. Open the event detail (`/discover/events/{id}`), click **Request a place** → pending appears.
3. Click **Cancel request**.
4. Observe: button stuck on "Cancelling…"; `DELETE .../requests/{id}` → 500, empty body; request not cancelled.

Reproduction rate: `2/2 safe attempts`

## Customer impact

The most basic "I changed my mind" action in the commit loop does not work: a member cannot withdraw
a pending request, and an accepted member cannot use the just-built graceful-exit path to leave. The
button hanging on "Cancelling…" with no error reads as the app being broken. Being unable to leave —
including for safety — is a dignity and safety harm. No precise-location or private data exposed.
Separately: this is an authorization/data-integrity-adjacent reliability failure, not privacy.

## Evidence and limits

- Evidence: live 500 captured on the DELETE endpoint (empty body); source trace to `exit_reason`/`exit_note` write vs unapplied migration 029.
- Redactions: event/request IDs and DB connection details omitted.
- Facts: 500 reproduced live; migration 029 is local-only per the graceful-exit handoff note; the same function backs `RoomLeaveControl`.
- Hypotheses to verify during implementation: confirm the live/dev DB lacks the columns; confirm prod parity.
- Paths not tested: the accepted-place leave was inferred from shared code, not re-driven live this pass.

## Duplicate check

- Search terms: exit_reason, 029, cancel 500, DELETE requests, migration apply.
- Tickets reviewed: graceful-exit ticket (implemented, flagged the deploy hazard but did not report a live failure), no-automatic-production-migration (P0, deploy pipeline in general, prod outage on 020–024).
- Why new: this is the concrete member-facing live breakage of the cancel/leave action *plus* the missing route/UI resilience (a DB error must not hang the button or return an empty 500) — distinct from the general "migrations don't auto-apply to prod" infra ticket and from the graceful-exit feature ticket.

## Acceptance criteria

- [ ] Cancelling a pending request succeeds on the running environment and shows the calm "Request cancelled" state.
- [ ] The accepted-place graceful-exit (`RoomLeaveControl`) succeeds and shows its acknowledgement.
- [ ] Migration `029_join_request_exit_reasons.sql` is applied to the live/QA (and production) DB, or the code degrades safely if the columns are absent.
- [ ] If the DELETE ever fails server-side, it returns a JSON `error` and the button returns to a clickable state with the calm "your place is still yours" recovery copy — never an indefinite "Cancelling…".
- [ ] Loading/failure/recovery states are appropriate; the member always has a calm next step.
- [ ] Mobile and web layouts usable; keyboard, SR naming, focus, contrast, 44px covered.
- [ ] No precise location or sensitive data exposed to an unauthorized person.
- [ ] Relevant automated tests and repository checks pass, incl. a route test for the DB-error → readable-error (not empty-500) path.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (commit-journey live pass); status `ready`.

- 2026-07-02 - orchestrator: acute cause resolved — migration `029_join_request_exit_reasons.sql` has now been applied to BOTH prod (earlier this session) and the DEV database (`NEON_DATABASE_URL`), so `cancelEventJoinRequest` no longer 500s on the missing `exit_reason`/`exit_note` columns; a live re-test of cancel/leave should now pass and will be re-verified by the next User-simulator pass. **Remaining scope for this P1 = route/UI RESILIENCE:** the DELETE route should never return a raw empty-body 500 and the "Cancelling…" button must never hang forever — on any failure, return a calm JSON error and have the UI re-enable the control + show a recoverable message ("your place is still yours"). Prioritized as the next build.
