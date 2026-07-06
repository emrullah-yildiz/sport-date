# CX-20260706-mini-game-landing

- Status: `ready`
- Severity: `low`
- Priority: `P3` — delight (owner-seeded, 2026-07-06, via the daily user-sim checklist section D: "a little 3D tennis game")
- Customer journey: a visitor lands → a tiny playable game moment makes them smile and feel the sporty vibe → they go find a real game
- Surface: `web` — landing (WarmUpGame slot); optionally reusable on warm empty states later
- Environment and viewport/device: mobile-first 390px + desktop; low-end mobile perf matters most
- Found by: Seraph user-sim (owner seed converted to ticket)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-interactive-sporty-experience-microgames` (implemented — shipped WarmUpGame "tap-rally" AND deliberately left the extension seam this ticket uses)

## Customer outcome

As a curious visitor, I want a second, slightly more game-like moment than the tap counter — something with timing/physics that feels like sport — so the site reads as genuinely playful, not plain. In user voice: "The tap game is cute but it's just tapping. Give me one tiny thing that feels like actually playing tennis."

## Feasibility assessment (done during this pass — read before building)

- **The seam already exists.** `apps/web/src/lib/warmup-game.ts` declares a mode registry (`WARMUP_MODES`) with `serve-timing` ("Hit the sweet spot when the marker peaks") declared but `available: false`, and `apps/web/src/components/WarmUpGame.tsx` was explicitly designed so a second mode needs only: flip `available`, add a `resultFor…` reducer, and a small timing-capture branch. This is the smallest shippable version.
- **Real 3D is NOT currently justified.** No three.js/R3F dependency exists in `apps/web/package.json`; adding three + react-three-fiber costs roughly 150-300 KB gzip plus GPU/main-thread work on the landing page — a meaningful LCP/perf regression for a decorative moment, and a battery/perf risk on low-end phones. Verdict: do not add a 3D engine for this.
- **The "3D feel" path that fits the budget:** a 2D canvas or CSS-transform keepy-uppy (ball with simple gravity + tap-to-bounce, "how many keep-ups before it drops?") delivers the physics-toy feel in a few KB with zero new dependencies. This is the approved ambition level; ship it as the third mode only after serve-timing lands and only if the landing stays fast.

## Task (smallest shippable version first)

1. **Ship the `serve-timing` mode**: a marker sweeps/peaks on a meter; player taps at the peak; closeness → warm non-comparative result tiers (reuse the existing tier pattern — every tier encouraging, no failure tier). Flip `available: true`, add mode picker UI to WarmUpGame (two real buttons), keep the single outward CTA.
2. **Optionally (stretch, separate commit): keepy-uppy physics mode** per the feasibility verdict above — 2D canvas/CSS only, no new deps, lazy-initialized on interaction.
3. Inherit every brand-line rule from CX-20260704-interactive-sporty-experience-microgames verbatim: nothing saved/ranked/compared, no streaks/high scores/daily loops, all results funnel to the same outward CTA, game gates nothing.

## Acceptance criteria

- [ ] Serve-timing mode playable on mobile (touch) and desktop (keyboard Space/Enter + click); tap target ≥44px; visible focus.
- [ ] Reduced-motion parity: a non-animated but fully playable variant (e.g. discrete steps or instant-position marker) — not a removed feature.
- [ ] Outcome announced once via polite live region; no per-frame announcements.
- [ ] No new dependency for serve-timing; keepy-uppy (if built) adds no new dependency and initializes only on interaction.
- [ ] No meaningful LCP/bundle regression on the landing (state the measured cost in the handoff log).
- [ ] Anti-dark-pattern tripwire tests extended to the new mode(s); logic unit-tested (timing→tier mapping, reduced-motion resolver).
- [ ] typecheck / lint / tests / prod build green.

## Duplicate check

- Search terms used: "mini-game", "3D", "physics", "WarmUpGame", "serve", "tennis".
- Tickets reviewed: `CX-20260704-interactive-sporty-experience-microgames` (implemented — explicitly scoped serve-timing as "added next", i.e. this ticket; not a duplicate, it is the planned successor).
- Why this is new: the successor mode was never filed as its own ticket.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass; owner seed 2026-07-06; feasibility of 3D assessed — see above); status `ready`.
