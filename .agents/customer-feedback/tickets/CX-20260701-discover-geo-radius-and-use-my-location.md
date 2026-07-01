# CX-20260701-discover-geo-radius-and-use-my-location

- Status: `ready`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 4 × Impact 3 × Confidence 3) / Effort 6 = 6. The profile-area default already lets a member find events "around me" without typing a city; a true distance radius and opt-in device location are a valuable next step, not the core unmet promise.
- Customer journey: discovery
- Surface: `web` (matching logic shared with mobile)
- Found by: Follow-up split from `CX-20260701-discover-no-location-around-me-search` (Experience Build Agent, 2026-07-01)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-discover-no-location-around-me-search`

## Customer outcome

As a member, I want to widen or narrow discovery by real distance ("within X km") and optionally use my device location, so I can find events a short trip away — not only ones sharing my city's exact label — while my precise position is never stored or exposed.

## Context — why this is split out

The first slice (`CX-20260701-discover-no-location-around-me-search`, shipped) defaults discovery to the member's profile area and offers a one-tap "Search everywhere" broaden. That solves "I cannot search events happening around me" with no schema or dependency cost, because the member's location is a single free-text string (e.g. "Bucharest") that already matches the event's `public_city`.

A true distance radius needs data that does not exist yet:

- The member has NO coordinates — only free-text `users.location` (a city). A radius needs the member's approximate coordinates (geocode the free-text area, or capture opt-in device location).
- Events carry OPTIONAL `public_approximate_latitude/longitude` (nullable in `db/003_events.sql`), often unset. A radius needs these reliably populated.
- No geocoding service is wired into the app.

That is a migration + geocoding dependency + a consented geolocation flow — too large to fold into the first slice without scope-creeping a schema change.

## What I expected

- A distance control ("within 5 / 25 / 100 km") on `/discover` that filters by real proximity to the member's area.
- An opt-in "Use my current location" that, with clear consent, centres discovery on the device's approximate position for this search only.
- Approximate-area privacy preserved throughout.

## Acceptance criteria

- [ ] Member approximate coordinates exist (geocode profile area at save time and/or opt-in device location), stored coarsely (no precise home address); documented in `docs/`.
- [ ] Events expose an approximate coordinate for discovery (backfill / require `public_approximate_latitude/longitude`, coarsened to area granularity).
- [ ] `/discover` offers a distance/radius control that filters by real proximity, with the existing profile-area default and "Search everywhere" as the min/max ends.
- [ ] "Use my location" is strictly opt-in with explicit, plain-language consent; the position is used only for the current search and never stored beyond need; a member can decline and still use the area default.
- [ ] Only approximate areas are ever shown; no precise member or venue location is exposed before an accepted join. Coordinates are coarsened (e.g. rounded / jittered to area granularity) so they cannot be trilaterated back to a precise point.
- [ ] Radius matching rule covered by a test (including the coarsening/privacy boundary); empty state offers to widen the radius.
- [ ] Accessibility (labels, focus, 44px), on-brand, responsive, no overflow. Repository checks pass.

## Evidence and limits

- Evidence: `users.location` is free-text only (`db/001_initial.sql`); `events.public_approximate_latitude/longitude` are nullable (`db/003_events.sql`); no geocoder in the codebase.
- Escalation note: continuous location, biometrics, and government ID are owner-escalation (`escalation-policy.md`). A single opt-in, non-stored, coarse position for one search is not "continuous location"; confirm the consent copy with the owner before shipping the "use my location" half if there is any doubt.

## Handoff and retest log

- 2026-07-01 - Split from `CX-20260701-discover-no-location-around-me-search` after shipping the profile-area default; status `ready`.
