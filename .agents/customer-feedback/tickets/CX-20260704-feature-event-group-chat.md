# CX-20260704-feature-event-group-chat

- Status: `in-progress`
- Severity: `medium`
- Priority: `P1` — owner-requested feature (2026-07-04). Coordination is what makes a small group actually meet; chat is core to Phase-2 liquidity/retention.
- Customer journey: member's join request is accepted → they + the host get a private event group chat to coordinate (who's bringing balls, running late, where exactly to meet once shared) → the event happens.
- Surface: event detail (accepted view) + new chat panel/route + API + DB
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Related tickets: `CX-20260704-feature-event-attendance-confirmation` (sibling event-coordination feature; may share notification seams)

## Task

A private **group chat per event**, accessible ONLY to the host and members whose join request is `accepted`. Text messages, persisted, newest-last, with sender shown by the same display identity used elsewhere (first name; never extra PII). Reasonable delivery via polling (GET-since-cursor) — no websocket dependency required; note if you add one it must degrade gracefully.

## Acceptance criteria

- **Access control (server-enforced on every read AND write):** only the host + `accepted` members can read/post. `pending`/`rejected`/`cancelled`/removed members and non-members get 403 and no message content. Leaving the event, being removed, or a block between two members immediately revokes the affected access (blocked pair must not receive each other's new messages).
- Post a message; see history; empty state ("No messages yet — say hi 👋"), loading, send-failure-retry (no lost draft), and a "chat opens once your request is accepted" state for pending members.
- **Safety wired, not new-built:** each message is reportable via the existing report flow; block uses the existing block; host can remove a member from the event (reuse existing) and that removes them from chat. No new moderation surface — route into the existing queue.
- Never render an event's exact/private meeting location as system-injected text; user-typed content is theirs (accepted members already have the private details).
- Rate-limit posting via the existing infra (per-member, per-event) to prevent flooding; no IP stored in message rows.
- Mobile-first, 44px targets, visible focus, reduced-motion parity; calm design — NO dark patterns (no read-receipt pressure, no unread-count nagging beyond a simple honest badge, no engagement streaks).
- **DB:** additive migration for an `event_messages` table (id, event_id, sender_id, body, created_at; index on (event_id, created_at)). Optional lightweight per-member last-read marker for an unread badge. No message edit/delete-for-everyone in v1 (report instead); a member may delete their OWN message (soft).
- **Docs updated:** add the feature + data model to the relevant docs (architecture/feature overview, and `docs/design-system.md` if a new component pattern is introduced). Note the access rule explicitly.
- typecheck / lint / test / prod build green; tests cover the access matrix (accepted can post; pending/blocked/removed cannot), the block-mutes-messages rule, and rate limiting.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress`. The private per-event group chat already shipped under `CX-20260702-event-room-chat-for-accepted-participants` and satisfies most acceptance criteria (server-enforced host-or-accepted access on read AND write, both-direction block-muting, per-message report → existing safety queue, block-via-report, leave/host-remove revoke access, per-member+per-IP rate limit with no IP in rows, calm polling delivery, empty/loading/error-retry states, 44px mobile design, sender first-name only, never renders the private venue). This ticket adds the one genuinely-missing item — **own-message soft delete** — plus the warmer empty state and the pending-member "chat opens once accepted" note, and updates docs.

## Guardrails

- Privacy: chat is private to accepted participants; never expose it or its existence to non-members; no exact-location leakage via metadata/OG/notifications.
- Anti-dark-pattern + safety-never-paywalled (chat is core participation, always free).

## Process

- Commit but **DO NOT PUSH** (adds a migration — the CEO orchestrates the deploy/prod-migrate). `git pull --rebase` before starting. Report the migration number.
