# CX-20260704-interactive-sporty-experience-microgames

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — owner directive (2026-07-04): the site "looks very plain"; wants an interactive, sporty vibe that makes people feel active and successful, with little games (e.g. "how many taps in 5 seconds", a tennis-serve timing game), kept easy + rewarding.
- Customer journey: a visitor lands → the page feels alive and sporty (not a plain form) → a quick, delightful warm-up micro-game makes them smile and feel capable → they sign up energized; members get satisfying, honest success moments.
- Surface: landing (hero + a warm-up game), a reusable micro-game component, and success/delight moments across signup + event create/join
- Environment and viewport/device: web, mobile-first
- Found by: Owner directive (2026-07-04)
- Implementation owner: `agent`

## The brand line (READ FIRST — non-negotiable)

KeepItUp's entire thesis + investor story is **anti-dark-pattern**: "we win when you LEAVE the app to meet people, not when you stay." So we build **delight and playfulness that make people feel good and want to go DO the sport** — NOT addictive retention mechanics.

- ✅ **Do:** sporty energy/motion, a fun optional warm-up mini-game, instant positive feedback on REAL actions, honest progress ("You're ready to play!"), satisfying success animations, low-friction "easy win" interactions.
- ❌ **Do NOT:** punishing streaks, daily-login compulsion loops, endless-scroll dopamine, fake progress/rewards, loot-box/variable-reward manipulation, or anything designed to keep someone glued. No dark patterns (durable guardrail).
- The "easy like Candy Crush" spirit we take = **low barrier + instant, genuine positive feedback**; the part we reject = **manipulative compulsion**.

## Task

1. **Make it feel alive + sporty (not plain).** Add tasteful, performant micro-interactions and motion energy that fit "keep it up / momentum": animated hero, springy press/hover states, a sense of movement. Lightweight (no heavy libs unless justified); **reduced-motion parity mandatory** (a calm static version).
2. **Ship ONE polished warm-up micro-game** on the landing (and reusable): start with **"Warm-up: how many taps in 5 seconds?"** — a 5-second tap counter with a live count, a fun result ("🔥 Nice hands!"), and a soft CTA ("You've got the energy — find a game near you"). Keyboard + touch accessible, 44px, mobile-first, self-contained. Design the component so a **tennis-serve timing/reaction game** can be added next as a second mode.
3. **Honest success moments.** Add a satisfying, on-brand success beat (subtle confetti/pulse) when a member completes their profile, creates an event, or gets accepted — tied to REAL accomplishments, plus a genuine profile-readiness indicator ("You're ready to play"). No fake rewards.

## Acceptance criteria

- Landing reads as lively + sporty; the warm-up game is playable on mobile + desktop, keyboard-accessible, and has a reduced-motion/static fallback.
- The game is OPTIONAL, self-contained, and performant (no meaningful bundle/LCP regression — note the cost).
- Success moments fire only on real actions; no streaks/compulsion/fake-progress; nothing gates participation or safety on games.
- Anti-dark-pattern honored (reviewer must be able to point to the absence of compulsion loops).
- typecheck / lint / test / prod build green; tests cover the game logic (timer, count, result thresholds) + reduced-motion fallback rendering.
- Docs: note the micro-game component + the brand-line rationale in the relevant design/docs.

## Guardrails

- Performance + a11y first; reduced-motion is not optional.
- Delight that points people OUTWARD (go play) — never a retention trap.

## Process

- Likely no migration. `git pull --rebase` first. Full DoD. **Commit AND PUSH to main.** Don't touch `apps/web/public/*.html` or `docs/marketing/**`. Read apps/web/AGENTS.md + Next docs before app code.
