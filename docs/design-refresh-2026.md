# Design refresh 2026 — black + neon, simpler, energetic

Status: adopted direction (2026-07-02). Supersedes the warm Cream/Ink/Lime palette as the
default theme. This document is the source of truth for the refresh; `docs/design-system.md`
points here and keeps the safety/honesty rules that still govern all copy and claims.

## Why we are changing

Owner feedback: the site is hard to navigate, has too many guideline/staff pages, presents
simple details too big, and feels cluttered and distracting. We want it **better-organized,
simpler, modern, and gamified**, with a **more energetic black + neon theme**.

What we are NOT doing: turning Sport Date into a casino. Energetic is not manipulative.
Every decision below is checked against the vision (`docs/company/vision.md`) and experience
principles (`.agents/skills/run-product-studio/references/experience-principles.md`) —
specifically the guardrails against infinite feeds, artificial scarcity, streaks-as-pressure,
attractiveness scores, and public popularity metrics. Safety and trust surfaces must stay
legible and prominent, and accessibility is non-negotiable.

---

## 1. Palette — black + neon (with measured AA contrast)

A near-black background family, two elevated surface shades, a high-legibility off-white text
pair, and three neon accents. All ratios below were **measured** with the WCAG 2.x relative-
luminance formula (sRGB). Every text/UI pairing meets **AA (≥4.5 normal / ≥3 large)**; most
reach AAA. Coral is reserved for warning/urgency only.

### Semantic tokens (apply at the `:root` layer in `apps/web/src/app/globals.css`)

