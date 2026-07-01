# CX-20260701-humane-milestone-moments

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 3) / Effort 3 = 12. Warm motivation tied to real participation; genuinely nice, not urgent. Guardrails below are binding — any variant that manipulates is a bug, not a feature.
- Customer journey: reflection → re-engagement (celebrating real showing-up between events)
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths; profile / post-event / MovementArc surfaces
- Found by: Experience & Design Explorer (owner growth-intake pass, 2026-07-01) — owner-requested "meaningful, humane gamification & fun" direction
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-warm-post-event-positive-vibe-moment` (`verified` — the post-event afterglow this can coexist with), `CX-20260701-post-attendance-peer-signal-safe-minimum`

## Customer outcome

As a member who actually shows up and moves with people, I want gentle, honest little acknowledgements
of *real* milestones — "your first game", "your third game", "your first time hosting" — so that my
genuine participation feels seen and warm, without the product ever pressuring me, ranking me, or
turning showing up into a game I can "lose".

## What I observed

The product already tracks real participation privately: `apps/web/src/lib/progress.ts`
(`getMemberMovementProgress`) counts *attended* moves from `event_reflections`
(`attendance = 'attended'` AND `qualified_for_progress = TRUE`), splits hosted vs. joined, and feeds
`apps/web/src/components/MovementArc.tsx`, a private milestone track. But there is **no gentle "moment"**
when a member crosses a real milestone — the arc quietly updates with no warm human acknowledgement of,
e.g., a first game or first time hosting.

## What I expected

A calm, opt-out milestone moment tied to **real, qualified attendance** (reusing `progress.ts` /
`event_reflections` — no new counter, no new tracked behavior): when a member reaches a genuine
milestone (1st game, 3rd game, first time hosting, etc.), show a warm, host-toned acknowledgement
("Nice — that's your third game. Glad you keep showing up."). It must be a *reflection of what really
happened*, private to the member, and easy to turn off.

## What I expected to avoid (HARD guardrails)

Per experience-principles and the owner direction, these are **bugs, never features** — the ticket
fails if any appears:
- **No streaks-as-pressure** — no "don't break your streak", no consecutive-week counters framed as
  something to lose, no loss-aversion or guilt copy.
- **No scores, leaderboards, popularity, attractiveness, or ranking** — nothing comparing members to
  each other, no public metric.
- **No fake scarcity / fake urgency** — no "limited-time badge", no countdowns.
- **Nothing that rewards time-in-app** — the milestone is a function of *attended real events only*,
  never of opens, sessions, or engagement.
- Milestones are **private** to the member and **opt-out**; honest (only real, qualified attendance);
  progression math is unchanged (attended-and-qualified only).

## Reproduction

1. As a member, attend/reflect on a qualifying event so `getMemberMovementProgress` increments.
2. Observe the MovementArc updates but there is no warm milestone acknowledgement moment.

Reproduction rate: `confirmed by source (lib/progress.ts, components/MovementArc.tsx)`

## Customer impact

Practical: honest, warm acknowledgement of real showing-up supports the north-star (repeat
participation in safe completed events) *without* an engagement mechanic. Emotional: members feel seen
for the real thing they did (moving with people), which is exactly the emotional payoff the vision
describes. No auth/privacy risk if milestones stay private and derive only from existing attendance.

- Authorization/security: no. Privacy: milestones must stay private to the member (no exposure to other
  members). Data loss: no.

## Evidence and limits

- Evidence (source): `apps/web/src/lib/progress.ts` (`getMemberMovementProgress`, hosted/joined counts, recent moves, current stage/next-stage — all from `event_reflections` filtered to attended+qualified); `apps/web/src/components/MovementArc.tsx` (private track, honors `prefers-reduced-motion`, responsive ~390px). `event_reflections` fields: `attendance`, `qualified_for_progress`.
- Redactions: none needed.
- Facts: real attendance is already tracked and drives a private arc; no milestone "moment" exists.
- Hypotheses to verify during implementation: exact milestone set (recommend: 1st game, 3rd game, first time hosting; keep small and honest — confirm with owner if more are wanted); where the moment surfaces (post-event afterglow and/or a one-time note near the MovementArc); how "first ever" vs "Nth" is detected from `progress.ts` counts; where the opt-out preference lives.
- Paths not tested: none live-exercised (reflection cannot be fast-forwarded via member UI); verify at source + unit like the afterglow ticket.

## Duplicate check

- Search terms used: "milestone", "gamification", "streak", "progress", "movement arc", "celebrate", "3rd game", "achievement" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260701-warm-post-event-positive-vibe-moment` (a warm *afterglow* at reflection — complementary; this is milestone-specific and reusable across surfaces), `CX-20260701-post-attendance-peer-signal-safe-minimum` (peer signal, different), `CX-20260701-profile-photo-series-up-to-six` (unrelated).
- Why this is new: no existing ticket adds honest milestone acknowledgements; the afterglow ticket explicitly forbids streaks/counters but doesn't add milestone moments.

## Acceptance criteria

- [ ] When a member crosses a **real, qualified** milestone (e.g. 1st game, 3rd game, first time hosting), they see a warm, host-toned acknowledgement of that specific milestone.
- [ ] Milestones derive **only** from existing attended+qualified participation (`progress.ts` / `event_reflections`); no new tracked behavior, no rewarding of app opens or time-in-app.
- [ ] Every hard guardrail holds: **no** streaks-as-pressure, **no** scores/leaderboards/popularity/attractiveness/ranking, **no** loss-aversion or guilt copy, **no** fake scarcity/urgency. A regression tripwire test forbids these (streak/score/leaderboard/rank/popularity/"don't lose"/"keep your streak").
- [ ] Milestones are **private** to the member (not shown to or comparable with other members) and **opt-out** (a clear setting that suppresses future moments; existing/earned progress unaffected).
- [ ] Copy is honest and warm (only claims real attendance happened), on-brand (energetic, warm, trustworthy), not saccharine.
- [ ] Loading/empty/failure states appropriate; a member who opts out or has no milestones sees no moment and no dead-end.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px targets, reduced-motion parity (any celebratory motion has a static reduced-motion fallback).
- [ ] Relevant automated tests pass, including the anti-manipulation regression tripwire and a test that progression math is unchanged.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner growth-intake pass); status `ready`.
