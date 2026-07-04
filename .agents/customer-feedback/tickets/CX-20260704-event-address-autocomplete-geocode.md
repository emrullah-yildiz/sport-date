# CX-20260704-event-address-autocomplete-geocode

- Status: `in-progress`
- Severity: `high`
- Priority: `P1` — owner report (2026-07-04): "Get directions" is unreliable because the event address is free-text with no real geocoding. Hosts should pick the address like entering a destination in Uber: type → suggestions → select → pin.
- Customer journey: host types the meeting address → an autocomplete lists matching real places → host selects one → precise lat/lng is captured → accepted attendees get accurate one-tap directions.
- Surface: event create/edit address field + geocoding
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Builds on: `CX-20260704-feature-precise-address-and-maps` (address fields + keyless directions link already exist; this makes the address *real/geocoded*).

## Task

Add **address autocomplete + geocoding** to event location entry (Uber-style), so the
selected place yields accurate coordinates that power the private post-acceptance directions
link.

## Acceptance criteria

- As the host types the address, show a **live suggestions list** of matching real
  places/addresses; selecting one fills the structured address AND captures accurate
  **lat/lng** (no more manual/blank coords).
- **Provider:** pluggable behind an env flag/key. Prefer a **free/open, EU-appropriate
  geocoder** first — e.g. OpenStreetMap **Nominatim** or **Photon (Komoot)** (no key, but
  respect their usage policy / self-host if volume grows), with **Google Places / Mapbox**
  as an optional upgrade if the owner provisions a key (owner-gated card). Do NOT hard-require
  a paid key.
- **Privacy preserved:** the precise address/coords stay private (discovery shows only the
  approximate area; exact revealed post-acceptance) — unchanged. Autocomplete queries must
  not leak a *member's* location; they geocode the host-typed event address only.
- Graceful fallback: if the geocoder is unavailable, keep today's manual structured-address
  entry (don't block event creation).
- Debounced requests, keyboard-navigable suggestions, 44px targets, a11y, mobile-first.
- typecheck/lint/test/prod build green; tests cover the suggest→select→coords flow and the
  no-provider fallback.
- Docs updated (geocoding provider + privacy note).

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).

## Guardrails

- No vendor that requires sending a member's own precise location without consent; this
  geocodes the *event* address the host typed.
- Keep the directions link keyless where possible (already built); geocoding accuracy is the
  point, not a map embed.

## Process

- Likely no migration (coords columns exist). If needed → commit-not-push + report number.
  `git pull --rebase`. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
