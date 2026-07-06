# CX-20260706-event-location-map-picker — Pick the meeting spot on a map + map preview

**Priority:** P1 (host UX / owner request) · **Status:** ready · **Owner-gate:** none
**Filed by:** CEO on owner direction (2026-07-06): "For the location, add a feature
to pick a spot from the map or when users select a location, show it on the map too."

## Why
Hosts currently pick the exact venue via address search only (Photon/OSM
autocomplete). Text alone is error-prone ("which entrance? which court?") and
gives no visual confirmation. A map preview + pick-on-map closes the loop.

## What to build
1. **Map preview on selection** — when the host picks an address suggestion in
   the event create/edit form, show an inline map centered on the chosen
   coordinates with a marker. Selecting a different suggestion moves the marker.
2. **Pick/adjust on the map** — the host can tap/click the map (or drag the
   marker) to set/fine-tune the exact spot. On pick: update the stored
   lat/lng, and reverse-geocode (through our existing server proxy pattern —
   same data-minimization as the forward geocode: no member identity, no
   cookies, no client IP forwarded) to refresh the address fields; keep the
   host's typed venue name.
3. Works on mobile (touch) and desktop; the address search stays the primary,
   keyboard-accessible path — the map is an enhancement, not a requirement.

## Implementation guidance
- Map library: **Leaflet + OpenStreetMap tiles** (free, no API key). New
  dependency allowed (leaflet; plain leaflet over react-leaflet is fine if it
  keeps the bundle lean). Load the map lazily (dynamic import / on section
  visibility) so the form doesn't pay the cost up front and no tile request
  happens before the host reaches the location step.
- Reverse geocoding: extend the existing location-search proxy
  (`LOCATION_SEARCH_BASE_URL` / Photon supports `/reverse`) — rate-limited,
  no-store, authenticated, same anonymization as the forward search.
- Reuse the existing private-location persistence (lat/lng already stored via
  the pin-selection work — see `docs/operations/agent-state.md` 2026-07-04
  "Exact event pin selection").

## Hard rules
- **The exact pin stays private.** The map picker lives ONLY in the host's
  create/edit flow (and may later show for ACCEPTED participants on the event
  page — out of scope here). Nothing about the exact pin may reach discovery,
  the public invite, or the poster. Add a test asserting the public surfaces
  stay pin-free.
- OSM attribution rendered on the map (tile usage policy).
- Full DoD: typecheck, lint, full web suite, prod build.

## Pointers
- `apps/web/src/components/AddressAutocomplete.tsx` — current search + selection.
- `apps/web/src/components/CreateEventForm.tsx` — location section (`#section-location`).
- The location-search proxy route (grep `LOCATION_SEARCH_BASE_URL`).
- `apps/web/src/lib/approximate-location.ts` — the public/private boundary.
