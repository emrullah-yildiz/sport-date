# CX-20260702-dark-neon-theme-tokens

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 4) / Effort 3 = 26.7. This is the foundation of the owner-requested black+neon refresh: it flips the `:root` semantic tokens every token-driven surface already reads, so the whole app can move to the new theme from one place with verified AA contrast. High reach (every surface), high impact (the headline of the redesign), but not a functional/safety floor on its own — so P1, not P0. Sequenced FIRST; typography and IA tickets build on the token layer.
- Customer journey: cross-cutting (every surface — discovery, hosting, trust, coordination, reflection)
- Surface: `web` (desktop + mobile; shared CSS)
- Environment and viewport/device: dev server localhost:3000, all widths; `apps/web/src/app/globals.css` `:root` (lines ~3–34)
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md`
- Implementation owner: `unassigned`
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
