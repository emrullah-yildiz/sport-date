# CX-20260704-block-coparticipant-safety-gap

- Status: `ready`
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
