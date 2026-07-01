# CX-20260630-event-detail-approximate-location-no-spatial-cue

- Status: `ready`
- Severity: `low`
- Priority: `P2 medium` — Reach 5 (every member evaluating any event before requesting sees this "Before acceptance" location panel) × Impact 3 (the trust-check + travel decision rests entirely on a place *name* the member may not know; a visible-but-approximate spatial cue is exactly what the vision and design signature call for, and what comparable event/movement apps provide; without it a cautious member can't judge distance or feasibility and the "deliberately approximate" claim is told, not shown) × Confidence 4 (directly observed; the panel is text-only with no map/zone; this is a design improvement with one strong privacy constraint to respect) / Effort 4 (introduce an approximate-area visual — a static blurred/circled neighborhood zone — that NEVER plots or implies the exact venue, plus tiles/asset cost; must be progressive-enhancement and accessible). Math: (5×3×4)/4 = 15 → P2. Not a safety regression (the existing text disclosure already honors the precise-location guardrail); this raises the trust + spatial experience. Components: `apps/web/src/app/discover/events/[eventId]/page.tsx` (the "Before acceptance" `<article>`), `apps/web/src/app/globals.css` (`.event-detail-grid`), event data (`areaLabel`, `city` — must remain coarse; do NOT add precise coordinates to this pre-acceptance surface).

- Customer journey: Trust check + commitment decision — a member reading an event detail page decides whether the meeting is close/feasible enough and trustworthy enough to request a place, before the exact venue is revealed.
- Surface: `both`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), Chromium headless, observed at 1280 and 390px. Observed 2026-06-30.
- Found by: Experience & Design Explorer (event detail / join × trust & safety surface)
- Related tickets: `CX-20260630-event-detail-safety-emergency-microcopy-smallest-text.md` (same surface/pass, different element — that one is safety-text legibility, this is the location panel; independently fixable)

## Customer outcome

As a cautious adult member deciding whether to commit to meeting strangers for a sport, I want a *visible* sense of the approximate area — clearly an area, not a pin — so that I can judge whether it's close enough and feels safe to travel to, and so I can trust that the location really is deliberately approximate rather than just being told so.

## What I observed

The "Before acceptance" panel shows: the label "BEFORE ACCEPTANCE", a heading "{areaLabel}, {city}" (e.g. "Tineretului, Bucharest"), and the line "This is deliberately approximate. The exact venue is not included in this page or its data."

This is honest and the privacy posture is correct — but it is **entirely textual**. There is no spatial cue at all:

- A member who doesn't know the named neighborhood has no idea where it is in the city, how far it is from them, or how to gauge travel.
- The approximation is *claimed* but not *shown*; the heading "Tineretului, Bucharest" can read almost like a precise place, with only the body sentence clarifying that it's coarse.
- The company vision explicitly lists "Show a spatial map of approximate location" and the design signature says "Make approximate location visibly approximate" and prefers "spatial maps of approximate location" / "tactile event objects" over text. Best-in-class event invitations (Partiful/Luma) and movement apps (Komoot/Strava) communicate an approximate area visually — a blurred or circled zone — precisely to build trust without exposing a point.

Observed at both 1280 and 390px: the panel is two short paragraphs of text inside a white card; no map, no zone, no distance, no spatial affordance.

## What I expected

A restrained, progressive-enhancement **approximate-area visual**: a static map or stylized neighborhood zone that shows a *region* (e.g. a soft circle/blur over the area) with the place name, making "deliberately approximate" something the member can *see*. It must:

- never plot, center on, or allow inference of the exact venue (the existing guardrail — exact venue stays out of this page and its data);
- degrade gracefully (a member on a slow connection or with images off still sees the existing honest text);
- be accessible (meaningful alt text / text equivalent; not required to complete the journey);
- be cheap enough to justify (a lightweight static tile or even a pure-CSS stylized zone, not a heavy interactive WebGL map for a pre-acceptance screen).

