# CX-20260701-post-attendance-peer-signal-safe-minimum

- Status: `verified`
- Implementation owner: Experience Build Agent (Claude Opus 4.8)
- Severity: `high`
- Priority: `P1` — (Reach 4 × Impact 5 × Confidence 3) / Effort 4 = 15. Held at P1: this is the safety-forward trust signal at the heart of the product's differentiation, but it is safety-sensitive and must ship as the *safe minimum* only. The visible-rating question is escalated separately (`blocked-owner`).
- Customer journey: activity → reflection → trust (after a shared event)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 7
- Related tickets: `CX-20260701-owner-decision-peer-rating-visibility-and-dimensions` (blocked-owner — how/whether ratings are shown), `CX-20260701-member-profile-not-viewable-by-others` (enabler), `CX-20260701-warm-post-event-positive-vibe-moment` (self-reflection, distinct), `CX-20260701-graceful-exit-no-show-non-punitive-handling`

## Customer outcome

As a member who just attended an event with someone, I want to privately confirm reliability & respect signals about the people I actually met — "they showed up", "I felt respected", "I felt safe" — so that the product can build honest trust over time, without ever ranking people by attractiveness or popularity.

## What I observed

There is **no post-attendance peer feedback of any kind**. The only after-event capture is `event_reflections` (`reflections.ts`), which is **self-reported** (my own attendance + "would I join again"), private to me, and feeds only my movement-progress arc. Nothing lets one member leave a signal *about another member* they attended with. So the "people can give feedback to profiles after they attend an event together, like Uber drivers" half of owner criterion 7 does not exist. The data needed to gate it safely does exist: `event_participants` records who was accepted to each event, and the event room already knows the co-participants and host, so "attended the same event together" is derivable.

## What I expected (safe minimum slice)

Ship the **safe minimum** now and defer the sensitive visibility question:

1. **Availability:** the feedback control appears only **after the event has ended** and only between two members who were **both participants (or host) of the same event** — mutual eligibility, derived from `event_participants` + reflection/attendance. No feedback about someone you never attended with.
2. **What is captured:** a small set of **reliability & respect** confirmations only — e.g. "Showed up" (yes / no), "I felt respected", "I felt safe" — plus an optional private free-text note to trust/moderation. **No stars, no numeric rating, no attractiveness/desirability dimension, no "would date again" scoring.**
3. **Private by default:** in this slice the signals are **not shown publicly** and **not shown on the recipient's profile**. They feed internal trust/safety signals only (e.g. corroborating a report, informing moderation, or a future *aggregate* private host-facing reliability cue). Whether any dimension ever becomes visible — and to whom — is deferred to the blocked-owner decision ticket; do not expose ratings in this slice.
4. **Abuse-resistant:** one submission per member-pair-per-event; editable within a short window then locked; rate-limited; a "felt unsafe" answer routes to the existing report/block path. A blocked pair cannot leave feedback about each other. Submissions are attributable internally for moderation but never surfaced as "who said what" to the recipient.
5. **Mutual & non-coercive:** neither person is required to leave feedback to see the other's; there is no pressure mechanic, streak, or reward for leaving it.

This slice honours the experience principles: it is a *reliability & respect* trust signal, private and safety-forward, explicitly **not** an attractiveness score or public popularity metric (both are forbidden and unsafe in a dating context).

## Reproduction

1. Attend (or pass the end time of) an event with another member.
2. Look for any way to leave feedback about that person. Note there is none — only self-reflection exists.

Reproduction rate: `confirmed via source 2026-07-01 (no peer feedback exists)`

## Customer impact

Post-attendance trust signals are the product's honest alternative to profile-performance dating: reliability earned through showing up and treating people well. Their absence leaves hosts and members with no way to reinforce good behaviour or corroborate a concern. Done wrong (public stars, desirability scores) it would be actively harmful; hence the safe-minimum, private-by-default scope with the visibility question escalated. Safety-relevant.

## Duplicate check

- Search terms used: "feedback", "rating", "review", "reflection", "peer", "reliability", "after event".
- Tickets reviewed: full queue. The reflection/warm-post-event tickets are **self**-reflection and explicitly forbid public scores; none implement member-about-member feedback.
- Why this is new: distinct mutual, private, abuse-resistant peer signal gated on shared attendance.

## Acceptance criteria

