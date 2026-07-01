# CX-20260701-post-attendance-peer-signal-safe-minimum

- Status: `in-progress`
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

- [ ] The control is available only after the event ends and only between members who both attended the same event; unrelated members cannot leave feedback.
- [ ] Only reliability/respect confirmations (e.g. showed up / felt respected / felt safe) + optional private note are captured; there is **no** attractiveness, desirability, popularity, or numeric-ranking dimension anywhere.
- [ ] In this slice, signals are private-by-default: not shown publicly and not shown on the recipient's profile; any visibility change is gated by the blocked-owner decision ticket.
- [ ] Abuse resistance: one submission per pair-per-event, edit window then lock, rate-limited, block-aware; a "felt unsafe" answer routes to report/block; internal attribution for moderation only.
- [ ] Mutual and non-coercive: neither member must submit to view the other's; no streak/reward/pressure mechanic.
- [ ] Loading/empty/failure/recovery states appropriate; works if a member never leaves feedback.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered; reduced-motion safe.
- [ ] No precise location or private safety content exposed to an unauthorized person; account export/deletion account for these records.
- [ ] Relevant automated tests (shared-attendance gating, one-per-pair, block enforcement, safety routing) and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 7); status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Building the safe-minimum private peer reliability/respect signal (migration + domain validation + shared-attendance-gated API + calm ended-room UI); visibility/aggregation stays deferred to the blocked-owner decision ticket.
