# CX-20260704-feature-event-attendance-confirmation

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — owner-requested (2026-07-04). No-shows are the #1 killer of small-group events; a T-2h confirm/cancel loop protects liquidity and frees spots for others.
- Customer journey: ~2 hours before an event starts, each accepted attendee is asked "Still coming?" → they Approve (confirm) or Cancel (release their spot) → host sees a live confirmed count; a cancelled spot reopens.
- Surface: scheduled job (cron) + tokenized approve/cancel routes + in-app prompt on event detail + DARK email + API + DB
- Environment and viewport/device: web + email
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Related tickets: `CX-20260704-feature-event-group-chat` (sibling); email delivery is owner-gated (see the HQ "email delivery" card / owner-escalation).

## Task

A **T-2h attendance confirmation** loop for accepted attendees, delivered **in-app AND by email**, with one-click **Approve / Cancel** links. Email SENDING is built **DARK** behind the existing delivery gate; everything else works and is testable now.

## Acceptance criteria

- **Scheduler:** an idempotent job runs every ~15 min (Vercel Cron in `apps/web/vercel.json` → an internal cron route protected by a `CRON_SECRET`/Vercel-cron header; unauthorised callers 401). It selects published events starting within the next ~2h whose accepted attendees have no confirmation record yet, and creates one `pending` confirmation per attendee (+ a signed token). Never double-processes (a `reminded_at` / unique constraint guards re-runs).
- **In-app:** within the 2h window, the event detail shows the attendee a clear "Confirm you're coming / Can't make it" prompt; host sees a confirmed/pending/cancelled breakdown. Works with email fully off.
- **Tokenized links:** `/e/{id}/confirm?t=…` and `…/cancel?t=…` (or similar) — signed, single-purpose, per-membership, no login required, expire at event start, and can ONLY affect that one membership (no enumeration, no acting on others). Confirm → `confirmed`; Cancel → `cancelled`, which **releases the spot** (spots-left increments, host notified, audit row), reversible only by re-requesting.
- **Email (DARK):** compose a plain, honest reminder email (event, time, approximate area, Approve/Cancel buttons, support@keepitup.social). Send through the existing email seam gated by `EMAIL_DELIVERY_ENABLED` (mirror the fail-closed pattern of `photo-storage.ts` / billing): when disabled, the send is a logged no-op — NO real email leaves — while the confirmation records + tokens + in-app flow still function. Real email requires the owner to provision an ESP and flip the flag.
- No punitive surprise: if an attendee doesn't respond, they stay `pending` (host sees it) — do NOT auto-cancel silently. Honest, non-manipulative copy; no fake urgency.
- **DB:** additive migration — `event_attendance_confirmations` (id, event_id, member_id, status pending|confirmed|cancelled, token_hash, reminded_at, responded_at, created_at; unique (event_id, member_id)). Store only a token HASH, never raw.
- typecheck / lint / test / prod build green; tests cover: the T-2h selection window + idempotency, token confirm/cancel effects, cancel releases a spot, expired/invalid/foreign token rejected, and the dark-email no-op path (asserts nothing sends when the flag is off).
- **Docs updated:** document the scheduler, the confirmation lifecycle, the token design, and the email-gate dependency in the relevant docs.

## Guardrails

- Email delivery is owner-gated — build dark, never send real mail until the owner enables it. Surface the dependency; don't work around the gate.
- Tokens must be unguessable and scope-limited; approve/cancel must be safe to expose in an email to the wrong inbox (worst case: that person cancels their own attendance — acceptable; never exposes others' data).
- Safety/core participation stays free; this is coordination, never paywalled.

## Process

- Commit but **DO NOT PUSH** (adds a migration + a cron route — CEO orchestrates deploy/prod-migrate and will confirm the Vercel Cron + `CRON_SECRET` env). `git pull --rebase` first. Report the migration number and the exact cron route path + schedule you configured.