| Token             | HEX       | Role                                              |
|-------------------|-----------|---------------------------------------------------|
| `--bg`            | `#0B0F0D` | App background — near-black, faint green cast      |
| `--surface`       | `#121815` | Cards / panels (elevation 1)                       |
| `--surface-raised`| `#1B2420` | Raised panels, popovers, inputs (elevation 2)      |
| `--text`          | `#F4F7F2` | Primary text (off-white, not pure #fff)            |
| `--text-muted`    | `#9DB0A6` | Secondary text, meta, labels                       |
| `--accent`        | `#B6FF3C` | Neon lime — primary / positive / active selection  |
| `--accent-2`      | `#31E0C8` | Neon teal — secondary accent, info, momentum cues  |
| `--warn`          | `#FF6B4A` | Coral — warning + urgency ONLY (kept from current) |
| `--focus`         | `#B6FF3C` | Focus ring (= accent; always visible on dark)      |
| `--line`          | `rgba(244,247,242,.12)` | Hairline borders on dark            |

Ink-on-accent text color for filled neon buttons is `--bg` (`#0B0F0D`) — do NOT put off-white
text on a neon fill (low contrast). Neon fills always carry the near-black text.

### Measured contrast ratios

| Pairing                                   | Ratio  | Verdict |
|-------------------------------------------|--------|---------|
| `--text` on `--bg`                        | 17.86  | AAA     |
| `--text` on `--surface`                   | 16.65  | AAA     |
| `--text` on `--surface-raised`            | 14.72  | AAA     |
| `--text-muted` on `--bg`                  | 8.45   | AAA     |
| `--text-muted` on `--surface`             | 7.88   | AAA     |
| `--accent` (lime) on `--bg`               | 15.95  | AAA     |
| `--accent` (lime) on `--surface`          | 14.87  | AAA     |
| `--accent-2` (teal) on `--bg`             | 11.60  | AAA     |
| `--accent-2` (teal) on `--surface`        | 10.82  | AAA     |
| `--warn` (coral) on `--bg`                | 6.85   | AA      |
| `--warn` (coral) on `--surface`           | 6.39   | AA      |
| `--bg` text on `--accent` fill (button)   | 15.95  | AAA     |
| `--bg` text on `--accent-2` fill          | 11.60  | AAA     |
| `--bg` text on `--warn` fill              | 6.85   | AA      |

Reproduce: run the ratio check in a Builder's environment before shipping; any token whose
value changes MUST be re-measured. Do not lower `--text-muted` toward the background — its AAA
headroom is what keeps meta/labels legible when they are also being made physically smaller
(see typography).

### Migration note (hardcoded colors)

Many surfaces hard-code `#fff`, `#17241d` (old Ink), `#f4f0e7` (old Cream), and per-section
literals (`#bdc8c1`, `#eff8da`, `#ffe2d6`, `#e7f9b9`, …). Flipping the `:root` tokens recolors
only the surfaces that already reference tokens. The hardcoded literals are tracked as
follow-ups in `CX-20260702-dark-neon-theme-tokens` and its per-surface children — a Builder
should NOT attempt to sweep all of them in one commit.

---

## 2. Typography — one restrained scale, right-size the "simple details"

### The problem

There are **12 bespoke off-scale headline rules** in `globals.css`, each hard-coding a large,
tight `clamp()` instead of the shared `--fs-*` tokens. The same visual role (a page h1) renders
anywhere from 78px to 92px with tracking as tight as `-.075em`, and varies surface to surface.
"Simple details" (labels, meta, statuses) are also frequently oversized (28–44px sub-headings
for what is a section label).

The 12 off-scale rules (all in `apps/web/src/app/globals.css`):

1. `.hero h1` — `clamp(54px,6.4vw,92px)` (landing, marketing)
2. `.steps h2, .safety h2` — `clamp(42px,5vw,70px)` (landing)
3. `.new-event-header h1, .host-event-hero h1` — `clamp(48px,7vw,86px)`
4. `.discover-header h1` — `clamp(48px,7vw,84px)`
5. `.hosting-header h1` — `clamp(48px,7vw,82px)`
6. `.event-detail-hero h1` — `clamp(48px,7vw,82px)`
7. `.room-hero h1` — `clamp(48px,7vw,84px)`
8. `.safety-center-header h1` — `clamp(48px,7vw,82px)`
9. `.moderation-header h1` — `clamp(46px,7vw,78px)` (staff)
10. `.legal-hero h1` — `clamp(44px,7vw,78px)`
11. `.feedback-header h1` — `clamp(46px,7vw,78px)`
12. `.auth-card h1` — `clamp(34px,7vw,48px)/line-height:1/-.055em`

### The scale (single, restrained, modern)

Keep `--font-display` (Space Grotesk) for headings and `--font-sans` (Inter) for body. Replace
the current fluid-but-huge scale with a tighter one and delete the 12 bespoke clamps.

```
--fs-display: clamp(40px, 5vw, 60px);   /* marketing hero ONLY (landing) */
--fs-h1:      clamp(30px, 3.4vw, 42px);  /* every in-app page header */
--fs-h2:      clamp(24px, 2.4vw, 30px);  /* section titles */
--fs-h3:      20px;                       /* card titles, sub-sections */
--fs-body:    16px;                       /* body copy */
--fs-small:   14px;                       /* meta, secondary */
--fs-label:   12px;                       /* eyebrows, statuses, dt labels */
```

Systemic treatment for all headings: `letter-spacing: -.02em; line-height: 1.1` (h1/h2),
`1.05` acceptable for `--fs-display`. No per-surface `-.065em`/`.95` overrides.

Rules:

- **Every in-app page h1 uses `--fs-h1`.** Only the logged-out marketing hero may use
  `--fs-display`, and only as the single named token — never a one-off clamp.
- **Right-size simple details.** Section labels/eyebrows → `--fs-label` (12px, uppercase,
  letter-spacing). Meta/statuses/`dt` → `--fs-small` or `--fs-label`, not 20–44px. A datum
  like a spots count or a status chip is not a headline. Big numbers that ARE the content (a
  day/time on a discovery card) may stay prominent but capped at `--fs-h3`/`--fs-h2`.
- **Consistent heading→sub-text rhythm.** Introduce a shared spacing token
  (`--space-heading-gap: 12px` and a small scale `--space-1..6`) so heading→lede/eyebrow gaps
  match across hero and panels. This absorbs the two existing spacing/headline tickets.

---

## 3. Information architecture — fewer destinations, progressive disclosure

The app has ~22 routes, many of them thin info/guideline/staff pages. Consolidate.

### Current clutter

`/safety`, `/safety-guidelines`, `/hosting-guidelines`, `/privacy`, `/terms`, `/trust`,
`/research/bucharest`, `/moderation`, plus the member surfaces (`/discover`, `/hosting`,
`/events/new`, `/events/[id]`, `/events/[id]/room`, `/profile`, `/feedback`).

### Target map

**Primary member nav (4 destinations max):**

- **Discover** (`/discover`) — find events.
- **Host** (`/hosting`) — your events + the create flow entry.
- **Safety** (`/safety`) — reports/cases + safety guidance (consolidated).
- **Account menu** (existing `AccountMenu`) — Profile, Switch account, Sign out. Feedback and
  Legal & trust live here or in the footer, NOT the top bar.

**Consolidations:**

1. **Merge `/safety-guidelines` into `/safety`.** The Safety Center becomes one destination:
   your reports/cases at the top, safety guidance as a progressively-disclosed section below
   (accordion / "How safety works" panel). Keep it prominent and legible — this is a trust
   surface. `301`-style redirect `/safety-guidelines → /safety#guidelines`.
2. **Fold `/hosting-guidelines` into a hosting help section** inside `/hosting` (or the create
   flow), as progressive disclosure ("Hosting standards" accordion), not a standalone page.
   Redirect `/hosting-guidelines → /hosting#standards`.
3. **Group legal behind one compact area.** Add a compact footer with a single **"Legal &
   trust"** grouping linking `/privacy`, `/terms`, `/trust`. Optionally a single `/legal`
   index that tabs/links the three; at minimum they leave the primary nav and live in the
   footer. Keep the honest-claims disclaimer intact.
4. **`/moderation` stays staff-only and out of member nav.** No member-facing link. Reachable
   only by authorized staff (existing gate); never appears in member navigation or footer.
5. **`/research/bucharest`** is a research/marketing artifact — keep it out of member nav;
   link from footer or vision docs only. Bucharest remains a hypothesis, not a claim.

**Progressive disclosure everywhere:** default to the decision-critical facts; put standards,
guidelines, and long explanations behind accordions/"learn more" so simple screens stay simple.

### Redirects

Any removed/merged route must `redirect()` (Next) to its new anchor so shared links and search
results don't 404. Tracked in `CX-20260702-ia-consolidate-guideline-and-legal-pages`.

---

## 4. Ethical gamification & energy — humane momentum, hard guardrails

Energy comes from **motion, color, and celebrating real participation**, never from pressure.

### What we WILL do

- **Energetic, tasteful motion.** Neon accent transitions, a subtle "in motion" feel on CTAs
  and state changes (accept, join, publish). All motion respects `prefers-reduced-motion`
  (already the house rule) — every animation has a static fallback.
- **Momentum tied to REAL meetings.** After a completed event, a warm "afterglow" moment
  (already exists: `PostEventAfterglow`) celebrates that a real meeting happened. A member's
  own arc of completed activities (the `MovementArc`) can be shown as a private, self-only
  reflection — "you have shared 3 games this season" — framed as memory, not a target.
- **Neon as reward signal, sparingly.** Positive/active states glow lime; a just-published
  event or an accepted request can get a brief, tasteful neon celebration. This is feedback,
  not a slot-machine payout.
- **Clear, calm state.** Modern black+neon cards make the decision-critical facts pop
  (sport, time, area, spots) so the product feels fast and confident.

### Hard guardrails (restated — a Builder must not cross these)

- **No streaks-as-pressure.** No "don't break your streak," no daily-login rewards, no
  countdown timers manufacturing urgency. Momentum is retrospective and private.
- **No scores, ranks, or leaderboards.** No attractiveness scores, no popularity metrics, no
  public "top host" boards. (Vision non-goal; experience principle.)
- **No skip/rejection counts exposed to a requester.** Rejection stays private and non-punitive.
- **No infinite feeds or artificial scarcity.** Discovery is finite and honest about
  availability; "spots left" reflects reality, never a fake scarcity nudge.
- **Coral/`--warn` is for genuine urgency/safety only** — never decoration or FOMO.
- **Celebrations are opt-in-feeling and skippable**, and never gate a core action.

### Accessibility floor (non-negotiable, applies to ALL of the above)

- Every text/UI color pairing meets **WCAG AA** on the black+neon palette (ratios in §1).
- **Visible focus** preserved (`--focus` lime ring, 3px, offset) on every interactive element.
- **44px minimum touch targets** everywhere (already the house rule).
- **`prefers-reduced-motion`** honored for every new animation, with a static fallback.
- Neon fills carry near-black text (`--bg`), never off-white.

---

## 5. Sequenced rollout

1. **Tokens first** (`CX-20260702-dark-neon-theme-tokens`, P1) — flip `:root`; token-driven
   surfaces recolor automatically; note hardcoded literals as follow-ups.
2. **Typography** (`CX-20260702-typography-right-size-and-scale`, P1) — delete the 12 clamps,
   map to the shared scale, right-size simple details, add spacing tokens. Supersedes the two
   existing headline/spacing tickets.
3. **IA consolidation** (`CX-20260702-ia-consolidate-guideline-and-legal-pages`, P1/P2) —
   merge guideline/legal/staff pages, add compact footer, redirects.
4. **Nav simplify** (`CX-20260702-navigation-simplify-primary`, P2) — 4 primary destinations,
   progressive disclosure.
5. **Ethical gamified energy** (`CX-20260702-ethical-gamified-energy-pass`, P2) — humane
   motion + momentum, guardrailed.

Each ticket is independently buildable and independently verifiable. Do not attempt the whole
refresh in one commit.
