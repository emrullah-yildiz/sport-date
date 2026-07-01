# CX-20260701-event-room-host-zero-participants-cold-empty-state

- Status: `ready`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 4 × Impact 3 × Confidence 4) / Effort 1.5 = 32. Not safety/privacy/a11y, so bucketed P2 despite the score: it is a warmth/convenience empty-state gap at an emotionally raw moment (a host who just published, waiting alone).
- Customer journey: coordination (hosting → open coordination room → wait for the first request/place)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev localhost:3000, all widths; `/events/[id]/room` as the HOST before anyone has an accepted place
- Found by: Experience & Design Explorer — event room × completeness-of-states / empty-states (2026-07-01)
- Implementation owner: unassigned
- Related tickets: `CX-20260701-empty-states-lack-warmth-and-next-step` (implemented; explicitly scoped discover/hosting/profile empties — NOT the coordination room, so this is a distinct uncovered surface), `CX-20260701-event-room-no-loading-state-blank-during-fetch` (loading, not empty), `CX-20260701-hosting-hub-hides-pending-join-requests` (the /hosting list, not the room's people panel)

## Customer outcome

As a host who just published an event and opened its coordination room, when nobody has a place yet I want a warm, reassuring "no one has joined yet — here's what to do / what happens next" instead of a cold "0 people joining" next to an empty box — so the moment right after my act of generosity feels like a hopeful beginning, not a dead or broken room.

## What I observed

On `/events/[id]/room`, the "Who has a place" panel (`room-people`, `apps/web/src/app/events/[eventId]/room/page.tsx` lines 135–166) renders, for a host with zero accepted participants:

- an `<h2>` that reads literally **"0 people joining"** (line 137: `{room.participants.length} … joining`, and for the host branch the self-span at lines 139–145 is skipped, so the `<div>` container is completely empty), and
- an **empty `<div>`** below it — no copy, no illustration, no next step.

Observed live (Chromium, reduced-motion, pooled `host-A` viewing their own freshly-published event): the panel showed `h2 = "0 people joining"` with an empty participant container (0 child nodes). There is no empty-state branch in the component for `participants.length === 0`; the host simply sees a zero and a blank space. The prior cross-surface empty-states ticket (`CX-20260701-empty-states-lack-warmth-and-next-step`, implemented b631ca0) explicitly covered discover/hosting/profile and did **not** touch the coordination room.

## What I expected

When the host's room has no accepted people yet, the panel should render a calm, warm empty state that:
- acknowledges the state honestly ("No one has a place yet — that's normal for a brand-new invitation"),
- reassures (requests/accepted members will appear here as they join), and
- offers one clear next action — e.g. share the public invitation link (the existing `/discover/events/[id]` share path) or review pending requests on `/hosting` — without fabricating any traction ("people near you", fake counts, scarcity).

The empty state must be visually distinct from an error, on-brand, and consistent with the warmth already added to the discover/hosting/profile empties.

## Reproduction

1. Sign in as a host and publish a new event (or open an existing one with no accepted participants).
2. Open its coordination room: `/events/{id}/room`.
3. Observe the "Who has a place" panel: heading reads "0 people joining" with an empty container below — no reassurance, no next step, no share affordance.

Reproduction rate: `confirmed` — live ("0 people joining" + empty container observed on a pooled host's own event) and by source (no `participants.length === 0` branch in `room/page.tsx`; host-self span skipped so the map yields nothing).

## Customer impact

The coordination room is where a host lands right after the generous act of publishing. A bare "0 people joining" over an empty box at that moment reads as absence or failure and quietly discourages hosting again — the exact supply the launch loop depends on. Low-liquidity launch cities mean this zero-state is the *common* first experience, not an edge case. No authorization, privacy, or precise-location dimension (this panel already only appears to the host/accepted members); must not fabricate counts or "others near you" traction, and must not introduce scarcity pressure.

## Evidence and limits

- Evidence: `apps/web/src/app/events/[eventId]/room/page.tsx` lines 135–166 (`room-people` article: h2 = "{n} people joining"; host branch skips the self-span; `.map` over an empty participants array renders nothing; no empty-state branch). Live: `people-h2 = "0 people joining"`, participant container child count = 0, single clean h1, no horizontal overflow at 1280 or 375 (observed on pooled host-A).
- Redactions: none needed (no personal data; no participants present).
- Facts: no empty-state copy or next-step affordance exists for a host with zero participants in the room's people panel.
- Hypotheses to verify in implementation: best next action (share invitation vs link to /hosting pending requests) — likely offer share, since the room already links out to manage; confirm the same empty branch reads well for an accepted non-host participant who is (briefly) the only one in the room ("You're the first to join — others will appear here").
- Paths not tested live this pass: a room with 1+ participants (all pooled host events currently sit at 0 accepted); browser-auth was rate-limited (429) after the retest logins, so no further fresh login was attempted per the no-poll handshake — the zero-state itself was observed live before the limit.

## Duplicate check

- Search terms: "people joining", "room-people", "0 people", "empty", "next step", "share invitation".
- Tickets reviewed: full queue. `empty-states-lack-warmth-and-next-step` is scoped to discover/hosting/profile (its own AC list names those three surfaces) and does not mention the room; `event-room-no-loading-state-blank-during-fetch` is the loading state; `hosting-hub-hides-pending-join-requests` is the /hosting list. No ticket addresses the coordination room's zero-participant people panel.
- Why this is new: the room's "Who has a place" empty state (host, zero accepted) has no warmth or next step and was outside the prior empty-states pass.

## Acceptance criteria

- [ ] When the host opens their coordination room with zero accepted participants, the "Who has a place" panel renders a warm, on-brand empty state (not just "0 people joining" over a blank box), distinct from an error state.
- [ ] The empty state offers exactly one clear next action (e.g. share the public `/discover/events/[id]` invitation, or review pending requests on `/hosting`) as a 44px, focus-visible, keyboard-reachable, screen-reader-named control.
- [ ] Copy is honest and reassuring; it fabricates no counts, no "people near you", and introduces no scarcity or streak pressure.
- [ ] An accepted non-host participant who is currently the only person also sees calm, correct copy (no "0 people joining" contradiction with their own presence).
- [ ] No precise location or private data is exposed by any new share affordance (reuse the existing approximate `/discover/events/[id]` share path).
- [ ] Mobile (375) and desktop (1280) layouts stay usable with no new horizontal overflow; reduced-motion parity; AA contrast; single-h1 → h2 heading order preserved.
- [ ] Relevant automated tests and repository checks pass (incl. a test that the zero-participant host room renders the empty-state copy/next-step, not a bare zero).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (event room × completeness-of-states / empty-states). Zero-participant host people-panel observed live as a cold "0 people joining" + empty container; source-confirmed no empty branch exists. Status `ready`.
