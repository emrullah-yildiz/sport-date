# CX-20260630-research-bucharest-hero-visual-overflows-container

- Status: `verified`
- Severity: `low`
- Priority: `P3 polish` — (Reach 2 × Impact 2 × Confidence 5) / Effort 3 = ~7 → P3. Cosmetic per-element decorative overflow on the `noindex`, non-launch-critical Bucharest research microsite; the page shell's `overflow-x: clip` already prevents any page-level horizontal scroll, so no member ever sees a scrollbar. No data/safety/a11y/authorization dimension. Held at P3.
- Customer journey: Reading the Bucharest research invitation page (`/research/bucharest`).
- Surface: `web`
- Environment and viewport/device: Local dev (same code as prod), Chromium, widths 1920 / 1440 / 1024 / 768 / 390.
- Found by: Visual QA (per-element overflow scan)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a cautious adult reading the research microsite, I want the hero illustration and its floating event cards to sit cleanly inside their column so the page looks deliberate and finished rather than slightly spilling at the edges.

## What I observed

On `/research/bucharest`, the per-element overflow scan reports that the hero region's content is wider than its box at **every** tested width:

- `section.hero` — scrollWidth exceeds clientWidth by ~+28px (1920/1440), +23px (1024), +34px (768), +5px (390).
- `div.heroVisual` (the lime radar circle) — +27px (1920/1440), +23px (1024), +34px (768), +5px (390).
- `div.route` (the dashed route ring) — +13–21px.

The two floating cards (`Tue · 19:00` run/walk, `Sat · 11:00` padel) and the dashed route line use negative offsets (`.runCard { left: -5% }`, `.padelCard { right: -4% }`, `.route::before { left: -4%; right: -4% }`) so they intentionally bleed past the circle. At 768 the run card and route ring visibly touch / cross the left viewport edge.

Important: this does **not** produce a page-level horizontal scrollbar — the page shell sets `overflow-x: clip` (globals/module line ~9), so the spill is clipped rather than scrollable. Reproduced 5/5 widths.

## What I expected

Decorative elements should either stay within the hero column or be intentionally and symmetrically bled with no per-element overflow reported, so the layout reads as controlled. At minimum the left-edge bleed at 768 should not look like the card is escaping the screen.

## Reproduction

1. Open `/research/bucharest` at 1920, then 768.
2. Inspect `section[class*=hero]`, `div[class*=heroVisual]`, `div[class*=route]`.
3. Observe `scrollWidth > clientWidth` on each; at 768 see the run card / route ring meeting the left edge.

Reproduction rate: `5/5 widths`

## Customer impact

Cosmetic only. No data, privacy, safety, or authorization concern; no page horizontal scroll. The page still reads, but the spilling decoration slightly undercuts the "deliberate, calm" tone the research page is going for.

## Evidence and limits

- Evidence: `scratchpad/audit2/046-research-bucharest-1920.png`, `049-research-bucharest-768.png`, `050-research-bucharest-390.png`; `overflow-findings.json` (filter page=research-bucharest, x=1).
- Redactions made: none needed (synthetic content).
- Facts: per-element scrollWidth > clientWidth on `.hero`, `.heroVisual`, `.route` at all 5 widths; page-level horizontal scroll = none.
- Hypotheses to verify during implementation: the negative-percentage offsets on `.runCard` / `.padelCard` / `.route::before` are the source; constraining or symmetrizing them removes the per-element overflow.
- Paths or surfaces not tested: print stylesheet.

## Duplicate check

- Search terms used: research, bucharest, overflow, hero, heroVisual.
- Tickets reviewed: all CX-2026* in tickets/.
- Why this is new: no existing ticket covers research-bucharest layout overflow.

## Acceptance criteria

- [ ] Hero, hero visual, and route elements no longer report `scrollWidth > clientWidth` at 1920/1440/1024/768/390 (or the bleed is intentional and symmetric with no single edge escaping at 768/390).
- [ ] No page-level horizontal scroll is introduced.
- [ ] The decorative cards remain visually anchored to the radar circle.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- `2026-06-30 19:00 EEST` - Filed by Visual QA; status `ready`.
- `2026-07-02` - Implemented (Builder), commit `4bb9dbd`. Cause: the hero's decorative elements bled past `.heroVisual`/`.hero` — the two mini event cards used negative offsets (`.runCard { left: -5% }`, `.padelCard { right: -4% }`), the dashed route line extended `left:-4%; right:-4%` and then `.route { transform: rotate(-18deg) }` swept its ends further out, and at narrow widths the cards' `rotate(±5deg)` poked ~5px past the circle even after zeroing offsets. Fix: `.heroVisual { overflow: hidden }` to clip the decorative frame; anchored both cards just inside the circle (`left/right: 2%`, and `3%` at the 560px breakpoint so the rotated corner stays in); pulled `.route::before` to `left:0; right:0`; trimmed the card box-shadow spread (`0 18px 40px`) and card width (`min(270px,60%)`) so nothing is visibly cut. Cards remain anchored to the radar circle; visual intent unchanged. Verified with Playwright against the production build: `document.documentElement.scrollWidth === clientWidth` (no page horizontal scroll) AND `.hero`/`.heroVisual`/`.route` each `scrollWidth === clientWidth` (0px overflow) at 375, 768, 1280 (also confirmed 390/1024/1440/1920) — previously +5..+34px. Tests: none added — layout containment has no unit seam (CSS-module only); relied on the production build + the runtime width checks. Checks (apps/web): typecheck pass, lint 0 errors, test 699 pass / 12 skipped incl ethical-guardrails green, production build pass (`/research/bucharest` static). No migration. Pushed origin/main. Ready for independent retest.
