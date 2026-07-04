# CX-20260704-attendance-cancel-reliability-and-sweep-window

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — two real bugs in the attendance loop found by the core-path audit (2026-07-04).
- Surface: `lib/attendance-confirmations.ts`, `lib/join-requests.ts`, attendance API routes, `vercel.json`
- Implementation owner: `agent`

## Bug A — late-cancellation reliability signal is bypassable via the attendance-cancel path (the worst-timed cancel evades the consequence)

Evidence: `lib/attendance-confirmations.ts:127-141` (`releaseSeatAndCancel`) and `:277-301` (`cancelAttendanceByMember`) release the seat + cancel the join request but NEVER call `applyLateCancellation`/`persistReliabilityState`. The normal "Cancel my place" path (`lib/join-requests.ts:186-201`) DOES record it. So cancelling via the T-2h email link or the in-app attendance prompt — the latest, most disruptive cancellation — is the ONLY cancel path that accrues no late-cancellation signal, and two identical member actions get different consequences by which button they tap.
Fix: route both in-app/token cancel controls through the same reliability accounting (`cancelEventJoinRequest`, or have `cancelAttendanceByMember`/`cancelAttendanceByToken` apply `applyLateCancellation`). Keep a documented `viaSafetyPath` escape hatch if one exists. Add a test asserting an attendance-path cancel records the same reliability signal as the normal cancel.

## Bug B — attendance loop + host breakdown effectively dead for most events under the daily cron

Evidence: `vercel.json:15-18` runs `/api/internal/attendance-reminders` at `0 9 * * *` (Hobby-plan daily limit). The sweep only selects events starting within the next 2h (`attendance-confirmations.ts:159-161`), so only events starting ~09:00–11:00 UTC ever get a pending row/token/reminder; for all others `getEventAttendanceBreakdown` (`:306-323`) returns all-zeros, so the host "who's coming" panel is silently blank/misleading.
Fix (until a sub-hourly scheduler exists — Vercel Pro cron or a free external trigger, HQ card #11): (a) widen the sweep window to safely bracket the daily cadence, AND (b) when no confirmation rows exist for an event, label the host breakdown honestly ("reminders not yet sent") rather than showing misleading zeros. Note the real fix is a sub-hourly trigger.

## DoD
- typecheck/lint/test/prod build green; tests cover Bug A parity + Bug B honest-empty-state. Likely no migration. `git pull --rebase`. Commit AND push (no migration) — unless you add one, then commit-not-push + report. Don't touch public/*.html or docs/marketing/**.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).
- 2026-07-04 | build | implemented, status → `implemented`. Bug A: extracted the single late-cancellation accounting entry point `recordLateCancellationSignal(userId, context, now)` in `lib/join-requests.ts` (refactored `cancelEventJoinRequest` onto it, no behaviour change) and now call it from BOTH `cancelAttendanceByToken` and `cancelAttendanceByMember` in `lib/attendance-confirmations.ts` after the seat is released. Context = `{ wasAccepted: has_seat, hoursUntilStart, viaSafetyPath: false }` (attendance loop has no safety variant — that path lives in `safety-actions.ts`); the domain rule (`applyLateCancellation`) still owns whether the timing counts, so the T-2h cancel now accrues the SAME signal as the normal cancel and can no longer evade it. No circular import (join-requests does not import attendance-confirmations). Bug B: widened the sweep window from 2h to `SWEEP_WINDOW_HOURS = 26` (brackets the daily `0 9 * * *` cron + 2h margin) so every upcoming event gets a row on the first sweep that sees it (at-most-once marker unchanged); `getEventAttendanceBreakdown` now returns `remindersSent` (true only when a confirmation row exists) and the host panel labels the empty state honestly ("Confirmation reminders haven't gone out for this event yet") instead of misleading all-zeros. Real fix (sub-hourly trigger) noted in code — HQ card #11. Checks: typecheck/lint (pre-existing warnings only)/test (web 973 pass/12 skip; 4 new attendance tests: token parity, member parity, expired no-signal, honest empty breakdown)/production build all green. No migration. Pushed to origin/main.
