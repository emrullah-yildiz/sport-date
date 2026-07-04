# Member feedback tracking & threads

Tracked, two-way product feedback (CX-20260704-feature-member-feedback-tracking-threads).
Turns the one-way feedback box into a conversation a member can follow, and gives an
authenticated agent/admin a protected path to triage and respond. **Product feedback only** —
member-safety reports stay on their separate moderation path and are never merged here.

## Data model (migration 034, additive)

Builds on `feedback_tickets` (012):

- `feedback_tickets` gains: an expanded `status` lifecycle (below), `last_activity_at` (any
  thread activity), `last_team_activity_at` (team reply or status change only), and
  `member_last_seen_at` (when the submitter last opened the thread).
- `feedback_ticket_comments` — one row per message: `id`, `ticket_id` (FK → tickets, cascade),
  `author_kind` (`member` | `team`), `author_id` (nullable BIGINT, `ON DELETE SET NULL` — an
  AI/agent team reply may have no user), `body`, `created_at`. **No internal-only notes are ever
  stored in member-visible fields.**

## Status lifecycle (honest, member-visible)

`received → in_review → planned → in_progress → resolved`, plus `closed_not_planned`
("Closed — not planned"). Each has a plain meaning shown to the member (see
`apps/web/src/lib/feedback-thread.ts`, the single source of truth for labels/meanings and the
`normalizeMemberFeedbackStatus` that maps legacy 012 values `open`→`received`,
`closed`→`closed_not_planned`). No fake "resolved": not-planned is a distinct, honest close.

## Member experience

- `/feedback` lists the submitter's own tickets with the honest status, an **"update from the
  KeepItUp team"** unread pill when there's new team activity, and a link into each thread.
- `/feedback/[id]` shows the full thread (author shown as **"You"** vs **"KeepItUp team"** — the
  internal agent/team identity is never exposed), the status + its meaning, a simple progress
  track, and a reply box. Owner-enforced server-side: a non-owner or logged-out visitor gets a
  404, never a content leak. Opening the thread marks it seen (clears the badge).
- Submit acknowledgement: "We've received this — track it and see replies here," honest about no
  promised timeline.
- The **"heard" signal** is in-app (the unread pill / `countUnreadFeedback`). Any email
  notification rides the **DARK** `EMAIL_DELIVERY_ENABLED` gate — a logged no-op until the owner
  provisions an ESP (`dispatchFeedbackNotification`; never sends while off).

## Internal agent/admin path (protected — never reachable by members)

Guarded by a shared bearer secret `FEEDBACK_AGENT_SECRET` (fails closed when unset, mirroring the
cron pattern; see `lib/internal-agent-auth.ts`):

- `GET /api/internal/feedback` — list OPEN feedback (excludes resolved/closed) with reporter +
  comment count for triage.
- `POST /api/internal/feedback/[ticketId]` — body `{ reply?, status?, authorId? }`: post a team
  reply and/or change status. Either action bumps `last_team_activity_at` (lighting the member's
  badge) and fires the dark member-update email.

Members authenticate with a session, never the secret, so a member token can neither post as the
team nor change a status. The member reply path is the separate authenticated
`POST /api/feedback/[ticketId]/comments` (owner-enforced, rate-limited), which only ever writes an
`author_kind = 'member'` comment and never bumps the team-activity marker.
