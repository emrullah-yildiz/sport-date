# CX-20260706-interactive-engagement

- Status: `ready`
- Severity: `low`
- Priority: `P3` — delight (owner-seeded, 2026-07-06, via the daily user-sim checklist section D)
- Customer journey: a member signs in on a quiet Tuesday → the product feels alive and useful, not like a static form → one honest, playful nudge points them at a real plan this week
- Surface: `web` — authenticated home/discover, plus small touches on cards across member surfaces
- Environment and viewport/device: mobile-first 390px + desktop
- Found by: Seraph user-sim (owner seed converted to ticket)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-interactive-sporty-experience-microgames` (implemented — landing motion, WarmUpGame, ReadinessIndicator; this ticket is the next layer: MEMBER-side engagement), `CX-20260704-landing-conversion-pack`

## Customer outcome

As a signed-in member, I want the product to feel playful and personally useful in small honest ways — a "your Tuesday plan" style nudge, tap-to-reveal details, satisfying micro-interactions — so that coming back feels like planning a real game, not filling in forms. In user voice: "The landing page got fun, but once I sign in everything is flat lists again. Nothing invites me to actually make a plan this week."

## The brand line (non-negotiable — inherit from CX-20260704-interactive-sporty-experience-microgames)

Anti-dark-pattern is the thesis: we win when members LEAVE the app to meet people.
- Do: honest usefulness ("2 events near you this Tuesday evening — want one?"), tap-to-reveal on discovery/prep cards, springy press states, warm success beats on REAL actions.
- Do NOT: streaks, daily-login loops, FOMO countdowns, fake scarcity, variable rewards, guilt copy ("we missed you"), notification pressure, or anything designed to maximize screen time.

## Task

1. **"Your Tuesday plan" nudge** (the core): on the authenticated home/discover surface, one calm, dismissible card that turns real nearby-events data into a concrete plan suggestion ("This week: padel Tue 19:30 near you, 1 spot"). Purely derived from existing discovery data + the member's sports; no new tracking. If nothing matches: a warm honest empty version pointing to hosting ("Nothing near you this week — start one?"). Dismiss = gone for that week, no nagging.
2. **Tap-to-reveal touches**: pick 1-2 places where progressive disclosure beats a wall of text (e.g. discovery card details, first-event preparation tips) and make the reveal a pleasant, accessible interaction (real button, keyboard + touch, reduced-motion parity).
3. **Micro-interaction pass**: extend the landing's springy press/hover language (transform/opacity only, `prefers-reduced-motion` gated) to member-side buttons/cards so signed-in surfaces match the landing's energy.

## Acceptance criteria

- [ ] The nudge shows only real, current data; never fabricates urgency; is dismissible and stays dismissed (per week) without guilt copy.
- [ ] Empty/no-match state is warm and points outward (host / widen filters), never a dead end.
- [ ] All interactions keyboard-accessible, ≥44px targets, reduced-motion parity (calm static fallback), no layout shift.
- [ ] Anti-dark-pattern review: reviewer can point to the absence of streaks/compulsion/FOMO/fake scarcity; nothing gates participation or safety.
- [ ] No meaningful bundle/LCP regression on member surfaces (no new heavy deps; framer-motion is already bundled).
- [ ] typecheck / lint / tests / prod build green; tests cover nudge derivation logic, dismissal persistence, and the empty state.

## Duplicate check

- Search terms used: "tuesday", "nudge", "tap-to-reveal", "interactive", "engagement", "micro".
- Tickets reviewed: `CX-20260704-interactive-sporty-experience-microgames` (implemented — covers LANDING motion + warm-up game + readiness; does not cover member-side nudges or tap-to-reveal), `CX-20260704-landing-conversion-pack`.
- Why this is new: no existing ticket covers signed-in engagement mechanics or a plan nudge.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass; owner seed 2026-07-06); status `ready`.
