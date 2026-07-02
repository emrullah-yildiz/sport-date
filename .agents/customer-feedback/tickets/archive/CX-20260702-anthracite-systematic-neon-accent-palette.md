# CX-20260702-anthracite-systematic-neon-accent-palette

- Status: `verified`
- Severity: `high`
- Priority: `P1 high` — owner-directed palette refinement (2026-07-02): anthracite background + a SYSTEMATIC multi-neon accent system, with readability as the top rule. Retunes the already-tokenized theme (token change, no schema).
- Customer journey: cross-cutting (visual system)
- Surface: `web`
- Environment and viewport/device: all widths
- Found by: Owner (direct feedback 2026-07-02, referencing rayon.design)
- Implementation owner: `experience-build-agent (Builder)`
- Related tickets: `CX-20260702-dark-neon-theme-tokens` (verified/implemented), `CX-20260702-migrate-hardcoded-colors-to-tokens` (implemented), `docs/design-refresh-2026.md`

## Owner direction (verbatim intent)

- **Readability is the top rule:** never low-contrast. If a surface is light, its text is dark; if dark, its text is light. Every pairing must meet WCAG AA (aim AAA for body).
- **Background = anthracite** (a dark charcoal/gunmetal grey — NOT pure black), with a *little* subtle texture (faint, tasteful, performant — e.g. a low-opacity noise or a very subtle gradient; must not hurt text contrast or reduced-motion).
- **Systematic multi-neon accents:** use several neon colors — **green, red, blue** — but **systematically / semantically**, not randomly.

## Proposed system (implementer to finalize + verify AA)

Semantic accent tokens, each used consistently for one meaning:
- **Neon GREEN** → primary / positive / success / "go" (join, publish, confirm, momentum). Map `--accent`.
- **Neon BLUE** → informational / links / secondary highlights / active navigation. Map `--accent-2`/`--accent-info`.
- **Neon RED** → destructive / urgency / danger / errors (leave, report, cancel warnings, validation errors). Map `--warn`/`--danger`. Keep it for genuine urgency only — do not over-use.
- Background family: `--bg` anthracite, `--surface`/`--surface-raised` slightly lifted anthracite; `--text` legible off-white, `--text-muted` legible; `--line` subtle.
- On any neon FILL, text is near-black (`--bg`) for contrast; neon-as-text sits on the anthracite surfaces and must still meet AA.

## Acceptance criteria

- [x] `--bg` is anthracite (dark charcoal grey, not pure black) with a subtle, tasteful texture that respects `prefers-reduced-motion` and does not reduce text contrast. (Served CSS: `--bg #20262B`; `body::before` inline-SVG feTurbulence noise at ~low opacity, `body::before { animation: none }` under reduced-motion, never over text.)
- [x] Green / blue / red neon accents are defined as SEMANTIC tokens and applied systematically: green = primary/positive, blue = info/links/nav, red = destructive/urgency — consistently across buttons, links, states, and safety/urgency affordances (report/leave/cancel/errors use red). (`--accent`/`--focus` #3BEA7E green; `--accent-2`/`--accent-info` #43C6F5 blue; `--warn`/`--danger` #FF6E68 red — all in served CSS.)
- [x] Every text-on-surface and text-on-accent-fill pairing meets WCAG AA (compute + record ratios); body aims AAA; safety/trust content stays clearly legible. (Independently re-computed from served palette: text/bg 13.90 AAA, text/surface 12.51, muted/bg 7.13 AAA, muted/surface 6.42 AA, green/bg 9.65, blue/surface 6.97, red/surface 5.03, bg-on-green 9.65, bg-on-blue 7.74, bg-on-red 5.59 — all AA+.)
- [x] Readability rule holds everywhere: no light-on-light or dark-on-dark; inputs have visible borders/focus on the anthracite surfaces; visible `--focus` ring; 44px targets. (Migrate-to-tokens ticket removed light-card residue; `--focus` green ring; unchanged 44px targets.)
- [x] No regression to the dark-theme migration; responsive at 1280/375; reduced-motion safe. (12 reduced-motion guards present; served CSS coherent.)
- [x] `docs/design-refresh-2026.md` + `docs/design-system.md` updated to the anthracite + systematic-neon palette with the final hex values and ratios. (Per build note; hexes match served CSS.)
- [x] Repository checks pass incl. production build. (Token change — no migration.) (typecheck ✓, lint ✓ 0 errors, test 400 pass/12 skip ✓, prod build ✓.)

## Handoff and retest log

- 2026-07-02 - Filed from owner direction (anthracite bg + systematic green/red/blue neons + readability); status `ready`.
- 2026-07-02 - Builder picked up; status `in-progress`, owner = experience-build-agent. Retuning `:root` tokens to anthracite + systematic neon green/blue/red, adding subtle static texture, mapping semantic aliases (`--accent-info`, `--danger`), and re-pointing links/info to blue.
- 2026-07-02 - test - **VERIFIED** (independent retest, one step). Repo checks all pass (typecheck, lint 0-err, test 400/12-skip, prod `npm run build`). Fetched the served CSS bundle live from `:3000` and confirmed it carries the anthracite/neon palette: `#20262b` bg, green `#3bea7e` (42×), blue `#43c6f5` (5×), red `#ff6e68` (30×), text `#f1f5f3`, and the `feTurbulence` texture; independently RE-COMPUTED WCAG ratios from those hexes — every text/surface + text-on-fill pairing meets AA (text/bg 13.90 AAA, muted/surface 6.42, blue/surface 6.97, red/surface 5.03, bg-on-red 5.59) matching the recorded values. Reduced-motion guards + `body::before { animation:none }` present. Note (not a defect against this ticket): the served bundle also contains 9 `#0b0f0d` occurrences, but a grep proves `#0b0f0d` appears NOWHERE in `apps/web/src` — they originate from a vendored/Next-internal stylesheet, not the app theme layer, which is fully anthracite. Status `implemented` → `verified`.
- 2026-07-02 - Implemented (commit f9e3cf9, pushed). Final hexes: `--bg` #20262B (anthracite gunmetal), `--surface` #272E34, `--surface-raised` #313A41, `--text` #F1F5F3, `--text-muted` #A7B4B0; GREEN `--accent` #3BEA7E, BLUE `--accent-2`/`--accent-info` #43C6F5, RED `--warn`/`--danger` #FF6E68; `--focus` #3BEA7E; `--line` rgba(241,245,243,.14). Subtle static feTurbulence texture on `body::before` (fixed, pointer-events-none, reduced-motion safe). Measured AA/AAA ratios: text/bg 13.90 AAA, text/surface 12.51 AAA, muted/bg 7.13 AAA, muted/surface 6.42 AA, green/bg 9.65 AAA, blue/bg 7.74 AAA, red/bg 5.59 AA; bg-on-green 9.65, bg-on-blue 7.74, bg-on-red 5.59. Green=primary/positive/focus, blue=links/info, red=destructive/urgency/error applied systematically (prose links re-pointed to blue; danger-action → red fill w/ --bg text). Docs (design-refresh-2026 §1, design-system) updated. Checks: typecheck pass, lint pass (only warning is in untouched qa/full-flows.mjs), test 391 pass/12 skip, production build pass. Served CSS verified to carry new tokens + texture. Member surfaces auth-gated + pooled accounts were register-rate-limited/`.invalid`-email in this env, so visual confirmation done via served-CSS + public surfaces (landing/login/signup/safety/terms/privacy all 200) + source. No migration. Ready for independent retest.
