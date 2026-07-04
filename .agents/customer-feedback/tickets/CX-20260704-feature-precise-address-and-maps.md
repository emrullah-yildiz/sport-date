# CX-20260704-feature-precise-address-and-maps

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — owner-requested (2026-07-04). Precise, mandatory meeting location + one-tap directions removes the biggest real-world friction: actually finding the spot.
- Customer journey: host creates an event → must give a precise address (mandatory, structured) → it stays PRIVATE in discovery → once accepted, the attendee sees the exact address + a "Get directions" Google Maps link.
- Surface: event create form + accepted-view event detail
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`
- Builds on: existing event location fields (venueName, private address, city, lat/lng — see `event-create-recovery`).

## Task

Make the meeting location **precise and mandatory**, and give accepted attendees **one-tap Google Maps directions** — without breaking the "exact location hidden until accepted" guarantee.

## Acceptance criteria

- Event create requires a **structured precise address** (venue name + street/number + city + postal code as MANDATORY fields; validate non-empty). Keep capturing lat/lng (from the address; if a geocoder isn't provisioned, accept manual coords / a map-pin fallback and note it).
- The precise address + coordinates remain **private in discovery** (only approximate area shows pre-acceptance — unchanged). They unlock ONLY to accepted attendees + host.
- Accepted view shows the full address **and** a **"Get directions" link** to Google Maps using a keyless URL: `https://www.google.com/maps/dir/?api=1&destination=<lat>,<lng>` (or `?query=<url-encoded address>` if no coords). Opens the native maps app on mobile. Optionally a static, non-interactive map preview ONLY if a Maps key is later provisioned (owner-gated) — do not hard-require an API key.
- Add **"Dancing"** to the activity list if not already covered (note: "Dance" already exists — rename/label to "Dancing" or leave, your call, but ensure dancing is clearly selectable).
- **Capacity excludes the host (owner directive 2026-07-04):** the current behavior already treats "capacity" as joiner spots only (the host doesn't consume a place), but the label **"Total places"** is ambiguous and reads as if the host is included. Make it explicit on the **create** form (`CreateEventForm`), the **edit** form (`HostEditEventForm`), and the event detail display: relabel / add a hint so the host clearly understands the number is **the people they're looking for, NOT counting themselves** (e.g. label "Places for others" or a hint "You're already in as host — this is how many others can join"). Keep the underlying behavior unchanged; update any test that asserts the old "Total places" wording (e.g. `event-create-recovery`, `discovery-card`) so the label/hint stays consistent everywhere ("places left" for joiners is already correct).
- Mobile-first, 44px targets, a11y; typecheck/lint/test/prod build green; tests cover: mandatory-address validation, private-until-accepted (address/coords absent from the public/discovery payload), and the directions-link builder.
- Docs updated.

## Guardrails

- Privacy-by-design is non-negotiable: exact address/coords must NEVER appear in discovery, the public `/e/{id}` invite, OG images, or notifications — only post-acceptance.
- No third-party map embed that leaks the member's location to a vendor pre-acceptance; the keyless directions link is opened by the user's own action, post-acceptance.

## Process

- Likely no migration (fields may exist); if you add columns, additive migration → commit-not-push + report the number. `git pull --rebase` first. Full DoD. Don't touch `apps/web/public/*.html` or `docs/marketing/**`.
