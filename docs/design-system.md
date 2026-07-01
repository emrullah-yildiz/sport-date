# Design system

Sport Date should feel energetic, warm, and trustworthy rather than like a casino-style swipe interface.

## Foundation

- Ink `#17241d`: primary text and trust surfaces.
- Cream `#f4f0e7`: primary background.
- Lime `#c9f458`: positive actions and active selections.
- Coral `#ff765f`: urgency and warnings, used sparingly.
- Sage `#667169`: secondary text.

Typography uses bold, compact headlines and highly readable body text. Interactive controls must retain visible focus states, descriptive labels, reduced-motion support, and touch targets of at least 44 pixels.

Product copy must describe only implemented capabilities. Do not claim identity verification, ratings, moderation coverage, member counts, or safety guarantees before they exist.

## 2026-07-02 — Adopted direction: black + neon refresh

The default theme is moving from the warm Cream/Ink palette to an energetic **black + neon**
system. See `docs/design-refresh-2026.md` for the full direction, measured AA contrast ratios,
type scale, and information-architecture plan. That document is the source of truth for the
refresh; this file keeps the safety/honesty rules below, which still govern everything.

**Semantic tokens (applied at `:root` in `apps/web/src/app/globals.css`):**

- `--bg` `#0B0F0D` — near-black app background.
- `--surface` `#121815` / `--surface-raised` `#1B2420` — elevated panels.
- `--text` `#F4F7F2` (AAA on all surfaces) / `--text-muted` `#9DB0A6` (AAA on bg/surface).
- `--accent` `#B6FF3C` — neon lime, primary/positive/active.
- `--accent-2` `#31E0C8` — neon teal, secondary/info/momentum.
- `--warn` `#FF6B4A` — coral, warning and urgency ONLY (kept from the current system).
- `--focus` `#B6FF3C` — always-visible focus ring.

All pairings are measured to meet **WCAG AA** (most AAA); neon fills carry near-black `--bg`
text, never off-white. Re-measure any token whose value changes.

**Typography:** one restrained scale — every in-app page h1 uses `--fs-h1`; only the logged-out
marketing hero may use `--fs-display`. The 12 bespoke off-scale headline clamps are being
removed. Right-size "simple details": labels/meta/statuses are small (`--fs-label`/`--fs-small`),
not headline-sized.

**Rules that still hold under the refresh:** energetic is not casino/manipulative — no streaks-
as-pressure, scores, leaderboards, popularity/attractiveness metrics, artificial scarcity, or
dark patterns; safety and trust surfaces stay legible and prominent; accessibility is non-
negotiable (AA contrast, visible focus, 44px targets, reduced-motion). Interactive controls must
retain visible focus states, descriptive labels, reduced-motion support, and touch targets of at
least 44 pixels. Product copy must describe only implemented capabilities.

