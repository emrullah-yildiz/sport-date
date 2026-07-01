# CX-20260701-graceful-exit-no-show-non-punitive-handling

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 3) / Effort 3 = 16. Important dignity/safety path, but less frequent than the core-loop P0s; sequence after them.
- Customer journey: graceful exit / no-show / recovery
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (a8)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-warm-post-event-positive-vibe-moment`, `CX-20260701-event-room-stays-future-tense-after-event-ends`

## Customer outcome

As a member who had to leave early, felt unsafe, or couldn't attend, I want to exit or record a
no-show without humiliation or punishment, so that I stay in control and the experience never
punishes me for protecting myself.

## What I observed

There is no first-class, non-punitive path for "I left early" or "I didn't attend." Leaving is
supported (`RoomLeaveControl`), but the experience after a graceful exit or a no-show isn't
designed for dignity: no calm acknowledgement, no clear (private) way to note why if the member
chooses, and no reassurance that leaving to stay safe is always acceptable.

## What I expected

A calm, private, non-punitive handling of graceful exit and no-show: the member can leave any time
without a penalty framing; an optional, private reason (never shown to others, never a public
score); a reminder that leaving to stay safe is always fine; and, where safety was the reason, an
easy path to report/block. No public no-show shaming, no punitive counters exposed to others.

## What I expected to avoid (guardrails)

Per experience-principles: rejection/exit must be private and non-punitive; no exposing skip/no-show
counts to others; no attractiveness or reliability score shown publicly. Any host-facing reliability
signal must stay aggregate/private and out of scope here.

## Reproduction

1. As an accepted member, leave an event early (or pass the time without attending).
2. Note the absence of a dignified, non-punitive acknowledgement and optional private reason path.

Reproduction rate: `confirmed; journey gap`

## Customer impact

The safest choice a member can make is sometimes to leave. If leaving feels punitive or shameful,
members will hesitate to protect themselves — a direct safety and dignity harm. Safety-relevant.

## Duplicate check

- Search terms: leave, no-show, graceful exit, cancel, punitive, reliability.
- Tickets reviewed: full queue; leave control exists but no dignified graceful-exit/no-show
  experience is ticketed.
- Why new: designs the post-exit / no-show experience for dignity, distinct from the leave control.

## Acceptance criteria

- [ ] A member can leave early or be a no-show without any punitive framing; leaving to stay safe is explicitly acceptable.
- [ ] An optional, private reason may be recorded; it is never shown to other members and never becomes a public score.
- [ ] Where safety was the reason, report/block/leave are one clear step away and never paywalled.
- [ ] No public no-show/skip counts or reliability scores are exposed to other members.
- [ ] Loading/empty/failure and recovery states are appropriate; the member always has a calm next step.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] No precise location or private safety content is exposed to an unauthorized person.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