- [x] The control is available only after the event ends and only between members who both attended the same event; unrelated members cannot leave feedback. (CTE gates on ended + co-attendance both sides; live non-co-attended → 409)
- [x] Only reliability/respect confirmations (e.g. showed up / felt respected / felt safe) + optional private note are captured; there is **no** attractiveness, desirability, popularity, or numeric-ranking dimension anywhere. (pinned dimensions + forbidden-keys reject; live `rating:5` → 400)
- [x] In this slice, signals are private-by-default: not shown publicly and not shown on the recipient's profile; any visibility change is gated by the blocked-owner decision ticket. (grep: `peer_feedback` read only by lib + export-given; no profile/discover/host query)
- [x] Abuse resistance: one submission per pair-per-event, edit window then lock, rate-limited, block-aware; a "felt unsafe" answer routes to report/block; internal attribution for moderation only. (UNIQUE + locked CTE; block NOT EXISTS both directions; safety nudge to Report/Block; edit-window unit-covered)
- [x] Mutual and non-coercive: neither member must submit to view the other's; no streak/reward/pressure mechanic. (per-person independent forms; "or none at all — nothing changes if you skip it")
- [x] Loading/empty/failure/recovery states appropriate; works if a member never leaves feedback. (panel returns null when no targets; submitting/locked/message states)
- [x] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered; reduced-motion safe. (fieldset/legend radio groups, role=status message, static no-motion)
- [x] No precise location or private safety content exposed to an unauthorized person; account export/deletion account for these records. (export includes GIVEN only, not received; ON DELETE CASCADE both FKs; note private-data guard)
- [x] Relevant automated tests (shared-attendance gating, one-per-pair, block enforcement, safety routing) and repository checks pass. (domain 12/12 + web lib 10/10 = 22 pass)

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 7); status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Building the safe-minimum private peer reliability/respect signal (migration + domain validation + shared-attendance-gated API + calm ended-room UI); visibility/aggregation stays deferred to the blocked-owner decision ticket.
- 2026-07-01 - Experience Build Agent implemented (commit `aef3b94`), status `implemented`. Shipped whole: migration `022_peer_feedback.sql` (private, event-scoped, from/to, three fixed yes/no/prefer-not confirmations + optional private note + internal safety flag, unique per (event,from,to), no-self CHECK, ON DELETE CASCADE both sides); domain `peer-feedback.ts` validation (three fixed dimensions, rejects any rating/score/attractiveness key, note private-data guard); `lib/peer-feedback.ts` shared-attendance-gated save + co-attendee target query with 24h edit window then lock, block-aware, self-guard; nested API route `POST /api/events/[eventId]/peer-feedback/[participantId]`; calm `PeerFeedbackPanel` in the ended room below reflection; export includes only feedback GIVEN (not received, anti-retaliation). No rating/score/aggregate is exposed publicly or on profiles — visibility stays owner-owned in `CX-20260701-owner-decision-peer-rating-visibility-and-dimensions`. Checks: typecheck pass, lint pass (only pre-existing warning in untracked qa file), web tests 217 pass, domain tests 91 pass, migration applied clean. Live sanity check via pooled host-A login: non-co-attendee POST → 409 (non-probing message), smuggled `rating` → 400. Two-member co-attendance happy path is rate-limited; covered by unit tests + source. Ready for independent retest.
- 2026-07-01 - Experience & Design Explorer independently RETESTED (resolved in ONE step, no polling). Source-confirmed every rule without reading the implementer explanation first: migration 022 (UNIQUE (event,from,to), CHECK from<>to, fixed yes/no/prefer_not enums only, ON DELETE CASCADE both FKs); domain `validatePeerFeedback` pins the three dimensions and REJECTS any rating/stars/score/attractiveness/desirability/hotness/wouldDateAgain/popularity key; `lib/peer-feedback.ts` gates both target-listing and the WRITE on ended-event + co-attendance-both-sides + block-freedom + active recipient + self-guard + 24h-edit-window-then-lock; route returns vague non-probing 409 (no enumeration) + 400 on smuggled ratings; panel is private-by-default with a "no" nudge to Report/Block that never replaces reporting; export includes feedback GIVEN only (grep: `peer_feedback` read ONLY by lib + export-given — no profile/discover/host/moderation surface). LIVE (pooled host-A, one login, no poll): login 200; non-co-attended POST → 409 "Feedback opens only for people you attended this event with, after it ends."; `rating:5` payload → 400 "does not accept ratings or scores."; self-target → 409; GDPR export contains `privatePeerFeedbackGiven` (no received key). Tests re-run green: domain peer-feedback 12/12, web lib 12/12 → 22 pass. Live-unverifiable sub-branch (named): the full two-member co-attendance submit + the edit-window→lock transition need two accounts through an ended event (rate-limited) — covered by source + the `records an eligible first submission` / `allows an update inside the edit window` / `rejects a change after the edit window has locked` unit cases. Status → `verified`.
