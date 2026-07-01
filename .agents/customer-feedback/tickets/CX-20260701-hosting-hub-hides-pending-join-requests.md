# CX-20260701-hosting-hub-hides-pending-join-requests

- Status: `implemented`
- Severity: `high`
- Priority: `P2 high` — (Reach 4 × Impact 4 × Confidence 4) / Effort 3 = 21.3. Coordination/trust gap on the core host surface; just below P1 because it is not an auth/safety/privacy regression, but it is the highest-impact state gap on the new hub.
- Customer journey: coordination / host management (commitment → coordination)
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, observed at 1280 and 375
- Found by: Experience & Design Explorer — `/hosting × completeness-of-states` pass, 2026-07-01
- Implementation owner: `Experience Build Agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-no-web-surface-to-manage-hosted-events` (the hub this builds on, now `verified`); `CX-20260701-event-creation-entry-point-not-discoverable` (sibling hosting-nav work)

## Customer outcome

As a host with a published event, I want to see at a glance that people are waiting for my decision (and how many places are taken) so that I don't leave would-be guests in limbo and can act before the event is upon us.

## What I observed

On the new `/hosting` "Your events" hub, each event card shows only sport, title, date/time, and area/city, plus an "Upcoming"/"Past" pill and a "Manage, edit or cancel →" link. There is **no indication that anyone has requested a place, nor how many places are filled.** Yet the hub's own empty-state copy promises the host can "return to edit the time or place, **review join requests**, or call it off safely." To discover that someone is waiting, a host must open each event individually. A host running more than one event, or checking quickly on a phone before heading out, gets no signal that a decision is pending — the most time-sensitive state in the hosting journey is invisible on the surface designed to manage hosting.

Reproduced live (2026-07-01): registered a synthetic adult, published an event, viewed `/hosting`; the card carried no request or capacity information. (I did not, in this pass, have a second member send a request through to assert the count's absence end-to-end — see hypotheses.)

## What I expected

Each upcoming host card should surface the states that drive a host's next action:
- a clear, calm count of **pending join requests awaiting my decision** (e.g. "2 people waiting" / "No requests yet"), ideally as a link straight to the requests on the event page;
- **places filled vs capacity** (e.g. "2 of 4 places filled", or "Full"), so the host knows whether to keep the event open.

This is informational clarity, not a manipulative metric: it is the host's own event, the numbers help a real meeting happen, and it exposes no other member's identity, skip count, or precise location on the hub.

## Reproduction

1. Register a synthetic adult and publish an event from `/events/new`.
2. (Ideally) have a second synthetic member request a place.
3. Open `/hosting` from the profile "Your events" link.
4. Observe the card shows no pending-request count and no places-filled state.

Reproduction rate: `card-content audit confirmed 1/1; end-to-end pending count not yet exercised with a second member`

## Customer impact

Practical: requests can sit unseen until they expire or the event passes, so people who reached out are silently left hanging and the host looks unresponsive — a coordination and trust failure on the exact surface meant to prevent it. Emotional: a host who opens the hub expecting "review join requests" (as the copy promises) finds nothing actionable and must dig event by event. No authorization, privacy, or precise-location dimension — the data is the host's own aggregate counts; do not expose requester identities, skip counts, or locations on the hub. Not a safety regression.

## Evidence and limits

- Evidence: live card-content audit on `/hosting` — only sport/title/when/area shown; no request or capacity field.
- Facts: the hub reuses `getMemberEventSummaries()` whose `MemberEventSummary` type (`apps/web/src/lib/events.ts:221`) carries **no** request or accepted/capacity counts; the discover query separately computes `acceptedCount`/`placesRemaining` (`events.ts:156-157`), so the aggregate is already derivable elsewhere.
- Redactions made: synthetic email redacted; no requester identity, location, or report content involved.
- Hypotheses to verify during implementation: surface a *count* only (no names/skip counts) to honour the anti-dark-pattern and privacy rules; decide whether "places filled" belongs on past cards too; confirm the count query stays cheap (single aggregate per event).
- Paths or surfaces not tested: the end-to-end accepted/pending count rendering once a second member requests (rate-limited registration this pass).

## Duplicate check

- Search terms used: hosting, requests, pending, places, capacity, review join requests, hub, counts.
- Tickets reviewed: full queue (21), especially the 6 owner tickets of 2026-07-01 and the now-`verified` `no-web-surface-to-manage-hosted-events`.
- Why this is new: the parent ticket delivered the hub and navigation; it explicitly scoped card *richness* out ("reuse-first"). No ticket covers surfacing pending-request / capacity state on the hub. This is independently fixable (a count on the card) and independently checkable.

## Acceptance criteria

- [ ] Each upcoming host card on `/hosting` shows a calm count of pending join requests (with a sensible "No requests yet" zero state) and the places-filled-vs-capacity state.
- [ ] The pending-requests element links to (or is) a one-click path to act on those requests on the event page.
- [ ] Only aggregate counts appear on the hub — no requester names, skip counts, attractiveness/popularity metrics, or precise locations are exposed (anti-dark-pattern + privacy honoured).
- [ ] Copy is host-toned and truthful, matching implemented behaviour; no urgency/scarcity pressure (coral used sparingly if at all).
- [ ] Loading, empty (no events, and events-with-no-requests), and failure states remain coherent with the new fields.
- [ ] Mobile 375 and web layouts stay free of overflow; the count is keyboard-reachable, screen-reader-named, 44px target where interactive, reduced-motion safe, on-brand (Ink/Cream/Lime/Coral/Sage).
- [ ] Relevant automated tests and repository checks pass (extend the `selectHostedEvents`/summary tests for the new count derivation).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (`/hosting × completeness-of-states`); status `ready`.
- 2026-07-01 - Picked up by Experience Build Agent (Claude Opus 4.8); status `in-progress`.
- 2026-07-01 - Implemented by Experience Build Agent (commit `ecafae6`). Each upcoming host card now shows an aggregate pending-request count ("N people waiting for your reply" / "No requests yet") linking to the event's accept/decline flow, plus places-filled-vs-capacity ("N of M places filled" / "All places filled"); past cards mark requests closed. Data path is additive with NO migration: `getMemberEventSummaries` gains two read-only scalar subqueries (accepted seats via `event_participants`, pending via `join_requests`) + `events.capacity`; new `HostCoordination` is attached only when the viewer hosts the event (authz-tested — no other host's counts, no requester identity/skip/location on the hub). New pure helper `summarizeHostCoordination` unit-tested (singular/plural/full). Checks: typecheck pass, lint pass (only pre-existing untouched `qa/full-flows.mjs` warning), test pass (267), production build pass (`/hosting` dynamic). Live-verified as pooled host-A: hub rendered "No requests yet" / "0 of N places filled" from real DB counts with no requester data exposed (seeker join-request end-to-end blocked by login rate-limit this pass; pending>0 branch covered by the shared helper's unit tests). Status `implemented` — awaiting independent Explorer retest. Committed LOCALLY only (prod push held).
