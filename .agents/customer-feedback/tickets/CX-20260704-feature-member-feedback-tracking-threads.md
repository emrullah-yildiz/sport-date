# CX-20260704-feature-member-feedback-tracking-threads

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — owner-requested (2026-07-04). Members who submit feedback must feel heard and see action taken; a black-hole feedback box erodes the trust the whole brand is built on.
- Customer journey: member submits feedback → gets an honest acknowledgement + a place to track it → sees status change and a reply thread as the team/AI agent handles it → can reply → feels heard.
- Surface: `/feedback` (existing) + a per-ticket tracking view + comment thread + status + an internal agent/admin write path
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Builds on: existing `feedback_tickets` (migration 012), `lib/feedback.ts` (`createFeedbackTicket`, `getFeedbackTickets`), `GET/POST /api/feedback`, `/feedback` page.

## Task

Turn the existing one-way feedback box into a **tracked, two-way conversation** so members can follow their submitted tickets and see the team/AI agent respond.

- **Member tracking view:** `/feedback` lists the member's tickets with a clear, honest **status** and the latest update; a per-ticket detail (e.g. `/feedback/[id]`) shows the full thread. Only the submitter can see their own ticket (server-enforced).
- **Status lifecycle (member-visible, honest labels):** `received → in review → planned → in progress → resolved` and `closed (not planned)` — no fake "resolved". Show what each means plainly.
- **Comment thread:** each ticket has a thread. The member can add a reply; the team/AI agent can post responses. Show author as "You" vs "KeepItUp team" (never expose an internal agent identity or internal-only notes).
- **Acknowledgement:** on submit, confirm "We've received this — track it and see replies here" with a link to the ticket. Set an expectation honestly (no promised timelines we can't keep).
- **"Heard" signal:** a lightweight in-app indicator (e.g. an unread badge on Feedback) when the team replies or status changes. In-app only; any email notification rides the existing DARK `EMAIL_DELIVERY_ENABLED` gate (logged no-op when off).
- **AI-agent handling path (internal):** a protected, authenticated internal API to (a) list open member feedback, (b) post a team reply to a ticket's thread, and (c) change status. Guard it (admin/agent role or a server-side secret like the cron pattern; unauthorised → 401/404). This is what lets an AI agent triage + respond; do NOT expose it to members.

## Acceptance criteria

- A member sees only their own tickets + threads; another member / logged-out user gets 403/redirect, no content leak.
- Submit → acknowledgement + tracking link; the ticket appears with status `received`.
- Team reply + status change appear in the member's thread and flip the "heard" indicator; member can reply back.
- Internal write path requires auth; a member token cannot post as "team" or change status.
- Honest statuses only; no dark patterns; safety/core stays free.
- **DB:** additive migration — a `feedback_ticket_comments` table (id, ticket_id, author_kind `member|team`, author_id, body, created_at) + a `status` column on `feedback_tickets` if not already present (+ `last_activity_at`). No raw internal notes stored in member-visible fields.
- typecheck / lint / test / prod build green; tests cover: owner-only access, member reply, team reply via the internal path, status transition, and the unauthorised-internal-write rejection.
- **Docs updated:** the feedback lifecycle, the thread model, and the internal agent-handling path.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent, implementation owner per ticket).
- 2026-07-04 | build | implemented in commit 2bc7803 — **MIGRATION ADDED `db/034_feedback_ticket_threads.sql`, committed NOT pushed** (orchestrator pushes; deploy auto-migrate applies; already applied to dev DB). Honest member-visible status lifecycle (received→in review→planned→in progress→resolved + closed-not-planned) in pure `lib/feedback-thread.ts` (labels/meanings + legacy normalize + comment validation + DARK email gate). Member: `/feedback` list with unread "update from team" pill + tracking links; `/feedback/[id]` owner-enforced thread page (You vs KeepItUp team, status meaning, progress track, reply box, mark-seen on open); honest acknowledgement. Member reply via authed rate-limited `POST /api/feedback/[id]/comments` (owner-only, never lights own badge). PROTECTED internal path `GET /api/internal/feedback` + `POST /api/internal/feedback/[id]` {reply?,status?} behind `FEEDBACK_AGENT_SECRET` (fails closed; members can't reach it). Dark email via EMAIL_DELIVERY_ENABLED. Privacy: per-submitter only; safety reports NOT merged. Checks: typecheck ✓ lint ✓ vitest 887 ✓ (26 new incl. owner-only access, member/team reply markers, status transition, unauthorized-internal reject, dark-email-never-sends) prod build ✓. Live-verified on prod server: internal auth 401/401/200; seeded ticket → team reply + status=planned via secret → DB team comment + status planned + unread=true; mark-seen flipped unread 1→0; seed cleaned. Docs: `docs/product/feedback-tracking.md` + runbook env. Unverified: prod migration + FEEDBACK_AGENT_SECRET provisioning (owner deploy); real email owner-gated; member pages verified at lib/DB/build level (no browser session driven).

## Guardrails

- Privacy: strictly per-submitter visibility; never surface one member's feedback to another; keep **safety reports** on their separate moderation path — this ticket is for **product feedback**, do not merge the two or expose moderation internals.
- Honest, anti-dark-pattern: real statuses, no fabricated "we're on it" if nothing changed; no manipulative urgency or gamified "your ticket is important" theatre.

## Why (CEO note)

Feeling heard is retention and trust. If a member takes the time to tell us something, the product should visibly close the loop — and our AI agents can now do that at a scale a small team never could, honestly and promptly.

## Process

- Adds a migration → **commit but DO NOT PUSH**; report the migration number. `git pull --rebase` first. Full DoD. Don't touch `apps/web/public/*.html` or `docs/marketing/**`.
