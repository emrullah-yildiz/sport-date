# CX-20260702-dark-neon-theme-tokens

- Status: `verified`
- Severity: `medium`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 4) / Effort 3 = 26.7. This is the foundation of the owner-requested black+neon refresh: it flips the `:root` semantic tokens every token-driven surface already reads, so the whole app can move to the new theme from one place with verified AA contrast. High reach (every surface), high impact (the headline of the redesign), but not a functional/safety floor on its own — so P1, not P0. Sequenced FIRST; typography and IA tickets build on the token layer.
- Customer journey: cross-cutting (every surface — discovery, hosting, trust, coordination, reflection)
- Surface: `web` (desktop + mobile; shared CSS)
- Environment and viewport/device: dev server localhost:3000, all widths; `apps/web/src/app/globals.css` `:root` (lines ~3–34)
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md`
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260702-typography-right-size-and-scale` (P1, builds on this token layer), `CX-20260702-ia-consolidate-guideline-and-legal-pages`, `CX-20260702-navigation-simplify-primary`, `CX-20260702-ethical-gamified-energy-pass`

## Customer outcome

As a member opening Sport Date, I want a modern, energetic black-and-neon interface that still reads clearly and calmly, so that the product feels alive and current without ever becoming hard to read or casino-like.

## What I observed

The app currently uses the warm Cream/Ink/Lime palette (`--cream #f4f0e7`, `--ink #17241d`, `--lime #c9f458`, `--coral #ff765f`, `--muted #667169`) set at `:root` in `globals.css`. The owner wants a black + neon direction. Many surfaces already consume these tokens, so re-pointing the tokens moves those surfaces automatically; a residue of surfaces hard-code literals (`#fff`, `#17241d`, `#f4f0e7`, `#bdc8c1`, `#eff8da`, `#ffe2d6`, `#e7f9b9`, …) that will NOT flip from a token change and must be tracked as follow-ups.

## What I expected

A single, semantic, black+neon token set at `:root` with **measured WCAG AA contrast**, so token-driven surfaces recolor from one place and future changes propagate consistently.

## Reproduction

1. Open any surface (e.g. `/discover`, `/profile`).
2. Note the warm Cream background / Ink text.
3. Expected after this ticket: near-black background, off-white text, neon lime/teal accents, coral kept for warnings only — all meeting AA.

Reproduction rate: `confirmed via source 2026-07-02 (tokens defined at globals.css :root)`

## Customer impact

Practical/emotional: the theme is the most visible part of the redesign. Done right it feels modern and energetic; done wrong (neon-on-black without contrast discipline) it becomes an accessibility failure. This ticket's job is to make the flip **and** guarantee the contrast floor. Accessibility IS involved: neon-on-black must meet AA — that is the acceptance bar.

## Evidence and limits

- Evidence: `apps/web/src/app/globals.css` `:root` (lines ~3–34). Palette + measured ratios in `docs/design-refresh-2026.md` §1.
- Redactions made: none needed.
- Facts: measured ratios (WCAG relative luminance, sRGB): text `#F4F7F2` on bg `#0B0F0D` = 17.86 (AAA); text on surface `#121815` = 16.65; text on raised `#1B2420` = 14.72; muted `#9DB0A6` on bg = 8.45 / on surface = 7.88 (AAA); accent lime `#B6FF3C` on bg = 15.95 / on surface = 14.87; accent-2 teal `#31E0C8` on bg = 11.60 / on surface = 10.82; warn coral `#FF6B4A` on bg = 6.85 / on surface = 6.39 (AA); near-black `--bg` text on lime fill = 15.95, on teal fill = 11.60, on coral fill = 6.85 (AA).
- Hypotheses to verify during implementation: which surfaces still hard-code literals (grep `#fff`, `#17241d`, `#f4f0e7`, `#bdc8c1`, `#eff8da`, `#ffe2d6`, `#e7f9b9`) — enumerate as follow-up child tickets; whether any input/select focus ring rules reference the old lime rgba and need re-pointing.
- Paths or surfaces not tested: per-surface hardcoded-literal sweep is explicitly OUT of scope here (follow-ups).

## Duplicate check

- Search terms used: "--bg", "black neon", "dark theme", ":root", "--accent", "contrast".
- Tickets reviewed: full queue; no existing dark-theme/token ticket.
- Why this is new: first ticket establishing the black+neon token layer per `docs/design-refresh-2026.md`.

## Acceptance criteria

