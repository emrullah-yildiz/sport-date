# CX-20260701-first-event-preparation-card

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 3) / Effort 3 = 20. Reduces first-timer anxiety; supports attendance and safe completion.
- Customer journey: commitment → arrival
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (b4)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-pre-arrival-safety-micro-brief` (safety orientation), `CX-20260701-event-room-stays-future-tense-after-event-ends`

## Customer outcome

As a member attending my first event, I want a simple "what to expect / what to bring / where to
meet / how to leave" preparation card, so that I arrive relaxed and confident rather than anxious
about the unknown.

## What I observed

After acceptance there is no practical preparation summary tailored to the specific event
(sport, level, time, approximate area, what to bring, how the meet-up starts). First-timers are
left to infer logistics, which raises anxiety and no-show risk.

## What I expected

A calm preparation card in the accepted/event-room view: the sport and level in human terms, the
time, the approximate meeting area (never the precise point pre-authorization rules aside), a short
"what to bring", and a reminder that they can leave any time. Warm, specific, host-toned; only
implemented facts, no invented claims.

## Reproduction

1. Get accepted to an event as a first-time member.
2. Note there is no consolidated, practical "how to show up" preparation summary.

Reproduction rate: `confirmed; content gap`

## Customer impact

The emotional product is "having something real to do together"; anxiety about logistics
undermines that and causes no-shows, which hurt the safe-completed-event north-star. No auth/privacy
regression, but the card must respect approximate-location rules.

## Duplicate check

- Search terms: prepare, arrival, what to bring, first event, logistics.
- Tickets reviewed: full queue; no preparation/logistics card exists.
- Why new: distinct from the safety micro-brief (this is practical logistics/confidence).

## Acceptance criteria

- [ ] Accepted members see a preparation card with sport/level (human phrasing), time, approximate area, a short "what to bring", and how the meet begins.
- [ ] Precise meeting location is only shown where existing authorization rules already allow it; the card never leaks it to unauthorized viewers.
- [ ] Copy is warm and specific and describes only implemented capabilities (no invented claims).
- [ ] Clear empty/partial states when a host has not filled every optional detail.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `in-progress`. Adding a warm, practical first-event preparation card in the event room for an accepted first-timer (no prior accepted participation), coordinated with (not duplicating) the shipped pre-arrival safety micro-brief. Deriving "first event" from existing `event_participants` data — no migration.
- 2026-07-01 - experience-build-agent implemented; status `implemented` (commit 2ad515d). Added `FirstEventPreparationCard` (new component + test) rendered in the event room, below the pre-arrival safety brief, for an accepted non-host participant attending their FIRST event. Card shows sport + welcomed levels in human terms, start time, approximate area (never the precise venue — that prop is not passed to the card), an honest sport-specific "what to bring", and a calm "meet in the public spot / play at your own pace / leave any time" flow that links to the on-page safety/leaving controls (`#prearrival-brief`) instead of repeating them. "First event" derived from a count of the viewer's OTHER `event_participants` rows via `getEventRoom` (also now selects `experience_levels`, `public_area_label`, `duration_minutes`) — additive reads, NO migration, no deploy-ordering hazard. Empty/partial host details degrade to calm generic lines; no location leak; no unprovable claims (tests assert no "verified"/"guaranteed safe"/"background check"). Labelled region, visible focus, 44px-friendly targets, reduced-motion parity, responsive (facts stack ≤750px). Checks (--workspace @sport-date/web): typecheck pass, lint pass (only pre-existing untracked qa/full-flows.mjs warning), test pass (293 passed, +new gating/copy/render tests), production build pass. Verified live at localhost:3000 as a pooled accepted first-timer: card + safety brief both render with the fact lines and the `#prearrival-brief` link and no "verified" leak; card correctly disappears once a second seeded participation makes them a repeat attendee (gate holds) while the safety brief keeps showing. Seeded dev-DB rows cleaned up; pooled fixtures restored (seeker-B back to 0 participations). Ready for independent retest.
