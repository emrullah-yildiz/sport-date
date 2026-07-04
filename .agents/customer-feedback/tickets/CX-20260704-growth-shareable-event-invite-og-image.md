# CX-20260704-growth-shareable-event-invite-og-image

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — turns every published event into an organic growth surface; directly compounds the now-live social engine (see `docs/marketing/`). High reach × medium effort × high confidence.
- Customer journey: host publishes an event → shares a public invite link → friends/social see a rich preview → tap through to request a place (top-of-funnel growth + liquidity).
- Surface: event detail / public invite route + Open Graph image generation
- Environment and viewport/device: web, all
- Found by: Acting CEO (growth review, 2026-07-04) — the buildable loop backlog is drained and the social funnel needs an in-app landing target.
- Implementation owner: `agent`

## Task

Give every published event a **shareable public invite link** with a **rich, on-brand Open Graph / Twitter-card image** so it previews well when pasted into Instagram bio links, WhatsApp, X, etc. The link points to a public, privacy-safe event view with a clear "request a place / join the beta" CTA.

## Acceptance criteria

- A published event exposes a public share URL (e.g. `/e/[id]` or a slug) that renders without auth.
- The public view shows only **discovery-safe** fields: sport, level, intention, approximate area (NEVER the exact meeting point or host address — reuse the existing approximate-location privacy), date/time, price if any, spots left. Matches the "we hide the exact point" guarantee.
- Dynamic OG image (1200×630) generated on-brand (anthracite `#20262B` / neon `#3BEA7E` / `F1F5F3`), reusing the `sharp` pipeline already in the repo or Next OG. Includes sport + area + time + KeepItUp mark.
- `<meta>` OG + Twitter tags populated per event; validates in a card debugger.
- Unpublished/cancelled events return a safe 404/placeholder (no data leak).
- CTA routes to the existing beta/opt-in flow; no new data collection beyond what exists.

## Guardrails

- Anti-dark-pattern: no fake scarcity ("only 1 spot!" unless literally true), no manipulative urgency.
- Privacy by design: exact location/PII must never appear in the public view, OG image, or meta tags.
- Only surface implemented fields; don't invent social proof / attendee names.

## Why (CEO note)

We just turned on organic social. This is the in-app catch-basin: it makes shared events spread on their own and gives the social traffic somewhere real to land. Liquidity (Phase 2) is the gate to revenue (Phase 3), and this is the cheapest liquidity lever we own.