A distance-from-me hint ("about X km from your area") could complement it *only* if it can be computed from coarse data without exposing either party's precise location.

## Reproduction

1. Sign up as a new adult, set a language, open any event from `/discover`.
2. On the event detail page, read the "Before acceptance" panel.
3. Note it is text-only: a neighborhood name + a sentence saying it's approximate, with no visual/spatial representation of the area or distance.

Reproduction rate: `1/1` (every discoverable event renders the same text-only panel).

## Customer impact

Trust + decision support (and a spatial-design opportunity). A cautious member can't easily judge feasibility or distance, and the safety-positive "approximate" message lands as an assertion rather than something they can verify by looking. This is a missing experience, not a defect — the current text is honest and safe — so severity is low, but the reach is universal and it sits on the core trust-check moment, so priority is P2.

- Authorization / privacy / precise-location: **must be preserved** — any visual must remain genuinely approximate and must not embed or hint at the exact venue. This is the controlling constraint, not a blocker to the idea.
- Accessibility: the visual must have a text equivalent and never be required to complete the journey.
- Safety: net-positive when done right (shows the approximation); net-negative if implemented carelessly (must not narrow the area enough to identify the venue).

## Evidence and limits

- Evidence: event detail screenshots at 1280 (`scratchpad/retest-shots/event-detail-join.png`) and 390 (`scratchpad/retest-shots/safety-expanded-390.png`), gitignored; show the text-only "Before acceptance" panel. Page-source confirms the panel renders only `areaLabel`, `city`, and the approximate-disclosure sentence; no precise coordinates are present on this surface.
- Redactions made: only a synthetic event's coarse area name shown; no exact venue/address (correctly absent from the page).
- Facts:
  - The pre-acceptance location panel is text-only (neighborhood name + approximate-disclosure sentence); no spatial/visual element.
  - The exact venue is correctly excluded from this page and its data.
  - The vision/design-system call for a visible approximate-location map; it is not implemented here.
- Hypotheses to verify during implementation:
  - A static approximate-zone visual can be derived from coarse `areaLabel`/`city` alone (no precise lat/long) and still be useful — or whether a privacy-safe area centroid with a deliberately large radius is needed. Confirm the chosen approach cannot be reverse-engineered to the venue.
  - Whether to ship a map tile vs a stylized CSS zone first (perf/asset/battery cost on mobile, per the spatial-lens guidance).
- Paths or surfaces not tested: did not test the accepted-state location panel (which correctly reveals the precise venue only after acceptance — out of scope here); did not measure tile/perf budget.

## Duplicate check

- Search terms used: "approximate", "location", "map", "spatial", "Before acceptance", "Tineretului", "event detail" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-event-detail-safety-emergency-microcopy-smallest-text.md` (same page, safety text — different element), `CX-20260630-research-bucharest-hero-visual-overflows-container.md` (research page visual, unrelated).
- Why this is new: no existing ticket covers the approximate-location panel or a spatial cue for it.

## Acceptance criteria

- [ ] The "Before acceptance" location panel communicates the approximate area *visually* (a static map zone or stylized neighborhood area), clearly representing a region rather than a point, alongside the existing honest text.
- [ ] The exact venue is never plotted, centered, embedded, or inferable from the visual or its underlying data on this pre-acceptance surface (verified: no precise coordinates reach the page before acceptance).
- [ ] The visual degrades gracefully — with images off / slow connection, the member still sees the existing clear approximate-location text — and is never required to request a place.
- [ ] The visual has an accessible text equivalent (alt/aria) and works at 390px and desktop without overflow.
- [ ] If a distance hint is added, it is derived from coarse data only and exposes neither party's precise location.
- [ ] Relevant repository checks pass (`npm run typecheck`, lint, `npm test`).

## Handoff and retest log

- `2026-06-30` - Filed by Experience & Design Explorer (event detail / join × trust & safety surface); status `ready`. Observed the pre-acceptance location panel is text-only; the vision/design-system call for a visible approximate-location map. Missing-experience finding with a hard precise-location guardrail; P2.
