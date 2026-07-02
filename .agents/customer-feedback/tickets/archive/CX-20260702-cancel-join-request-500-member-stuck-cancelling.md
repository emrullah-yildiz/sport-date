# CX-20260702-cancel-join-request-500-member-stuck-cancelling

- Status: `verified`
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

- 2026-07-02 - build (experience build agent): status `implemented` (commit `6425f5b`). Resilience shipped so this class of failure can never strand a member again. (1) Route hardening — `apps/web/src/app/api/events/[eventId]/requests/[requestId]/route.ts` now wraps the whole handler in try/catch: any throw returns a calm, readable JSON `{ error }` body (503 for `DatabaseNotConfiguredError`, 500 otherwise), never a raw empty 500; the underlying error is logged server-side only, redacted (no event/request/user IDs, no stack/internals to the member). (2) UI recovery on BOTH cancel surfaces — new shared client-safe helper `apps/web/src/lib/cancel-join-request.ts` (used by `JoinRequestControls` "Cancel request"/"Cancel my place" AND `RoomLeaveControl` in-room graceful exit) adds an `AbortController` client-side timeout so a hung/slow request can never spin the button forever; on any failure it re-enables the control, restores the pre-submit label, and shows the calm recoverable "Your place is still yours — nothing changed. Please try again." with `role="alert"`; on success the existing calm confirmation is unchanged. Graceful-exit reason/note passthrough, non-punitive framing, anti-enumeration/security, and the safety path all preserved; no new migration (029 already applied). Tests added: route DB-error → calm JSON error (not empty 500) + not-configured → calm 503; helper timeout/abort/network/non-OK/unreadable-body → recoverable message and success passthrough. Checks (from `apps/web`): typecheck pass, lint pass (0 errors), test pass (540 passed / 12 skipped), production build pass. Commit pushed to origin/main. Left for the next User-simulator pass: live re-drive of cancel (pending) and graceful-exit (accepted) on the running app.

- 2026-07-02 - build (experience build agent): status `in-progress`, implementation owner. Scope = route/UI resilience per orchestrator note (acute DB cause already fixed via applied migration 029). Hardening the DELETE route (no raw empty 500) and both cancel/leave UI surfaces (no indefinite "Cancelling…"; client-side timeout/abort + recoverable "your place is still yours" alert).

- 2026-07-02 - orchestrator: acute cause resolved — migration `029_join_request_exit_reasons.sql` has now been applied to BOTH prod (earlier this session) and the DEV database (`NEON_DATABASE_URL`), so `cancelEventJoinRequest` no longer 500s on the missing `exit_reason`/`exit_note` columns; a live re-test of cancel/leave should now pass and will be re-verified by the next User-simulator pass. **Remaining scope for this P1 = route/UI RESILIENCE:** the DELETE route should never return a raw empty-body 500 and the "Cancelling…" button must never hang forever — on any failure, return a calm JSON error and have the UI re-enable the control + show a recoverable message ("your place is still yours"). Prioritized as the next build.

- 2026-07-02 - user-sim RE-VERIFY: **PASS on the acute cancel path.** Logged in as a pooled seeker, opened a compatible published future event with a pending request, clicked **Cancel request**. Result: `DELETE /api/events/{id}/requests/{id}` returned **HTTP 200** with body `{"success":true,"status":"cancelled"}` (was 500/empty). The panel resolved to the calm closed state "Request cancelled. This invitation is closed for your account.", the button did NOT hang on "Cancelling…", no 5xx, no console errors. Migration 029 fix confirmed working on dev. Also verified in source that the resilience scope is implemented: `cancelRequest` in `JoinRequestControls.tsx` routes through `cancelJoinRequest()` (shared helper with client-side timeout/abort) and on failure re-enables the control + shows `result.message` instead of hanging (lines 112–142). Recommend marking the acute-cause portion `verified`; keep open only for the outstanding route-test acceptance criterion (DB-error → readable JSON, not empty 500).

- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. 6425f5b). Acute cause (missing 029 columns) already fixed via prod+dev migrate; this ticket's remaining route/UI resilience scope is met: DELETE handler fully try/catch-wrapped → calm JSON `{error}` (503 DatabaseNotConfigured / 500 otherwise), NEVER raw empty-body 500, no exit_reason/internals/stack/IDs leaked (console.error gets only error.message server-side). Shared `cancel-join-request.ts` helper: AbortController timeout + try/catch/finally, ALWAYS resolves, non-OK/unreadable-body/network/hung-abort all → recoverable `{ok:false}` with calm message; success + private-exit passthrough intact. Both surfaces wired: JoinRequestControls (re-enables + role=alert on failure) and RoomLeaveControl (phase=error off "leaving", role=alert; safety path + acknowledgement untouched). Tests non-tautological (throw→JSON-not-empty-500 + no-leak; 503; helper success/non-OK/unreadable/network/hung-abort). a11y: `.error-message`/`.room-leave-error` token classes, role=alert, no new hex. Checks the Tester ran itself: typecheck PASS, lint PASS, test 540 passed/12 skipped, prod build PASS. Orchestrator applied `verified` in main tree and archived. FOLLOW-UP (filed separately): the mobile cancel route was not part of this hardening — see CX-20260702-mobile-cancel-route-not-resilience-hardened.
