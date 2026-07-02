# CX-20260701-hosting-past-events-no-reflection-or-outcome

- Status: `verified`
- Severity: `low`
- Priority: `P3 polish` — (Reach 3 × Impact 3 × Confidence 3) / Effort 3 = 9. Closes the reflection phase of the host journey on the hub; data is already fetched, so effort is moderate and the win is dignity/closure rather than a blocked task.
- Customer journey: reflection (graceful exit → reflection)
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, observed at 1280 and 375
- Found by: Experience & Design Explorer — `/hosting × completeness-of-states` pass, 2026-07-01
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-no-web-surface-to-manage-hosted-events` (`verified`); `CX-20260701-hosting-hub-hides-pending-join-requests` (sibling state-coverage gap on the same surface)

## Customer outcome

As a host whose event has happened, I want the hub to help me close the loop — note how it went and whether I'd run it again — so that hosting feels like a complete arc with a warm ending, not a list that silently greys out.

## What I observed

On `/hosting`, once an event has ended it moves into a "Past" section and the card simply reads "Review this event" with a muted style. There is **no reflection prompt and no outcome shown** — no "How did it go?", no record of whether people attended, nothing acknowledging the meeting happened. Notably, the underlying query (`getMemberEventSummaries`) **already fetches each event's `reflection` (attendance, would-join-again)** and the type carries it (`MemberEventSummary.reflection`), but the hosting card ignores the field entirely. So the data for a calm closure state exists and is discarded at the view layer.

This leaves the final phase of the journey standard (reflection) unrepresented on the very surface that owns a host's event history.

Reproduced by inspection of the past-card rendering and the data path (2026-07-01). I could not fast-forward an event to "past" through the UI this pass, so the live past-card-with-reflection rendering was not exercised end-to-end.

## What I expected

For past host cards: a gentle, optional reflection affordance ("How did it go?" → attendance / would-host-again) when not yet recorded, and a quiet outcome summary once it is (e.g. "You marked this as happened"). Calm, non-gamified, non-punitive — no streaks, scores, or pressure; a no-show or a cancelled-feeling past event must read without blame.

## Reproduction

1. Host an event and let it pass (or use a seeded past event).
2. Open `/hosting` and view the "Past" section.
3. Observe the card offers only "Review this event" with no reflection prompt or recorded outcome, despite the reflection data being available to the page.

Reproduction rate: `view + data-path audit confirmed; live past-event rendering not exercised (cannot fast-forward via UI)`

## Customer impact

Practical: the host journey has no closure step on the hub, so reflection (and any attendance signal that could later inform trust) is never invited where it is most natural. Emotional: events that mattered simply fade to grey, which undercuts the product's "movement as structure: pace, rhythm, anticipation, and recovery" signature. No authorization, privacy, or safety dimension. Honour the guardrails: reflection here is dignity and closure, never an engagement or scoring mechanic, and must not expose any other participant's attendance to the host beyond what the product already permits.

## Evidence and limits

- Evidence: past-card markup shows only "Review this event"; `selectHostedEvents` (`apps/web/src/lib/events.ts:372`) carries `reflection` through but `apps/web/src/app/hosting/page.tsx` never reads it.
- Facts: `getMemberEventSummaries` LEFT JOINs `event_reflections` and returns `attendance`/`would_join_again` per event (`events.ts:384, 402-409`).
- Redactions made: none needed (no personal data involved in the observation).
- Hypotheses to verify during implementation: whether a reflection write path exists from this surface or only from the event room; what the dignified copy is for a not-attended / sparsely-attended event; whether host-side reflection should ever reveal participant-level attendance (default: no).
- Paths or surfaces not tested: live rendering of a real past event with and without a stored reflection.

## Duplicate check

- Search terms used: hosting, past, reflection, attendance, outcome, would join again, closure, recovery.
- Tickets reviewed: full queue (22) incl. the 6 owner tickets and the verified hub ticket.
- Why this is new: no ticket addresses reflection/outcome state on the hosting hub; the hub ticket scoped card richness out, and this is an independently fixable, independently checkable state.

## Acceptance criteria

- [ ] Past host cards on `/hosting` either invite a calm, optional reflection ("How did it go?") when none is recorded, or show the recorded outcome quietly when one exists.
- [ ] Copy is warm and non-punitive; a low-/no-attendance or quietly-ended event reads without blame; no streaks, scores, or popularity metrics (anti-dark-pattern guardrails honoured).
- [ ] No other participant's attendance is exposed to the host beyond existing product permissions; no precise location or sensitive data surfaced.
- [ ] Empty (no past events), loading, and failure states remain coherent.
- [ ] Mobile 375 and web layouts stay overflow-free; any control is keyboard-reachable, screen-reader-named, 44px target, reduced-motion safe, on-brand.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (`/hosting × completeness-of-states`); status `ready`.
- 2026-07-02 - Implemented (build agent). Past hosted cards on `/hosting` now close the host's arc with a PRIVATE, honest outcome: a warm "You made this happen — people showed up because you made the plan real" acknowledgement, plus either a calm optional "How did it go?" reflect link (→ the room's existing `#event-reflection-title` form) when no reflection is recorded, or a quiet mirror of the host's OWN recorded outcome once it is. Humane/no-metrics: derived only from the host's own `event.reflection` (already fetched by `getMemberEventSummaries` — NO MIGRATION, no new query, no fabricated count); no streak/score/rank/badge/leaderboard/popularity/comparison; no participant identity or attendance surfaced; left-early / did-not-attend / would-not-host-again all read without blame; an acknowledgement, not a nag. Primitives/patterns reused: mirrors the member-side afterglow/MovementArc host voice; pure copy derivation `summarizeHostReflection` sits alongside `summarizeHostCoordination` in `lib/events.ts`; on-brand anthracite+neon tokens (`.hosting-outcome`), AA, 44px reflect target, visible focus, overflow-safe 375/1280. Static server render — NO new client energy surface, so the `ethical-energy-guardrails` tripwire is untouched and GREEN. Tests: added `summarizeHostReflection` cases (honest/derived/no-fabricated-count, non-punitive, no banned mechanic, no participant data) — full web suite 665 pass + guardrail tripwire green; typecheck, lint (0 errors), and production `build` all pass. Commit `aff5f8a` (pushed to origin/main — no migration).
