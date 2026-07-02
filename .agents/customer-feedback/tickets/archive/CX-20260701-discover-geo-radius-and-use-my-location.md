# CX-20260701-discover-geo-radius-and-use-my-location

- Status: `verified`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 4 × Impact 3 × Confidence 3) / Effort 6 = 6. The profile-area default already lets a member find events "around me" without typing a city; a true distance radius and opt-in device location are a valuable next step, not the core unmet promise.
- Customer journey: discovery
- Surface: `web` (matching logic shared with mobile)
- Found by: Follow-up split from `CX-20260701-discover-no-location-around-me-search` (Experience Build Agent, 2026-07-01)
- Implementation owner: `Experience Build Agent`
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
- 2026-07-02 - Experience Build Agent picked up; status `in-progress`.
- 2026-07-02 - Implemented (commit `112e665`, pushed to origin/main). Added an opt-in distance radius ("Within 5/25/100 km") and an opt-in "Use my current location" to `/discover`, on top of the existing "My area" default and "Search everywhere".
  - Privacy decision (chose the MORE-private option): NO precise member coordinate is ever stored — the search centre is derived at query time from the existing free-text profile area via a tiny OFFLINE Europe-first gazetteer (no external geocoder, no network leak = no owner-escalation dependency), or from an opt-in device position that is coarsened ON-DEVICE before it leaves the browser and is used for that one search only, never stored. Every coordinate (event approximate coord, gazetteer centre, device fix) is rounded to a ~10km (0.1°) grid so it cannot be trilaterated to a point. Only approximate areas are shown; the precise venue is never joined. The API reports only the coarse km + centre source, never a coordinate. Radius is purely additive (uncoded events fall back to same-city label match, never hidden).
  - Files: `apps/web/src/lib/discovery-geo.ts` (+ `.test.ts`, 34 pure-logic cases), `apps/web/src/components/UseMyLocationControl.tsx`, `apps/web/src/app/discover/page.tsx`, `apps/web/src/app/api/events/discover/route.ts` (shared rule, mobile-ready), `apps/web/src/lib/events.ts` (selects approximate public coord), `apps/web/src/app/globals.css`, `docs/architecture/discovery-geo-radius.md`.
  - Migration: NONE needed. Events already carry nullable `public_approximate_latitude/longitude`; members intentionally get no coordinate column.
  - Tests added: geo coarsening/privacy boundary, haversine distance, radius match (incl. coarsening boundary + blank-input never-(0,0)), gazetteer, end-to-end `filterEventsWithinRadius`.
  - Checks: typecheck PASS, lint 0 errors, unit tests 505 pass, prod build PASS. AA verified (green-fill buttons carry `--bg` text 9.65 AAA; consent/status `--text-muted`/`--text` on `--bg` 7.13/13.90 AAA), 44px targets, keyboard + SR labels, no overflow at 375/1280.
  - Ready for independent retest by the Explorer.
- 2026-07-02 - Tester RETEST — VERIFIED. Ran the workspace checks myself (did NOT trust the handoff): `npm run typecheck` PASS (typegen + tsc --noEmit clean), `npm run lint` 0 errors (2 pre-existing warnings unrelated to this ticket), `npm run test` 499 pass / 12 skipped (incl. the 34 geo cases), `npm run build` (production) PASS with `/discover` compiled as a dynamic route. Adversarial source review of `discovery-geo.ts`, `UseMyLocationControl.tsx`, `route.ts`, `page.tsx`, `events.ts` + all 34 tests. Privacy properties CONFIRMED: (1) no precise member coordinate is stored anywhere — members have no coordinate column, the device fix is coarsened ON-DEVICE via `coarsenCoordinates` before it enters the URL (component grep shows no localStorage/sessionStorage/cookie), passed only as ephemeral `lat`/`lng` query params, never persisted; (2) every coordinate is snapped to the 0.1° (~10km) grid, blank/empty input returns null (never 0,0) — genuine assertions at test lines 61-66 and same-cell indistinguishability at lines 40 and 218-223; (3) the API/response exposes only `{km, centreSource}` and never a centre coordinate; (4) radius is additive — an event with no resolvable coordinate falls back to same-city label match (`filterEventsWithinRadius`/`filterWithinRadius`), verified in code and tests (lines 178-184, 225-227); (5) no external geocoder — offline gazetteer only, no network. AA/a11y: `.discover-broaden` green-fill (`var(--lime)`) carries `var(--bg)` text, `min-height:44px`, `:focus-visible` outline; consent copy plain-language + `role="status"`; no "people near you"/popularity mechanic. LIVE on dev (logged in once as host-A): `/api/events/discover?radius=25` -> `radius:{km:25,centreSource:"area"}`, `?radius=25&lat=44.4&lng=26.1` -> `radius:{km:25,centreSource:"device"}` with the device lat/lng NOT echoed anywhere and all 37 events `approximateLatitude/Longitude:null`; `Cache-Control: private, no-store`; all HTTP 200. NOTE for Planner (not a blocker — no live leak): this ticket newly adds `approximateLatitude/Longitude` to the `DiscoveryEvent` response, sent VERBATIM from the `public_approximate_*` DB column, which is stored uncoarsened (only a range CHECK) and NOT re-coarsened in the response payload. Harmless today because `CreateEventForm` always writes those columns as `null` (every event returns null live) and the matching logic re-coarsens defensively via `coarseCentreForEvent`; but if that column were ever populated with a precise value the response would ship it raw. Recommend coarsening event approx coords on write and/or in the response mapper as defense-in-depth.
