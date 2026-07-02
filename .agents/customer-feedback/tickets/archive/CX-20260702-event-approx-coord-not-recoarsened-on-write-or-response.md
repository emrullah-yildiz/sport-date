# CX-20260702-event-approx-coord-not-recoarsened-on-write-or-response

- Status: `verified`
- Severity: `low`
- Priority: `P3` — (Reach 3 × Impact 4 × Confidence 4) / Effort 2 = 24 → P3. Defense-in-depth / latent privacy hardening, NOT a live leak: the risky column is always written `null` today and matching re-coarsens defensively, so nothing precise ships now. Filed so the safeguard exists before the column is ever populated.
- Customer journey: discovery (location privacy posture)
- Surface: `web` (`/api/events/discover`, the `DiscoveryEvent` response mapper, `lib/events.ts`; event create/write path)
- Environment and viewport/device: all
- Found by: Tester (four-agent loop) during adversarial verification of `CX-20260701-discover-geo-radius-and-use-my-location` (2026-07-02)
- Related tickets: `CX-20260701-discover-geo-radius-and-use-my-location` (verified — introduced `approximateLatitude/Longitude` on the discovery response; this hardens the write/response side)

## What I observed

The geo-radius feature (verified) newly adds `approximateLatitude`/`approximateLongitude` to the `DiscoveryEvent` response, mapped **verbatim** from the DB `public_approximate_latitude/longitude` columns. Those columns are stored **uncoarsened** — they carry only a numeric range CHECK, not the ~10km (0.1°) grid rounding the rest of the geo system enforces. So the discovery response returns whatever precision is in the column.

This is **harmless today**: `CreateEventForm` always writes those columns as `null` (confirmed live — all 37 seeded events have `approximateLatitude/Longitude: null`), and `filterEventsWithinRadius` re-coarsens defensively before any distance use. But the safeguard is only in the matching path, not on write or in the response mapper — so if the column were ever populated with a precise value (future feature, import, or manual row), the discover API would ship a precise coordinate to clients.

## What I expected

Event approximate coordinates are coarsened to the same ~10km (0.1°) grid the rest of the geo system uses, enforced on write AND/OR in the response mapper (defense-in-depth), so a precise value can never reach a client even if the column is later populated.

## Reproduction

1. Populate an event's `public_approximate_latitude/longitude` with a precise value (not currently possible via the UI — hypothetical/manual).
2. Call `/api/events/discover`; observe the response ships the value verbatim (no re-coarsening in the mapper).

Reproduction rate: `latent (source-confirmed 2026-07-02); not reproducible via current UI because the column is always null`.

## Acceptance criteria

- [ ] Event approximate coordinates are coarsened to the ~10km (0.1°) grid using the existing `coarsenCoordinates` helper (`lib/discovery-geo.ts`) — applied on write and/or in the `DiscoveryEvent` response mapper so no precise value can ship regardless of column contents.
- [ ] No change to current behaviour for the always-null case; radius matching unaffected.
- [ ] Unit test proving a precise stored coordinate is coarsened before it reaches the response.
- [ ] Repository checks pass incl. production build. No migration expected (transform, not schema).

## Duplicate check

- Search terms used: `approximateLatitude`, `public_approximate`, `coarsen`, `DiscoveryEvent`.
- Tickets reviewed: the verified geo-radius ticket (introduced the field; its scope was the read/filter + opt-in device path, which IS coarsened) and the approximate-location-no-spatial-cue ticket (a different, presentational concern).
- Why this is new: no ticket covers coarsening the event approx coordinate on the write/response side as defense-in-depth.

## Handoff and retest log

- 2026-07-02 - Filed by the Tester after adversarial verification of the geo-radius feature; logged as a Planner note there and promoted to this standalone P3 hardening ticket. Status `ready`.
- 2026-07-02 - Builder: implemented as defence in depth at BOTH the write and response boundaries. The precise coord was leaking at TWO places: (1) WRITE — `validateEventCreation` (`packages/domain/src/event.ts`) passed the approximate public coordinate through verbatim, so the POST/PATCH `INSERT`/`UPDATE` in `apps/web/src/app/api/events/{route.ts,[eventId]/route.ts}` persisted whatever precision the caller supplied; (2) RESPONSE — `getDiscoverableEvents` + `getDiscoverableEvent` (`apps/web/src/lib/events.ts`) mapped the stored `public_approximate_latitude/longitude` columns to `approximateLatitude/Longitude` verbatim. Coarsening boundary added: WRITE now snaps to the 0.1° grid via new `coarsenApproximateCoordinate` (mirrors `COARSE_GRID_DEGREES`/`coarsenCoordinate` in `lib/discovery-geo.ts`); RESPONSE runs the columns through the existing `coarsenCoordinates` helper via `coarseApproximateForResponse`, so no finer-than-grid value ships even for a pre-existing/manual precise row. Exact-venue privacy model UNTOUCHED — the PRIVATE precise venue (`event_private_locations`, revealed only post-acceptance) keeps full precision and is never joined into the discovery projection (test pins this). Null→null preserved; radius matching + UI unchanged. NO migration (transform, not schema; all 37 rows are null today). Tests added: domain (write coarsens approx / private untouched / null stays null) + web (`coarseApproximateForResponse` never emits finer-than-grid, null-stays-null, out-of-range→null, idempotent round-trip). Checks: typecheck ✓, lint ✓ (0 errors), test 724 passed incl. privacy/anti-dark-pattern guardrails ✓, production build ✓. Commit `78329e1` (pushed to origin/main — code only, no migration). Status `implemented` for independent retest.
