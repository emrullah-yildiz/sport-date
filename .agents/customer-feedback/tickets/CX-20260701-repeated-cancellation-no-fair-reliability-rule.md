# CX-20260701-repeated-cancellation-no-fair-reliability-rule

- Status: `in-progress`
- Implementation owner: Experience Build Agent
- Severity: `high`
- Priority: `P1` — (Reach 4 × Impact 4 × Confidence 3) / Effort 3 = 16. Held at P1: reliability directly protects hosts and the safe-completed-event north-star, and a *fair, recoverable* rule is a member-dignity/safety concern that must not be built carelessly. Severity of the consequence itself is an **owner-tunable** (see below).
- Customer journey: commitment → graceful exit → recovery (join/unjoin reliability)
- Surface: `web` (mobile parity required, since cancellations happen on the day)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 5
- Related tickets: `CX-20260701-graceful-exit-no-show-non-punitive-handling` (dignity of leaving — MUST coordinate, not duplicate; that ticket is deliberately anti-punitive and out-of-scope for a consequence), `CX-20260701-warm-post-event-positive-vibe-moment`

## Customer outcome

As a host relying on people showing up, I want repeated last-minute cancellations to carry a fair, proportionate consequence; and as a member, I want that rule to be transparent, private, and recoverable, so that reliability is protected without shaming anyone or punishing someone for leaving to stay safe.

## What I observed

There is **no member-side reliability rule at all**. When a member cancels a place, `cancelEventJoinRequest` (`apps/web/src/lib/join-requests.ts`) simply sets the join request to `cancelled`, stamps `cancelled_at`, and frees the seat. Nothing counts consecutive cancellations, nothing warns the member, and there is no cool-down or any other consequence, no matter how many times in a row they cancel.

Important context checked before designing (so we extend, not duplicate):

- The existing `skip_count` / "3 skips then quietly declined" logic (`join-request-policy.ts`, `decideEventJoinRequest`) is **host-side** — it counts how many times a *host* skipped a *requester* on one event. It is **not** a member reliability signal and must not be conflated with one.
- `no_show` exists only as a **report reason** (`db/006_safety_moderation.sql`), not as a tracked reliability mechanic.
- `event_reflections` capture self-reported `attendance` (`attended` / `left_early` / `did_not_attend`) but drive only a private progress arc; they are not used for any consequence.
- The `graceful-exit-no-show` ticket deliberately forbids punitive framing. This ticket must layer a *fair, recoverable* consequence on top of that dignity work without contradicting it: leaving to stay safe is never penalised.

The owner's example ("3 consecutive cancellations has a punishment") requires a mechanic that does not exist today.

## What I expected — proposed fair, transparent, private, recoverable mechanic

Design (details are recommendations; the numbers are owner-tunable):

1. **What counts:** only *member-initiated* cancellations of an **accepted** place (and/or self-reported/host-confirmed no-shows) within a short window before the event start. Cancelling a still-*pending* request, or cancelling well in advance, should count for little or nothing. A cancellation made via the safety path (report/block/"I felt unsafe") **never counts**.
2. **Clear warning before any threshold:** at the second qualifying cancellation, show a calm, private heads-up ("Two late cancellations recently — one more within N days may pause new joins for a short while") so nothing is a surprise.
3. **Proportionate, limited consequence at the threshold:** on the third consecutive qualifying cancellation within a rolling window, a **temporary cool-down on requesting *new* places** (e.g. 48–72h — owner-tunable). It must **not** block: leaving an event, reporting, blocking, accessing safety features, editing profile, or attending events already accepted. The cool-down is a pause on *new joins only*.
4. **Transparent:** the member sees, privately, that a cool-down is active, why, and exactly when it lifts.
5. **Recoverable / restores standing:** the counter resets after the window passes cleanly, and one clean attended event should visibly restore standing. Provide a path back ("your standing resets on <date>, or after your next completed event").
6. **Private by default:** the count and any cool-down are **never** shown to hosts, other members, or on the profile. No public reliability score, no badge, no "X cancellations" exposed to a requester or host. (This preserves the "skip counts stay private" / "make rejection private and non-punitive" principles.)
7. **No public shaming, no popularity/attractiveness metric.** This is a private, recoverable guardrail, not a reputation display.

**Owner-tunable / escalation:** the *proportionality and severity* — window length, threshold count, cool-down duration, and whether no-shows count as heavily as cancellations — are product-policy dials the owner may want to set. Ship with conservative, forgiving defaults (favouring the member) and expose the constants clearly; if the owner wants a stricter stance, that is an owner decision. Flag any move toward a *visible* reliability signal as a separate `blocked-owner` decision (it is a safety-sensitive exposure choice — see the peer-feedback visibility ticket).

## Reproduction

1. As a member, request and get accepted to several events, then cancel each place shortly before it starts, repeatedly.
2. Note there is no warning, no counter, no cool-down, and no consequence of any kind — reliability is unprotected.

Reproduction rate: `confirmed via source 2026-07-01 (no counting/consequence exists)`

## Customer impact

Hosts plan real logistics around accepted counts; unchecked serial cancellation quietly wrecks events and the safe-completed-event north-star, while hosts have no protection. Conversely, a careless punishment would harm member dignity and could deter someone from leaving when they should. The design must protect reliability **and** never penalise a safety-motivated exit. Safety- and dignity-relevant.

## Duplicate check

- Search terms used: "cancel", "no_show", "reliability", "skip", "cooldown", "consecutive", "punish", "standing".
- Tickets reviewed: full queue. `graceful-exit-no-show` covers the *dignity* of leaving and is explicitly anti-punitive; no ticket designs a reliability *consequence* for repeated cancellations.
- Why this is new: this designs the missing fair/transparent/recoverable consequence mechanic, coordinating with (not duplicating) the graceful-exit ticket.

## Acceptance criteria

- [ ] Only member-initiated cancellations of accepted places (and/or confirmed no-shows) within the defined window count; cancelling early or a still-pending request counts little/none; safety-motivated exits never count.
- [ ] A member receives a clear, private warning **before** any consequence threshold is reached.
- [ ] At the threshold, the only consequence is a **temporary, time-bounded cool-down on requesting new places**; leaving, reporting, blocking, safety features, profile editing, and already-accepted events remain fully available.
- [ ] The member can always see, privately, that a cool-down is active, why, and exactly when it lifts; standing is recoverable (window reset and/or a clean completed event restores it).
- [ ] Counts, warnings, and cool-downs are **never** exposed to hosts, other members, or the profile; no public score/badge; no popularity or attractiveness metric introduced.
- [ ] Threshold count, window, and cool-down duration are defined as clearly-labelled, owner-tunable constants with conservative, forgiving defaults; any move to a *visible* signal is escalated separately.
- [ ] Loading/empty/failure and recovery states are appropriate; the member always has a calm next step.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered; reduced-motion safe.
- [ ] No precise location or private safety content is exposed to an unauthorized person.
- [ ] Relevant automated tests (including that safety-motivated exits and early cancellations do not count, and that the cool-down never blocks safety/leave) and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 5); status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`.