- [ ] `:root` in `globals.css` defines the semantic tokens with these exact values: `--bg #0B0F0D`, `--surface #121815`, `--surface-raised #1B2420`, `--text #F4F7F2`, `--text-muted #9DB0A6`, `--accent #B6FF3C`, `--accent-2 #31E0C8`, `--warn #FF6B4A`, `--focus #B6FF3C`, `--line rgba(244,247,242,.12)`.
- [ ] `body` background/text resolve to `--bg`/`--text`; token-driven surfaces render on the dark theme without per-surface edits.
- [ ] Every text/UI color pairing on the new theme meets **WCAG AA** (≥4.5 normal, ≥3 large). A member can verify by inspecting the measured ratios in `docs/design-refresh-2026.md` §1; re-measure if any token value differs from those.
- [ ] Neon fills (primary/positive buttons, active chips) use near-black `--bg` text, never off-white.
- [ ] Coral `--warn` is used only for warning/urgency, not decoration.
- [ ] Visible focus is preserved everywhere: `--focus` lime ring, ≥3px, with offset, on every interactive element; focus is never removed without a visible replacement.
- [ ] 44px minimum touch targets are unchanged.
- [ ] `prefers-reduced-motion` behavior is unchanged.
- [ ] Surfaces that hard-code literal colors (and therefore do NOT flip) are enumerated as named follow-up tickets; this ticket does not attempt to sweep them all.
- [ ] No precise location or other sensitive data is exposed (styling-only change).
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by Design Lead (black+neon refresh). Direction + measured ratios in `docs/design-refresh-2026.md`. Sequenced first in the refresh cluster. Status `ready`.
- 2026-07-02 - experience-build-agent took ownership; Status `ready` → `in-progress`. Flipping `:root` semantic tokens to the black+neon palette at the token layer.
- 2026-07-02 - test - **VERIFIED** (independent retest). The token LAYER this ticket established is in place and doing its job: `:root` in `globals.css` defines the semantic set (`--bg`, `--surface`, `--surface-raised`, `--text`, `--text-muted`, `--accent`, `--accent-2`/`--accent-info`, `--warn`/`--danger`, `--focus`, `--line`), legacy names are re-pointed (`--cream`→`--surface`, `--ink`→`--text`, `--muted`→`--text-muted`, `--lime`→`--accent`, `--coral`→`--warn`), `body` resolves to `--bg`/`--text`, neon fills carry near-black `--bg` text, `--focus` ring preserved, and the hardcoded-literal follow-up (`CX-20260702-migrate-hardcoded-colors-to-tokens`) was filed as required. NOTE — exact-hex criterion intentionally superseded: this ticket's `#0B0F0D`/`#B6FF3C` values were deliberately retuned by the LATER owner-directed ticket `CX-20260702-anthracite-systematic-neon-accent-palette` (now `verified`/archived) to anthracite `--bg #20262B`, green `--accent #3BEA7E`, blue `--accent-2 #43C6F5`, red `--warn #FF6E68`. This ticket's own AC explicitly says "re-measure if any token value differs from those", and the real acceptance bar — semantic tokens at `:root`, WCAG AA on every pairing (independently re-measured in the anthracite ticket: text/bg 13.90 AAA … red/surface 5.03 AA, bg-on-neon fills AA+), neon fills near-black text, coral=warn-only, visible focus, 44px, reduced-motion, follow-ups enumerated — all still hold. Repo checks pass (typecheck/lint/test 442 pass/build). AC met (exact-hex bullet fulfilled-then-superseded per the ticket's own re-measure clause). Status `implemented` → `verified`.
- 2026-07-02 - Implemented at the token layer in `apps/web/src/app/globals.css` (commit `b4ff31a`, pushed to origin/main). Added the 10 design-refresh-2026 semantic tokens with exact documented values; re-pointed legacy names (`--cream`→`--bg`, `--ink`→`--text`, `--ink-soft`/`--muted`→`--text-muted`, `--lime`→`--accent`, `--coral`→`--warn`, dark `--line`); `body` resolves to `--bg`/`--text`; shared button primitives use neon fills with near-black `--bg` text and a `--focus` lime ring. Contrast re-measured (WCAG sRGB): text/bg 17.86, text/surface 16.65, text/raised 14.72, muted/bg 8.45, muted/surface 7.88, accent/bg 15.95, accent/surface 14.87, accent-2/bg 11.60, accent-2/surface 10.82, warn/bg 6.85 (AA), warn/surface 6.39 (AA), --bg-on-accent 15.95, --bg-on-accent-2 11.60, --bg-on-warn 6.85 (AA) — all match the doc, every pairing AA (most AAA). Checks: typecheck pass, lint 0 errors, test 391 passed/12 skipped, production build pass. Verified via pooled login (host-A): compiled CSS serves the new tokens; discover/profile/hosting/safety/landing/login all 200. No migration. Follow-up filed for hardcoded-literal surfaces that do NOT flip: `CX-20260702-migrate-hardcoded-colors-to-tokens`. Status `in-progress` → `implemented` (Explorer retests independently).
