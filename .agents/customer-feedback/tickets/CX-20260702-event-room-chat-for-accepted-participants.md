# CX-20260702-event-room-chat-for-accepted-participants

- Status: `in-progress`
- Severity: `high`
- Priority: `P1 high` — (Reach 4 × Impact 5 × Confidence 4) / Effort 4 = 20. Coordination is the core journey between accepting and meeting; without a way to talk, accepted members can't sort out the practical details of actually meeting.
- Customer journey: coordination
- Surface: `web` (event room)
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-02)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-event-room-*` (room surface), safety/report/block controls

## Customer outcome

As an accepted participant (or the host) of an event, I want to chat with the others in the meeting room, so we can coordinate the practical details of actually meeting — without exposing my private contact info.

## What I observed

The event room (`/events/[eventId]/room`) has coordination info, a safety brief, reflection, and afterglow — but no way for the people attending to talk to each other. There is no message/chat model in the codebase.

## What I expected

A calm, safe in-room chat where the host and accepted participants can post short messages and read the thread, so plans (timing, what to bring, "running 5 min late") can be sorted inside the product.

## Scope (smallest safe MVP; split extras to follow-ups)

- Only the **host + accepted participants** of that event can read/post (server-authorized; pending/declined/non-participants cannot). Enforce on every read and write.
- Post a short text message; read the thread newest-at-bottom; refresh via polling (or SSE if cheap) — real-time-nice, not required for MVP.
- Each message shows the sender's first name + time; **no precise location, contact details, or private data** encouraged/exposed; keep the approximate-location privacy model intact.
- Safety: a member can **report** a message (route to the existing moderation/safety queue) and **block** still works; a blocked pair does not see each other's messages; rate-limit posting; basic length cap; store minimally.
- Calm, on-brand, accessible (labelled log with `aria-live` for new messages, keyboard, 44px, contrast, reduced-motion); empty state ("Say hello and sort the details"); loading/failure/retry states.

## Acceptance criteria

- [ ] Host + accepted participants can post and read messages in their event room; pending/declined/non-participants get no access (server-enforced, tested).
- [ ] Messages show sender first name + timestamp; thread updates (poll/SSE) without a full reload; new messages announced to assistive tech.
- [ ] Report-a-message routes to the existing moderation queue; blocked pairs don't see each other's messages; posting is rate-limited and length-capped.
- [ ] No precise location / private contact exposed by the feature; data minimized; included appropriately in account export/deletion.
- [ ] Empty/loading/failure states; accessible (aria-live log, focus, 44px, contrast, reduced-motion); responsive at 1280/375; on brand.
- [ ] Migration is additive (messages table); repository checks pass incl. production build. (Migration → orchestrator migrates prod before push.)

## Handoff and retest log

- 2026-07-02 - Filed from owner feedback; status `ready`.
- 2026-07-02 - build: picked up, status `in-progress`, owner experience-build-agent. Building smallest safe chat MVP (event_messages table, server-authorized read/write for host + accepted participants, block-filtering both directions, rate-limit + length-cap, report-to-safety, export/deletion coverage).
- 2026-07-02 - build attempt interrupted (agent connection dropped before any code/commit); reset to `ready` for a fresh build.
- 2026-07-02 - build: picked up (fresh clean-slate attempt), status `in-progress`, owner experience-build-agent. Building the smallest safe chat MVP (additive `event_messages` table, server-authorized read/write for host + accepted participants, mutual-block filtering both directions, per-user + per-IP posting rate-limit, 1000-char length cap with empty rejected, report-a-message via the existing safety queue, export + deletion coverage).
