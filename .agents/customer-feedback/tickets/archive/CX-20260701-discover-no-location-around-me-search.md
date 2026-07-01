# CX-20260701-discover-no-location-around-me-search

- Status: `verified`
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

- [x] Discovery centers on the member's area by default (from profile location), not an empty text field.
- [x] The member can find events near them without typing an exact city — e.g. a distance/radius control and/or an opt-in "use my location" (with clear consent) — pick the smallest valuable slice first. (Slice shipped: profile-area default + one-tap broaden; true geo-radius split to `CX-20260701-discover-geo-radius-and-use-my-location`.)
- [x] Only approximate areas are shown; no precise member or venue location is exposed before an accepted join; geolocation is consented and never stored beyond need. (No street/venue leak observed; no device geolocation added.)
- [x] Clear empty state when nothing is nearby, with a way to broaden the radius/area. (Near-me-aware empty offers "Search everywhere" + "Host the first one".)
- [x] Accessibility (labels, focus, 44px), on-brand, responsive, no overflow; matching rule covered by a test.
- [x] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback; status `ready`.
- 2026-07-01 - Experience Build Agent took ownership; status `in-progress`. Slice: default discovery to the member's profile area ("Events near <area>") with a one-tap "Search everywhere" broaden; splitting true geo-radius / "use my location" to a follow-up because the member location model is a single free-text string with no coordinates (a radius needs geocoding + schema).
- 2026-07-01 - Experience & Design Explorer independently retested from the owner's member scenario (logged in ONCE as pooled seeker-B, Bucharest; real Chromium, reducedMotion:reduce; no diff read first). 23/23 member-checkable checks pass at 1280 + 375: `/discover` defaults to "Showing events near **Bucharest**, your profile area." with 31 local events (all Bucharest), "Near Bucharest" city placeholder + leave-blank title; "Search everywhere" (`/discover?near=all`) broadens to 32 incl. a Cluj event and shows "Back to near Bucharest"; explicit `city=Cluj-Napoca` overrides (no near-me note, feed filtered to Cluj only — 0 matching here, near-me framing correctly dropped); near-me-aware empty state ("Nothing's open near Bucharest just yet") offers Search-everywhere + Host-the-first-one; only approximate area+city shown (no street/venue leak); broaden link 44px with 3px focus outline, on-brand `--lime`/`--ink`; no overflow either width; improved card scan hierarchy intact (time/day 22px ≥ title 17px ≥ area 13px, sport 20px). → `verified`. Geo-radius follow-up (`CX-20260701-discover-geo-radius-and-use-my-location`) remains open as intended.
- 2026-07-01 - Experience Build Agent implemented; status `implemented` (commit 07fa878). Added pure `resolveDiscoveryArea` (member profile area default, explicit-city override, `near=all` broaden), wired into `/discover` page + discover API (shared rule, no drift), "Showing events near <area>" note + "Search everywhere" broaden link (44px, visible focus, on-brand `--lime`), near-me-aware empty state, and `resolveDiscoveryArea` unit tests. Privacy: uses only the member's own approximate area vs the event's approximate public city; no device geolocation, no precise location, nothing new stored. Geo-radius + opt-in "use my location" split to `CX-20260701-discover-geo-radius-and-use-my-location` (member has no coordinates; needs geocoder + schema). Checks (--workspace @sport-date/web): typecheck pass, lint pass (only pre-existing untracked qa/full-flows.mjs warning), test 185 passed. Verified logged in as the Bucharest pool account: /discover defaults to "near Bucharest" (31 local events), broaden opens Bucharest + Cluj, explicit city overrides. Ready for independent retest.
