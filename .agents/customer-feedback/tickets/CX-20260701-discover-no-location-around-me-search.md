# CX-20260701-discover-no-location-around-me-search

- Status: `in-progress`
- Severity: `high`
- Priority: `P1 high` — (Reach 5 × Impact 4 × Confidence 4) / Effort 3 = 27. Finding events near you is the core discovery promise; today a member can only text-match a city.
- Customer journey: discovery
- Surface: `web` (matching logic shared with mobile)
- Environment and viewport/device: dev localhost:3000
- Found by: Owner (direct feedback 2026-07-01, "I cannot search events happening around me")
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-discover-advanced-skill-silently-excludes-events`, `CX-20260701-discover-cards-inverted-hierarchy-unscannable-feed`

## Customer outcome

As a member, I want to find events happening near me so that I can join something local without having to know and type the exact city name.

## What I observed

`/discover` offers text/select filters (city, sport, language) but no location-based "around me" / "near me" discovery. A member must know and match a city string; there is no default-to-my-area, no proximity/radius, and no geolocation option. Searching for what's "around me" is not possible.

## What I expected

Discovery should center on where I am: default to my area (from my profile location) and let me broaden/narrow by distance ("within X km"), optionally using device geolocation with consent. Results should respect the product's approximate-location privacy — show approximate area only; never reveal a precise venue before an accepted join.

## Reproduction

1. Sign in and open `/discover`.
2. Try to find events "around me" / near my current location.
3. Observe only city/sport/language text filters — no location-based/near-me search.

Reproduction rate: `confirmed via UI + discover filter code`

## Customer impact

The central discovery promise ("find something to do near you") is unmet; members in a city with a slightly different label, or unsure what to type, see nothing and assume there are no events. Directly compounds the empty-feed problem. Privacy dimension: any location/geo feature must not expose precise positions of members or venues.

## Evidence and limits

- Evidence: `discover/page.tsx` filters (city/sport/language); `getDiscoverableEvents` matches city text; no distance/geo parameter.
- Hypotheses to verify during implementation: whether event + member locations carry structured coordinates/areas to support radius, or whether a first slice should default discovery to the member's profile city and add a distance selector; geolocation is opt-in with consent.
- Paths not tested: mobile geolocation.

## Acceptance criteria

- [ ] Discovery centers on the member's area by default (from profile location), not an empty text field.
- [ ] The member can find events near them without typing an exact city — e.g. a distance/radius control and/or an opt-in "use my location" (with clear consent) — pick the smallest valuable slice first.
- [ ] Only approximate areas are shown; no precise member or venue location is exposed before an accepted join; geolocation is consented and never stored beyond need.
- [ ] Clear empty state when nothing is nearby, with a way to broaden the radius/area.
- [ ] Accessibility (labels, focus, 44px), on-brand, responsive, no overflow; matching rule covered by a test.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Slice: default discovery to the member's profile area ("Events near <area>") with a one-tap "Search everywhere" broaden; splitting true geo-radius / "use my location" to a follow-up because the member location model is a single free-text string with no coordinates (a radius needs geocoding + schema).
