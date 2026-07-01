# CX-20260701-view-public-invitation-404s-for-host-own-event

- Status: `verified`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 4 × Confidence 5) / Effort 2 = 50. A prominent CTA on the publish-success page fails for the host who just created the event; it reads as "the app is broken right after I did the main thing."
- Customer journey: hosting / coordination / share
- Surface: `web`
- Environment and viewport/device: production + dev, all widths
- Found by: Owner (direct feedback 2026-07-01, "clicking on view publish event is failing")
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-discover-advanced-skill-silently-excludes-events`, `CX-20260701-join-request-gate-rejects-no-language-member-discover-shows` (same discover-gate divergence family)

## Customer outcome

As a host who just published an event, I want "View the public invitation" to actually
show me the public invitation, so I can see what others see and trust that publishing worked.

## What I observed

After publishing, the success page ("IT'S LIVE — Your event is published.") offers
**View the public invitation →** which links to `/discover/events/{id}`. Clicking it as the
host fails (404 / "not found"). Confirmed cause in code: `getDiscoverableEvent` (`events.ts:205`)
delegates to `getDiscoverableEvents`, whose WHERE clause excludes the viewer's own events
(`AND events.host_user_id <> user.id`, `events.ts:170`) — plus age/skill/language/capacity
compatibility filters. So the host's own event returns `null` → the page calls `notFound()`.
The same query would also 404 the shared invitation link for any recipient who doesn't match
the compatibility filters.

## What I expected

"View the public invitation" should render the event's public (approximate-only) invitation
for the host — a read-only preview of what others see — and for anyone opening a shared
invitation link, without leaking the precise venue. The host should not be offered a
"Request a place" action on their own event; instead show a calm "This is your event —
manage it" affordance. Compatibility filters should not turn a directly-opened invitation
into a 404 (they gate the *feed*, not a direct view).

## Reproduction

1. Sign in, publish an event.
2. On the success page, click "View the public invitation →".
3. Observe a 404 / failure instead of the invitation.

Reproduction rate: `confirmed via code (host-exclusion in the shared query) + owner report`

## Customer impact

The host is told the event is live, then the first thing they click is broken — undermining
trust at the moment publishing should feel rewarding, and blocking the share/preview path.
No privacy/auth regression, but the fix must keep the invitation approximate-only.

## Acceptance criteria

- [x] "View the public invitation" from the publish-success page renders the event's public
      invitation for the host (read-only preview) — no 404.
- [x] A directly-opened `/discover/events/{id}` shows the approximate-only invitation to any
      permitted authenticated member (not gated to 404 by feed compatibility filters); precise
      venue is never shown before an accepted join.
- [x] The host viewing their own event sees a "this is your event / manage it" affordance, not
      a "Request a place" box; requesting your own event stays impossible.
- [x] Mutual-block still hides blocked parties from each other; unpublished/cancelled events
      do not render a public invitation.
- [x] Split the event query so the FEED keeps its host-exclusion + compatibility filters while
      the SINGLE-event view uses a permitted-viewer rule (mirror the shared-helper pattern so
      they don't drift). Add a test: host can load own event's public invitation; feed still
      excludes own events; blocked party still hidden; no precise venue leaked.
- [x] Repository checks pass (incl. production build).

## Handoff and retest log

- 2026-07-01 - Filed from owner report + code confirmation (host-exclusion in shared query 404s own-event preview); status `ready`.
- 2026-07-01 - build: picked up, status `in-progress`, owner `experience-build-agent`.
- 2026-07-01 - test: VERIFIED, status `verified`. Independent retest (repo checks + live pooled login, one step, no polling). Repo: typecheck pass, lint pass (only pre-existing `full-flows.mjs` unused-var warning), test 330 pass, production `npm run build` pass. Live on dev (single login each): host-A published a Bucharest Tennis event (with a `SECRET-VENUE-XYZ` private venue) then loaded `/discover/events/{id}` for their OWN event → 200 with the "This is your event" manage affordance linking to `/events/{id}` and `/hosting`, NO "Request a place" box, approximate area (Floreasca) shown, precise venue NOT in the HTML; host `/discover` feed excludes the own event. seeker-B (second pooled member) loaded the SAME event → 200 WITH the request box, no manage affordance, no venue leak. A non-published/nonexistent event id → 404 (unpublished/cancelled don't render). Mutual-block + published-only guards confirmed in `getDiscoverableEvent` SQL (`events.status='published'` + bidirectional `user_blocks`), with unit coverage in `discoverable-event-view.test.ts` (own-event returns, feed still host-excludes, block hidden, no `event_private_locations`/`venue_name` selected). No authz weakening, no precise-location leak. Source-only sub-branch: the shared-invitation-link recipient path was exercised via a second authenticated pooled member (equivalent to a shared link opener).
- 2026-07-01 - build: implemented, status `implemented`. Split the event query — FEED (`getDiscoverableEvents`) keeps host-exclusion + compat filters; single-event view (`getDiscoverableEvent` → new `DiscoveryEventView`) returns the approximate-only invitation to any permitted authenticated viewer incl. the host, with hard guards preserved (published-only, mutual-block, never joins/selects the precise venue) and a `viewerIsHost` flag. `/discover/events/[eventId]/page.tsx` shows a "This is your event — manage it" affordance (→ `/events/{id}`, `/hosting`) for the host instead of the request box. Added `discoverable-event-view.test.ts`. Checks: typecheck/lint/test (330 passed) + production build all green. App-verified: host-A loads own events → 200 with manage affordance, no request box; seeker-B → 200 with request box. No migration. Commit `29c5e51`, pushed to origin/main.
