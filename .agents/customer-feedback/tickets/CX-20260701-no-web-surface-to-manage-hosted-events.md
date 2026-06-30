# CX-20260701-no-web-surface-to-manage-hosted-events

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 5 × Confidence 5) / Effort 2 = 62. Core host journey; the existing `getMemberEventSummaries()` query makes effort low.
- Customer journey: coordination / host management
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Owner (direct feedback 2026-07-01); re-tested live by functional QA agent
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-event-creation-entry-point-not-discoverable` (sibling navigation gap)

## Customer outcome

As a member who has published an event, I want to return to the events I'm hosting and edit or cancel them so that I can keep my plan accurate and call it off safely if my situation changes.

## What I observed

After publishing an event there is no way back to it from anywhere in the web app. The profile page links only to `/discover`, `/events/new`, `/safety`, `/trust`, `/privacy`, `/feedback`. The routes `/events`, `/events/hosting`, `/hosting`, `/my-events` all return 404. `/discover` deliberately excludes your own events (`host_user_id <> user.id`), so you can't find your event there either. Edit (`HostEditEventForm` → PATCH) and cancel (`HostCancelEventControl` → DELETE) **do work**, but only if you already hold the event's URL (e.g. right after publishing). Verified live: editing a hosted event's title persisted.

## What I expected

A clear "Your events" / "Hosting" hub, reachable from the profile and primary navigation, listing the events I host (and ideally the ones I've joined) with their status, and giving me edit and cancel actions for each — without my having to bookmark a URL.

## Reproduction

1. Register, publish an event from `/events/new`.
2. Navigate away (e.g. to `/profile`).
3. Try to get back to the event to edit or cancel it.

Reproduction rate: `confirmed live, 1/1`

## Customer impact

Practical: a member cannot correct a wrong time/place or cancel an event they can no longer host, which risks other members showing up to a dead or wrong plan — a coordination and trust failure. Emotional: feeling trapped by something you created. No authorization or privacy regression (the APIs already gate by host); this is a missing, safe navigation surface.

## Evidence and limits

- Evidence: live functional test — `/events`, `/hosting`, `/my-events` → 404; edit-title PATCH persisted on the event page.
- Facts: `getMemberEventSummaries()` exists at `apps/web/src/lib/events.ts:363` but is consumed only by the mobile API (`apps/web/src/app/api/mobile/events/route.ts`); no web page renders it.
- Hypotheses to verify during implementation: the existing query returns the fields a hub needs (title, status, when, request counts); confirm cancelled/past events are represented sensibly.
- Paths or surfaces not tested: joined-events listing.

## Duplicate check

- Search terms used: hosting, my events, manage, edit, cancel, your events.
- Tickets reviewed: full queue (12).
- Why this is new: no existing ticket covers a hosted-events management surface.

## Acceptance criteria

- [x] A signed-in member can reach a "Your events" page from the profile and from primary navigation in ≤1 click. (`/hosting`, linked from profile primary actions, the discover nav, and the host event page nav.)
- [x] The page lists the member's hosted events with status and links to each event. Implemented as upcoming / past via the query's `hasEnded` flag. Note: the reused `getMemberEventSummaries()` query returns only `published`/`completed` events, so cancelled events intentionally leave the hub (matches the cancel flow, which now lands on `/hosting` with a confirmation that the event is no longer listed). A dedicated "cancelled" bucket would need a separate query and is out of scope for this reuse-first ticket.
- [x] From the list, one click reaches the event page where the host can edit (HostEditEventForm → PATCH) and cancel (HostCancelEventControl → DELETE); cancel already asks for confirmation and explains that accepted places, room access, and requests close and that it does not message members outside the product.
- [x] Empty state ("You're not hosting anything yet.") with a clear path to host one (and to discover one to join).
- [x] Loading (`loading.tsx`, reduced-motion-safe shimmer) and failure (`error.tsx` with retry) states handled; section headings + `aria-label`/`aria-labelledby` for screen-reader naming; 44px link/button targets; visible focus; on-brand (Ink/Cream/Lime/Coral/Sage).
- [x] No event belonging to another member is exposed — page renders only `isHost` events from the member's own session; authorization unchanged.
- [x] Relevant automated tests and repository checks pass (3 new `selectHostedEvents` cases; typecheck/lint/test green).

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback + live functional test; status `ready`.
- 2026-07-01 - Experience Build Agent picked up; status `in-progress`. Building a `/hosting` "Your events" page wired to the existing `getMemberEventSummaries()` data path, linked from the profile and discover nav.
- 2026-07-01 - Experience Build Agent implemented; status `implemented`. Added `apps/web/src/app/hosting/{page,loading,error}.tsx` reusing `getMemberEventSummaries()` via a new pure `selectHostedEvents()` helper (host-only filter + upcoming/past split) in `lib/events.ts`. Linked from profile, discover nav, and host event page nav; cancel now lands on `/hosting?event=cancelled` with a calm confirmation banner. Checks: typecheck PASS, lint PASS (only pre-existing warning is in untracked `qa/full-flows.mjs`, not touched), test PASS (147 passed incl. 3 new helper cases). Live verified on localhost:3000: registered a synthetic adult, published an event, confirmed it appears on `/hosting` with an "Upcoming" pill and reachable edit + cancel. Handing back for independent retest.
