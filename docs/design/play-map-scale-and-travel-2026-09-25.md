# Play Map: scale, travel and filters

The owner prefers Play Map and asked how it works with 100 games and travel to another country. This refinement develops that direction in the local `/concepts` comparison. It does not treat preference as approval for a production rollout or a launch geography.

## Interaction model

- A city overview groups matching games into broad areas. Each marker shows the count of games satisfying the current filters. Selecting an area narrows the results; All areas returns to the city. This replaces the original three floating event cards, which would overlap with larger supply.
- Map mode combines the area overview with the same complete result list. List mode hides the map. Eight games appear per page; Previous/Next reaches every match without an infinite feed. Changing a filter resets pagination. Switching views and returning from event details preserves filters and page.
- Destination is independent of the profile's home city. The local concept offers Bucharest/Romania, Barcelona/Spain and Lisbon/Portugal. Changing destination clears only the previous area selection; dates and preferences persist. No GPS permission, inferred travel, account change or device location is used.
- Arrival and departure dates are inclusive destination-local calendar dates. Results and event details identify the destination time zone. Reversed dates show an error; a valid search with no matches shows a reset action. Clear filters retains the chosen destination.
- Sport choices stay visible. More filters contains skill level, time of day, language, area, available places and free games. Active chips remove individual filters. Sort by soonest or most places. All-level games qualify for any selected skill level; these are game requirements, not rankings of people.
- Event details carry destination, date, local time-zone label, language and cost. Full games have a disabled request button. Opening the host profile and returning to its game preserves the destination rather than substituting the original Bucharest example.

## Data and location boundary

There are 300 deterministic fictional records, 100 per city, dated October 2–8, 2026. The original three Bucharest activities remain fixtures. This is a UX demonstration, not real activity supply or an availability/latency benchmark. Demo dates and fictional counts are visibly labelled.

All filter and pagination state stays in page memory. The existing concept route remains unavailable in production. No network data, analytics, geolocation, storage or account mutations are added. The map's percentage anchors are explicitly illustrated positions for broad areas. They are not venue, participant or device coordinates. Precise meeting locations remain outside discovery.

A production implementation should search destinations, filter and paginate on the server, and return bounded aggregates for the visible broad areas before retrieving individual result pages. City/region aggregation can extend the same approach beyond 100 games. Exact venue coordinates must not be sent in public discovery payloads; authentication and accepted-participant authorization remain responsible for meeting details. Production date formatting must use the event's IANA zone and actual date, rather than the fixed offsets appropriate to this fixture week. Map panning, arbitrary worldwide destination search, radius filtering and live geographical tiles are not implemented by this local sketch.

## Verification

Passed: 16 focused route/data tests, all workspace typechecks, scoped ESLint, production build, three scale/travel browser cases and all ten existing concept regression cases. The browser runs recorded zero runtime errors or forbidden network requests. Independent review led to fixes for profile navigation reopening stale travel events, pagination focus/scroll position, and local-time separators. Final desktop/mobile screenshots were reviewed.

`play-map-data.test.ts` covers destination counts, combinations, inclusive/invalid dates, visitor choices, skill compatibility, stable sorting, zero results, time-period boundaries and count conservation. `qa/play-map-scale.mjs` exercises the actual UI at 1280, 390 and 320 pixels, including reaching all 100 games, travel, filter state, map/list switching, keyboard controls, event continuity, reduced motion and guarded network access. Existing concept QA continues to cover profiles, photo controls, requests and progress for all themes.

Next: compare the refined Play Map with the owner and introduced adults, especially “find a beginner-friendly game during a trip” and “find a game in an area with many results.” Consolidate the chosen visual system before applying it to actual discovery and authentication flows.
