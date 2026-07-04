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

## 2026-07-02 — Adopted direction: anthracite + systematic neon refresh

The default theme moved from the warm Cream/Ink palette to an energetic dark system, refined
(owner direction 2026-07-02) to an **anthracite background with a systematic multi-neon accent
set**. See `docs/design-refresh-2026.md` for the full direction, measured AA contrast ratios,
type scale, and information-architecture plan. That document is the source of truth for the
refresh; this file keeps the safety/honesty rules below, which still govern everything.

**Semantic tokens (applied at `:root` in `apps/web/src/app/globals.css`):**

- `--bg` `#20262B` — ANTHRACITE gunmetal grey app background (not pure black), with a subtle
  static texture (`body::before`, pointer-events-none, reduced-motion safe, behind all content).
- `--surface` `#272E34` / `--surface-raised` `#313A41` — lifted anthracite panels.
- `--text` `#F1F5F3` (AAA on all surfaces) / `--text-muted` `#A7B4B0` (7.13 AAA on bg).
- `--accent` `#3BEA7E` — **NEON GREEN**, primary/positive/success/go (join, publish, confirm).
- `--accent-2` / `--accent-info` `#43C6F5` — **NEON BLUE**, informational/links/active-nav.
- `--warn` / `--danger` / `--coral` `#FF6E68` — **NEON RED**, destructive/urgency/danger/error
  (report, leave, cancel, validation) — genuine urgency ONLY, never decoration.
- `--focus` `#3BEA7E` — always-visible green focus ring.

Use the neons **systematically by meaning**, not randomly: green = positive/primary, blue =
informational/links/nav, red = destructive/urgency. All pairings are measured to meet **WCAG AA**
(body/text/muted AAA); neon fills carry near-black `--bg` text, never off-white. Re-measure any
token whose value changes.

Measured ratios: text/bg 13.90 (AAA), text/surface 12.51 (AAA), muted/bg 7.13 (AAA),
green/bg 9.65 (AAA), blue/bg 7.74 (AAA), red/bg 5.59 (AA); bg-on-green 9.65, bg-on-blue 7.74,
bg-on-red 5.59.

**Typography:** one restrained scale — every in-app page h1 uses `--fs-h1`
(`clamp(30px,3.4vw,42px)`); only the logged-out marketing hero uses `--fs-display`
(`clamp(40px,5vw,60px)`). The 12 bespoke off-scale headline clamps were **removed** (2026-07-02,
`CX-20260702-typography-right-size-and-scale`); systemic heading treatment is `-.02em` / `1.1`
(1.05 for `--fs-display`). "Simple details" (labels/eyebrows/meta/statuses/`dt`/counts) are small
(`--fs-label` 12px / `--fs-small` 14px), not headline-sized. Heading→sub-text rhythm uses shared
spacing tokens (`--space-1..6`, `--space-heading-gap: 12px`).

**Rules that still hold under the refresh:** energetic is not casino/manipulative — no streaks-
as-pressure, scores, leaderboards, popularity/attractiveness metrics, artificial scarcity, or
dark patterns; safety and trust surfaces stay legible and prominent; accessibility is non-
negotiable (AA contrast, visible focus, 44px targets, reduced-motion). Interactive controls must
retain visible focus states, descriptive labels, reduced-motion support, and touch targets of at
least 44 pixels. Product copy must describe only implemented capabilities.

## 2026-07-04 — Sporty energy + the warm-up micro-game (anti-dark-pattern)

`CX-20260704-interactive-sporty-experience-microgames`. The landing gained tasteful,
performant motion (a floating preview card, a breathing hero glow, springy hover-lift on
chips/cards — all `transform`/`opacity` only, all inside `prefers-reduced-motion:
no-preference`, so reduced-motion members get a calm, equivalent static page) plus one
OPTIONAL warm-up micro-game.

- **WarmUpGame** (`apps/web/src/components/WarmUpGame.tsx`, logic in
  `apps/web/src/lib/warmup-game.ts`): a 5-second "how many taps?" round with a live count,
  a warm non-comparative result, and a single OUTWARD CTA ("find a game near you"). The
  logic is a small **mode registry** so a tennis-serve timing mode can be added next
  without reshaping the component. Real `<button>` tap target (keyboard + touch), ≥44px,
  outcome announced once via a polite live region, springy press + result bloom both fall
  back to static under reduced motion. Cost is trivial — no new dependency, framer-motion
  was already in the bundle; the game is a small client island loaded with the landing.
- **ReadinessIndicator** (`apps/web/src/components/ReadinessIndicator.tsx`, logic in
  `@sport-date/domain` `calculateProfileReadiness`): an HONEST "You're ready to play" on
  `/profile`, true once the member has a real capability (≥1 sport → matchable). Enrichment
  items are genuinely optional (never a gate); the ready moment is marked with the existing
  decorative `MomentGlow`.

**Brand line (durable guardrail):** this is delight that points people OUTWARD to go DO the
sport — not retention. The game saves/ranks nothing, has no streak, high-score, daily-return
loop, escalating levels, or variable reward, and gates nothing (signup, discovery, safety are
never contingent on playing). Success beats fire only on REAL accomplishments. The
`ethical-energy-guardrails` and `warmup-game` / `WarmUpGame` tests tripwire against any
manipulative mechanic re-entering these surfaces.

