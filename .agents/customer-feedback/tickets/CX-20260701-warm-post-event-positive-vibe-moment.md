# CX-20260701-warm-post-event-positive-vibe-moment

- Status: `in-progress`
- Severity: `medium`
- Priority: `P0` — (Reach 5 × Impact 4 × Confidence 3) / Effort 2 = 30. Cheap warmth that reinforces the core emotional payoff and repeat intent — without any engagement mechanic.
- Customer journey: activity → graceful exit → reflection
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (b3)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-event-room-stays-future-tense-after-event-ends`, `CX-20260701-hosting-past-events-no-reflection-or-outcome`

## Customer outcome

As a member who just finished a shared activity, I want a warm, human "glad you moved together"
moment that gently invites (never pressures) an optional reflection, so that the experience feels
positive and I feel invited — not nagged — to come back.

## What I observed

After an event ends, the transition to reflection is transactional. There is no warm, host-toned
acknowledgement of the shared experience — the emotional high point of the product — and the
invitation to reflect reads as a task rather than a genuine, optional nudge.

## What I expected

A calm, warm post-event moment: a human acknowledgement ("glad you got out and moved together"),
an optional and clearly-skippable reflection prompt, and a gentle, non-pressuring path back to
discover. Absolutely no streaks, no counters framed as pressure, no "don't lose your progress"
guilt, no engagement-maximising mechanics. It should feel like a thoughtful host, not a growth loop.

## What I expected to avoid (guardrails)

Per experience-principles and roadmap "never rewards" invariants: no streaks, no compulsive
mechanics, no rewarding time-in-app, no popularity/attractiveness metric. Reflection stays optional
and progression remains a pure function of qualified attendance only.

## Reproduction

1. Complete (or pass the end time of) an event.
2. Note the transition to reflection is transactional, with no warm acknowledgement.

Reproduction rate: `confirmed; UX/tone gap`

## Customer impact

The post-activity moment is where "having something real to do together" pays off emotionally and
where repeat intent forms. A cold transition wastes it. Positive-vibe done ethically supports the
safe-completed-event, repeat-intent north-star. No auth/privacy dimension.

## Duplicate check

- Search terms: reflection, post event, warm, vibe, thank you, past events.
- Tickets reviewed: full queue; existing tickets cover room lifecycle correctness and host past-event
  reflection, not an attendee-facing warm positive-vibe moment.
- Why new: distinct warmth/tone feature at the attendee reflection moment.

## Acceptance criteria

- [ ] After an event ends, the attendee sees a warm, host-toned acknowledgement of the shared activity.
- [ ] The reflection invitation is clearly optional and skippable; skipping leaves a calm path back to discover.
- [ ] No streaks, counters-as-pressure, guilt copy, or engagement mechanics; progression math is unchanged (attended-only).
- [ ] Copy claims only what is true; warm but not saccharine; on-brand (energetic, warm, trustworthy).
- [ ] Loading/empty/failure states appropriate; works if the member never reflects.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px, reduced-motion covered.
- [ ] Relevant automated tests and repository checks pass (including the "never rewards" regression suite).

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-01 - Picked up by experience-build-agent; status `in-progress`. Implementing a warm host-toned afterglow acknowledgement in the ended event room, above the existing reflection form, with a calm skippable forward path (discover / host); no streaks, scores, or pressure.
