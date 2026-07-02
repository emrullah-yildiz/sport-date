# Discovery distance radius and "use my location" — location handling

Status: implemented 2026-07-02 (`CX-20260701-discover-geo-radius-and-use-my-location`).

This documents how the `/discover` distance radius and the opt-in "Use my current
location" work, and — most importantly — the privacy boundary that keeps member and
venue positions approximate-area-only.

## The privacy decision (the MORE-private option)

The ticket left two things open: where member coordinates come from, and how precise a
position "use my location" may keep. We chose the more private implementation on both:

1. **No precise coordinate is ever stored for a member.** Members have no coordinate
   column at all (no migration). A member's search centre is DERIVED at query time from
   their existing free-text profile area (`users.location`) via an offline gazetteer, or
   from an opt-in device position that is coarsened before it leaves the device. Nothing
   is persisted.
2. **No external geocoder.** Sending a member's free-text area (or device fix) to a
   third-party geocoding service would be both a new network dependency (owner-escalation)
   and a privacy leak. Instead we ship a tiny in-process, Europe-first gazetteer
   (`apps/web/src/lib/discovery-geo.ts`). Areas it cannot resolve simply get no radius and
   fall back to the existing exact-city label match — never a wrong or invented location.
3. **Everything is coarsened to a ~10 km grid.** Every coordinate the feature ever
   touches — a stored event approximate coordinate, a gazetteer centre, or a device fix —
   is rounded to a `0.1°` grid (`COARSE_GRID_DEGREES`) BEFORE it is compared, sent, or
   (never) stored. `0.1°` of latitude is ~11 km, so a value can only ever name a wide
   area cell, not a point. Two precise positions in the same cell are indistinguishable,
   so a coordinate cannot be trilaterated back to a member's home or a precise venue.

## "Use my current location" — consent and lifecycle

- Strictly **opt-in**: nothing happens until the member presses the button
  (`UseMyLocationControl`), which triggers the browser's own permission prompt.
- The precise fix is **coarsened on-device immediately** (`coarsenCoordinates`) and only
  the coarse `lat`/`lng` pair is put in the URL as ephemeral query params for THIS search.
- It is **never stored** — not in the profile, not on the server, not in local/session
  storage. Reloading without the params, or pressing "Stop using my location", drops it.
- Declining the prompt is handled gracefully: discovery keeps working on the profile-area
  default. A member can use discovery fully without ever granting location.
- This is a single, non-continuous, non-stored, coarse position for one search — NOT the
  "continuous location" that `escalation-policy.md` reserves for owner escalation.

## Matching rule

`filterEventsWithinRadius` (pure, unit-tested) resolves each event's coarse centre from
its stored `public_approximate_latitude/longitude` if present, else geocodes its
`public_city` offline. An event within the chosen radius of the (coarse) centre is kept.
An event with no resolvable coordinate falls back to a same-city label match, so the
radius is purely **additive**: it can widen the feed to nearby cities but never hides an
event the pre-radius label behaviour would have shown. The web page and
`/api/events/discover` (shared with the future mobile client) apply the identical rule.

The radius is off by default (the profile-area label default is preserved as the "min"
end and "Search everywhere" as the "max" end). The empty state offers to widen to the
next radius, then to search everywhere.

## Events without a coordinate

`events.public_approximate_latitude/longitude` remain nullable and are still written as
`null` by the create form. Rather than a backfill migration + geocoding dependency, the
radius resolves an event's centre from its already-public `public_city` at query time
(gazetteer), coarsened to the same grid. This keeps the change additive and migration-free
while still giving those events a real distance match for the covered areas.

## Files

- `apps/web/src/lib/discovery-geo.ts` — pure coarsening/distance/gazetteer/matching (+ tests).
- `apps/web/src/components/UseMyLocationControl.tsx` — opt-in, on-device-coarsening control.
- `apps/web/src/app/discover/page.tsx`, `apps/web/src/app/api/events/discover/route.ts` — wiring.
- `apps/web/src/lib/events.ts` — selects the approximate public coordinate for radius matching.
