# CX-20260702-ethical-gamified-energy-pass

- Status: `in-progress`
- Severity: `low`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 3) / Effort 3 = 12. Delivers the owner-requested "gamified, energetic" feel, but rides on top of the token + type + IA work and carries the highest guardrail risk, so it sits at the bottom of the P2 band and ships LAST in the cluster. Reach is broad (momentum cues appear across coordination + reflection), impact is real but softer than the structural fixes, confidence moderate because the humane/non-casino line requires care.
- Customer journey: cross-cutting — commitment, arrival, activity, reflection (celebrating real meetings)
- Surface: `web` (desktop + mobile)
- Environment and viewport/device: dev server localhost:3000, all widths; existing components `PostEventAfterglow.tsx`, `MovementArc.tsx`, plus state-change CTAs
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md` §4
- Implementation owner: `experience-build-agent (Claude Opus 4.8)`
- Related tickets: `CX-20260702-dark-neon-theme-tokens` (provides neon accents), `CX-20260702-typography-right-size-and-scale`

## Customer outcome

As a member, I want the app to feel energetic and to celebrate the real meetings I take part in, in a way that is warm and honest — never pressuring, never scored, never casino-like — so that momentum comes from genuine participation, not manipulation.

## What I observed

The current experience is calm but flat; the owner wants more energy and a tasteful "gamified" feel. Sport Date already has the right ingredients for HUMANE momentum — `PostEventAfterglow` (a warm post-event moment) and `MovementArc` (a member's arc of activity) — but there is no cohesive, guardrailed energy layer, and the redesign's neon palette invites tasteful celebration of real participation.

## What I expected

An energetic layer built ONLY from motion, neon accents, and retrospective celebration of real completed events — with the anti-dark-pattern guardrails enforced, per `docs/design-refresh-2026.md` §4 and the experience principles.

## Reproduction

1. Complete an event; observe the reflection/afterglow moment.
2. Note there is no cohesive energetic/celebratory treatment tied to real participation.

Reproduction rate: `direction-level; no defect reproduction — this is an enhancement`

## Customer impact

Practical/emotional: done right, the app feels alive and rewards real meetings, reinforcing the north-star (safe, worthwhile encounters). Done wrong, gamification becomes manipulation. This ticket's core value is enforcing the humane line. Safety/trust and accessibility ARE involved (celebrations must not obscure safety info or fail contrast/reduced-motion).

## Scope — what to build (from `docs/design-refresh-2026.md` §4)

- Energetic but tasteful motion on state changes (accept, join, publish) using neon accents, always with a static `prefers-reduced-motion` fallback.
- Retrospective, PRIVATE momentum tied to real completed events (e.g. an enriched `PostEventAfterglow`; `MovementArc` framed as self-only memory — "you've shared 3 games this season"), never a target or countdown.
- Neon as a brief reward/feedback signal on positive states — feedback, not a payout.

## Hard guardrails — MUST NOT cross (acceptance-blocking)

- No streaks-as-pressure, daily-login rewards, or countdown timers manufacturing urgency.
- No scores, ranks, leaderboards, attractiveness scores, or public popularity metrics.
- No skip/rejection counts exposed to a requester; rejection stays private and non-punitive.
- No infinite feeds or artificial scarcity; "spots left" must reflect reality only.
- Coral/`--warn` stays warning/urgency only — never FOMO or decoration.
- Celebrations are skippable and never gate a core action; they never obscure safety info.

## Evidence and limits

- Evidence: `apps/web/src/components/PostEventAfterglow.tsx`, `MovementArc.tsx`; `docs/company/vision.md` non-goals; `.agents/skills/run-product-studio/references/experience-principles.md` (avoid streaks/scores/popularity/infinite feeds).
- Redactions made: none.
- Facts: the afterglow and movement-arc components already exist and are the intended home for humane momentum.
- Hypotheses to verify during implementation: whether `MovementArc` is currently self-only (must stay private); which state changes benefit most from motion without becoming noise.
- Paths or surfaces not tested: none built yet — this is an enhancement.

## Duplicate check

- Search terms used: "gamified", "streak", "afterglow", "MovementArc", "momentum", "celebrate".
- Tickets reviewed: full queue; no existing gamification ticket.
- Why this is new: first ticket delivering the refresh's energetic/gamified layer under explicit guardrails.

## Acceptance criteria

- [x] Added energetic motion/celebration is tied only to real participation (completed events, positive state changes), is retrospective/private, and celebrates real meetings — matching the vision. (New `MomentGlow` fires only on a real ended-event afterglow and a member's own confirmed movement; the enriched `MovementArc` reflection speaks only of real, already-completed games from `event_reflections` counts — asserted in `ethical-energy-guardrails.test.tsx`.)
- [x] NONE of the hard guardrails above are present: no streaks-as-pressure, no scores/ranks/leaderboards, no attractiveness/popularity metrics, no exposed skip counts, no infinite feed, no artificial scarcity, no urgency countdowns, no "don't lose your streak"/daily-login. (Enforced by a source-scanning tripwire in `ethical-energy-guardrails.test.tsx` over `MomentGlow.tsx`, `MovementArc.tsx`, `PostEventAfterglow.tsx` — fails the build if any banned mechanic re-enters affirmatively; honest negated disclaimers are allowed.)
- [x] Every animation respects `prefers-reduced-motion` with a static fallback; no motion is required to complete any action. (`MomentGlow` uses `useReducedMotion()` to render a static neon wash with zero-duration transition; CSS `animation:none;transition:none` guard; asserted in the test.)
- [x] Celebrations are skippable and never gate or obscure a core or safety action. (The glow is `aria-hidden`, `pointer-events:none`, sits BEHIND content at a lower z-index; the afterglow reflection stays clearly optional/skippable.)
- [x] All colors used meet WCAG AA on the black+neon theme; neon fills carry near-black text; visible focus and 44px targets preserved. (Glow is green `--accent` only — never red `--warn` — at low opacity behind text, over unchanged solid backgrounds; existing focus rings/44px targets untouched; no layout shift.)
- [x] Copy describes only implemented capabilities (no invented stats or achievements). (Reflection is built from real `attendedMoves`/`hostedMoves`/`joinedMoves`; test asserts it never inflates the given count.)
- [x] No precise location or sensitive data is exposed by any celebration/momentum cue. (Glow carries no data/text; reflection exposes only self-only aggregate counts already shown on the private profile.)
- [x] Relevant automated tests and repository checks pass. (typecheck, lint, `test` 439 passed, production `build` — all green.)

## Handoff and retest log

- 2026-07-02 - Filed by Design Lead (black+neon refresh); guardrails in `docs/design-refresh-2026.md` §4. Ships last in the cluster. Status `ready`.
