# CX-20260704-block-coparticipant-safety-gap

- Status: `implemented`
- Severity: `high`
- Priority: `P2` (safety-sensitive) — core-path audit (2026-07-04). Blocking exists to defuse exactly this scenario; today it doesn't for co-participants.
- Surface: `lib/safety-actions.ts` (`blockMember`, report+block), event participation
- Implementation owner: `agent`

## Bug — blocking a co-participant in a third party's event removes no seat and gives no warning

Evidence: `lib/safety-actions.ts:17-28` (`blockMember`) and `:75-86` (report+block) only remove seats / cancel requests for the **host↔member** pair. Online hiding IS correct (room + chat filters at `events.ts:531-536`, `event-messages.ts:93-100` are solid). But if Alice and Bob are both accepted in Carol's event and Alice blocks Bob, neither seat is touched and neither is warned — they remain scheduled into the same in-person meetup, the exact real-world risk blocking is meant to defuse.

## Fix
On a block between two co-participants of the same upcoming event: at minimum surface a clear warning to the blocker ("You're both signed up for {event} — you'll be there in person together") with a one-tap "Leave this event", or auto-release the blocker's own seat (decide the least-surprising, safest default — leaning toward: warn + easy leave, so the blocker isn't forced out of an event they want). Never expose the blocked person's participation beyond what the blocker already knows. Also fold `createSafetyReport`'s block branch (`:72-92`) into the same `blockMember` helper so its side-effects (incl. the `account_status='active'` guard) can't drift (audit finding 8).

## DoD
- typecheck/lint/test/prod build green; tests cover the co-participant block path (warning/seat handling) + the consolidated helper. Likely no migration. `git pull --rebase`. Commit AND push. Don't touch public/*.html or docs/marketing/**.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).
- 2026-07-04 | build | implemented, status → `implemented`. Consolidation: extracted `blockMutationQueries(sql, blockerId, blockedId)` — the ONE definition of the block insert (with the `account_status='active'` guard) + host↔member seat delete + request cancel — and both `blockMember` and `createSafetyReport`'s block branch now compose it, so the report-and-block path GAINED the active-account guard it was missing (audit finding 8) and the side-effects can't drift. Warning + easy leave: `blockMember` now returns `BlockResult { blocked, sharedUpcomingEvents }`; after the mutation it selects upcoming THIRD-PARTY events (published, future, hosted by neither party) where both still hold an accepted seat, returning only the BLOCKER's own accepted request id per event. The API (`/api/safety/blocks` + mobile) and `createSafetyReport` surface `sharedUpcomingEvents`; `ReportSafetyControls` renders a calm warning ("You're both still signed up… you'd still be there in person together") with a one-tap "Leave this event" per event (recorded as a safety exit → never counts toward reliability). The blocker is NOT forced out (default = warn + easy leave), and report-and-block no longer auto-redirects to /profile while a shared-event warning is pending. Privacy: nothing is exposed the blocker doesn't already know — the blocker is a participant in each surfaced event and already sees its attendees in the room; the blocked member's participation in events the blocker is not in is never revealed. New `safety-actions.test.ts` (7 tests): shared-event mapping + scope, no-overlap empty, inactive-target not-blocked, idempotent already-blocked, report-and-block uses the guarded mutation + returns overlap, report-without-block runs no block mutation, unverified-relationship → null. Checks: typecheck/lint (pre-existing warnings only)/test (web 980 pass/12 skip)/production build green. No migration. Pushed to origin/main.
