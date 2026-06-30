# CX-20260630-research-bucharest-georgia-serif-off-system-font

- Status: `ready`
- Severity: `low`
- Customer journey: Reading the Bucharest research invitation page (`/research/bucharest`).
- Surface: `web`
- Environment and viewport/device: Local dev, Chromium, all widths.
- Found by: Visual QA (programmatic font-family scan + visual)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a member who has seen the rest of Sport Date in its Space Grotesk + Inter type system, I want the research page's accent type to feel like the same brand, so a serif accent does not read as an unstyled fallback or a different site.

## What I observed

On `/research/bucharest`, two pieces of copy render in **`Georgia, serif`** (confirmed via computed `font-family` and visually):

1. The hero word "in motion?" — `.hero h1 em` (page.module.css line 46: `font-family: Georgia, serif`).
2. The large coral-section line "Movement shows how you encourage, adapt, laugh, and make room for someone else." — `.beliefTurn` (line 76: `font-family: Georgia, serif; font-style: italic`).

Everywhere else in the app, headings are Space Grotesk and body is Inter. The Georgia serif is **hardcoded on purpose** (it is an editorial accent), but it is the only place in the product that uses a serif, and Georgia is a system/OS font (no webfont), so the rendering depends on the visitor's OS and can look like a fallback rather than a chosen face. The font scan flagged it at all 5 widths.

## What I expected

Either (a) the serif accent uses a deliberately loaded brand serif (consistent across OSes), or (b) the accent is expressed within the existing Space Grotesk / Inter system (e.g. italic Inter), so the research page is unmistakably the same product and does not depend on whatever serif the OS happens to ship.

## Reproduction

1. Open `/research/bucharest`.
2. Inspect `.hero h1 em` ("in motion?") and the coral `.beliefTurn` line.
3. Computed `font-family` = `Georgia, serif` on both; visually a serif amid an otherwise sans-serif app.

Reproduction rate: `5/5 widths`

## Customer impact

Cosmetic / brand-consistency. No data, safety, or accessibility blocker (contrast is fine). The serif is intentional but off-system and OS-dependent; this ticket exists to get an explicit decision (keep + load a real brand serif, or move into the system fonts) rather than leave a silent Georgia fallback.

## Evidence and limits

- Evidence: `scratchpad/audit2/046-research-bucharest-1920.png` (coral line + hero "in motion?"); `font-findings.json` (5 entries, ff=`Georgia, serif`); source `apps/web/src/app/research/bucharest/page.module.css` lines 46 and 76.
- Redactions made: none.
- Facts: `font-family: Georgia, serif` is hardcoded; no `@font-face` brand serif is loaded; affects 2 selectors.
- Hypotheses to verify: design intends a serif accent (then load one) vs. it should match the app type system.
- Paths or surfaces not tested: none additional.

## Duplicate check

- Search terms used: font, serif, georgia, space grotesk, inter, research.
- Tickets reviewed: all CX-2026* tickets.
- Why this is new: existing font/control tickets cover selects, date inputs, and sport-card monograms — none cover the research serif accent.

## Acceptance criteria

- [ ] The research accent type is an explicit, OS-independent choice (loaded brand serif) OR is brought into the Space Grotesk / Inter system.
- [ ] No silent `Georgia, serif` system fallback remains unless deliberately chosen and documented.
- [ ] Contrast and readability remain acceptable.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- `2026-06-30 19:00 EEST` - Filed by Visual QA; status `ready`.
