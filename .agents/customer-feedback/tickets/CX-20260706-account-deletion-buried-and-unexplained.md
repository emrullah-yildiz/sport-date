# CX-20260706-account-deletion-buried-and-unexplained

- Status: `ready`
- Severity: `high`
- Priority: `P1` — a GDPR right hidden behind a collapsed twisty and legalese, and the flow never says whether deletion is reversible
- Customer journey: a member decides to leave → looks for account deletion → finds it collapsed inside privacy controls → reads legalese → cannot tell what will actually happen or whether they can change their mind
- Surface: `web` — profile privacy controls
- Environment and viewport/device: mobile 390px + desktop
- Found by: Seraph user-sim daily pass (code walk: `apps/web/src/components/PrivacyControls.tsx:64-66,72-74`)
- Implementation owner: `unassigned`
- Related tickets: `none found` (deletion backend/tests covered extensively in agent-state 2026-07-06 cycles; this is the member-facing UX of the same flow)

## Customer outcome

As a member exercising my right to leave, I want deletion to be findable and its consequences stated in plain words — what is deleted, when, and whether I can undo it — so I can decide calmly. In user voice: "Deleting my account is hidden in a collapsed section and written like a contract. Nowhere does it say: if I click this, is it final? Can I come back tomorrow?"

## What I observed

- The deletion entry sits inside a collapsed disclosure within privacy controls (`PrivacyControls.tsx:64-66`) — easy to miss entirely.
- The explanation copy is legalese-dense (`PrivacyControls.tsx:72-74`) and never answers the one question every leaver has: reversible or not, and on what timeline (the backend implements a `deletion_pending` lock with later finalization — the UI never says so in member words).

## Acceptance criteria

- [ ] Deletion is findable from account/privacy settings without opening a collapsed twisty (or the twisty is clearly labeled "Delete account").
- [ ] Plain-language summary before the password re-entry: what is deleted/cancelled (events, seats, messages, sessions), that the profile locks immediately, the finalization window, and explicitly whether/when it is reversible — matching what the code actually does (no overclaim).
- [ ] Confirmation moment states the outcome and next step; no guilt copy, no retention dark patterns.
- [ ] Copy reviewed against the actual deletion CTE behavior so every claim is true.
- [ ] typecheck / lint / tests / prod build green.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass); status `ready`.
