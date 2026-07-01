# CX-20260701-event-room-stays-future-tense-after-event-ends

- Status: `ready`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 3 × Impact 3 × Confidence 5) / Effort 2 = 22.5. Reach: every accepted member (and the host) who returns to the coordination room after their meeting has finished — the natural moment to reflect, which the room itself invites via its reflection form. Impact: the room contradicts its own state — it still gives pre-event "before you go / check the time / when you arrive" instructions and presents the venue as an upcoming rendezvous for an event that already happened, which is disorienting and slightly undignified at the closure phase. Confidence 5: the future-tense copy is unconditional in source (only the reflection form is gated on `hasEnded`). Effort 2: gate the arrival-guidance/venue framing on the `room.hasEnded` boolean the page already computes. Not an auth/privacy/a11y floor, so P2.
- Customer journey: reflection (arrival → activity → graceful exit → reflection) — the post-event return to the coordination room
- Surface: `web` (mobile + desktop; same component)
- Environment and viewport/device: `/events/{id}/room`, dev server localhost:3000. State derived from source (`room.hasEnded` computed but only used to toggle the reflection form). No live end-to-end because fast-forwarding an event to "ended" is not reachable through the member UI this pass.
- Found by: experience-design-explorer (events-room × completeness-of-states pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-hosting-past-events-no-reflection-or-outcome` (P3 — past-event closure on the **/hosting hub cards**, a different surface; this ticket is the **room page** contradicting its own tense), `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (verified — sibling coordination surface). No existing ticket covers the room page's post-event copy state.

## Customer outcome

As a member (or host) returning to the coordination room the evening after our game has finished — to note how it went — I want the room to acknowledge that the event is over and speak in the past tense, so that closing the loop feels like a warm ending rather than a page still telling me to "check the time and equipment" for a meeting that already happened.

## What I observed

Walking the room's states in `apps/web/src/app/events/[eventId]/room/page.tsx`, the page computes `room.hasEnded` (`starts_at + duration <= NOW()`, from `getEventRoom`) but uses it for **only one thing** — mounting the `EventReflectionForm` at the bottom. Every other section stays in **pre-event / future tense regardless of whether the event has ended**:

1. **The "A calm arrival" rhythm panel still gives before-you-go instructions.** After the event has ended it still reads, unconditionally: *"Before you go — Check the time, equipment, exact address, and latest host updates,"* *"When you arrive — Meet in the stated public venue,"* and *"If plans change — Cancel your place so the host has an accurate group."* For a member who already attended and came back to reflect, this is guidance for a meeting that is over.

2. **"Where you are meeting" presents the venue as an upcoming rendezvous.** The panel-label *"Where you are meeting"* and the venue block read as a live, upcoming meeting point even once the event has finished — there is no "where you met" / past framing.

3. **The hero gives no "this event has finished" signal.** The hero shows the (now past) date with `dateStyle: full` but no state cue that the event is over — so the reflection form appearing at the very bottom is the only hint that the whole page is now in retrospect, and the sections above actively contradict it.

The result is a single page that simultaneously says "reflect on what happened" (bottom) and "check the time before you go / meet in the venue" (middle) — two mutually exclusive tenses on the same screen.

Not observed as broken (correct, keep): the reflection form itself is calm, non-punitive, and correctly gated on `hasEnded`; the safety/report controls and the "why there is no chat yet" note are state-independent and fine; the meeting-point data is correctly authorization-gated (accepted members / host only).

## What I expected

Once `hasEnded` is true the room should shift into a calm **retrospective** state: the hero acknowledges the event finished ("This event has finished" / past-tense date framing), the arrival-rhythm panel either hides or swaps to post-event guidance (e.g. "How it went" instead of "Before you go"), and the venue panel reframes to past tense ("Where you met") or steps back so the reflection prompt leads. No new data is needed — everything keys off the `hasEnded` boolean the page already has. Calm and non-punitive: a member who did not attend must not be scolded by the copy.

## Reproduction

1. Be an accepted participant (or the host) of an event whose start time + duration is now in the past.
2. Open `/events/{id}/room`.
3. Observe the reflection form ("What actually happened?") at the bottom — correct for a finished event.
4. Scroll up: the "A calm arrival" panel still instructs "Before you go — check the time, equipment, exact address"; "Where you are meeting" still presents the venue as upcoming; the hero gives no "finished" cue.
5. Note the page is telling you both to prepare to arrive and to reflect on what already happened.

Reproduction rate: `source-derived (hasEnded gates only the reflection form; all other sections are unconditional future tense). Live past-event render not exercised — an event cannot be fast-forwarded to ended through the member UI this pass.`

## Customer impact

Reflection is the dignified close of the journey — the room even invites it. But the surrounding copy stranded in future tense makes the close feel careless: the product doesn't seem to know the meeting already happened. Practically it's mildly confusing (which instructions apply?); emotionally it undercuts the "warm confirmation / graceful exit" the experience principles ask for at exactly the reflective moment. No authorization, privacy, precise-location, or data dimension — the venue is already correctly gated to accepted members/host; this is purely which *tense/copy* is shown for an ended event. Accessibility: no regression, but the fix should keep a single logical heading order and announce nothing spuriously.

## Evidence and limits

- Evidence: source — `page.tsx` computes `hasEnded` in `getEventRoom` (`events.ts:293`: `starts_at + duration_minutes * INTERVAL '1 minute' <= NOW()`) and uses it only at `{room.hasEnded ? <EventReflectionForm .../> : null}`. The `.room-rhythm` panel ("A calm arrival" / "Before you go" / "When you arrive" / "If plans change") and the `.room-meeting` panel ("Where you are meeting") render unconditionally. The hero renders the date with no state cue.
- Redactions made: none needed (no member data, no venue address quoted).
- Facts: the tense contradiction is structural — the future-tense sections are not gated on `hasEnded`, only the reflection form is.
- Hypotheses to verify during implementation: whether to hide vs. reword the arrival-rhythm panel post-event; best hero cue ("This event has finished" eyebrow/badge); whether the venue panel should stay (as "where you met") or collapse; the host view may want a slightly different retrospective (attendance recap) — keep both non-punitive.
- Paths or surfaces not tested: live rendering of an ended room (cannot fast-forward via UI); the host vs participant retrospective difference; real-AT reading order after the copy swap.

## Duplicate check

- Search terms used: room, ended, past, reflection, hasEnded, before you go, calm arrival, where you are meeting, retrospective, finished.
- Tickets reviewed: full queue (29 files). Nearest: `hosting-past-events-no-reflection-or-outcome` (the **/hosting hub** past-card closure — different surface and fix; this is the room page's own tense) and `join-request-commitment-hard-reload` (sibling coordination surface, verified).
- Why this is new: no ticket addresses the coordination room's post-event copy state / tense contradiction. Independently fixable in `room/page.tsx` by branching the arrival-guidance and venue framing on the existing `hasEnded` flag, with no data or authorization change.

## Acceptance criteria

- [ ] When the event has ended (`hasEnded`), the room no longer shows pre-event "before you go / when you arrive" instructions as current guidance — the arrival-rhythm panel is hidden or replaced with post-event copy.
- [ ] The hero (or a clear cue near it) states the event has finished / uses past-tense framing, so the whole page reads as a retrospective consistent with the reflection form.
- [ ] The "Where you are meeting" venue panel is reframed to past tense ("where you met") or steps back so it no longer implies an upcoming rendezvous; the venue stays authorization-gated exactly as today.
- [ ] Copy stays calm and non-punitive for a member who did not attend or left early — no blame, no score, no streak.
- [ ] Before the event ends, the current pre-event room is unchanged (no regression to the upcoming-event experience).
- [ ] Single logical heading order preserved; no spurious live-region announcement introduced; layout holds at 375 and 1280; touch targets ≥44px; reduced-motion parity.
- [ ] No precise location or other sensitive data exposed to an unauthorized viewer (unchanged gating).
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (events-room × completeness-of-states pass); status `ready`. Tense contradiction derived from source (`hasEnded` gates only the reflection form; arrival-guidance + venue framing are unconditional future tense). Self-contained for an implementer; live ended-room render not exercised (cannot fast-forward an event via the member UI this pass).
