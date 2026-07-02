# CX-20260702-join-request-cancel-buttons-no-hover-glow

- Status: `ready`
- Severity: `low`
- Priority: `P3` — (Reach 4 × Impact 2 × Confidence 5) / Effort 1 = 40, capped P3 as pure hover-affordance polish. A coverage gap left by the (verified) systemic glow work on the highest-intent buttons in the app.
- Customer journey: commit — request a place / cancel request / cancel my place
- Surface: `web` — `apps/web/src/components/JoinRequestControls.tsx` buttons via `apps/web/src/app/globals.css`
- Environment and viewport/device: live dev `http://localhost:3000`, Chromium 1280, pointer; observed 2026-07-02
- Found by: user-sim (experience loop), commit-journey pass
- Related tickets: `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified/archived — this is a button set that verified fix did NOT cover), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring`

## Customer outcome

As anyone using Rally with a mouse, when I hover the **Request a place** / **Cancel request** /
**Cancel my place** buttons I want the same neon-glow affordance every other button now shows, so the
interface feels coherent and these high-intent commit actions clearly read as interactive.

## What I observed

On the event detail page (`/discover/events/{id}`), the join-controls buttons are plain unclassed
`<button>` elements inside `.join-request-box` / `.join-state`. Measured live: the **Cancel request**
button has `box-shadow: none` at rest **and** on hover (no change on hover). The systemic hover-glow
ticket (`CX-20260702-button-hover-inconsistent-no-neon-glow`, verified) enumerated the buttons it
covered and did not include the `.join-request-box` / `.join-state` buttons, so these — the single
most important commit-loop CTAs — were missed.

## What I expected

Per the owner's global rule "use neon light effect for hovering on button all the time": **Request a
place** glows green (`--glow-accent`, primary/positive); **Cancel request** / **Cancel my place**
glow with the appropriate role colour (a step-back cancel is a neutral/positive action, not a hard
destructive one — green is acceptable, matching how other neutral buttons resolved).

## Reproduction

1. Open a compatible event's detail page and hover **Request a place** (or, in pending state, **Cancel request**).
2. Observe no neon glow appears on hover (box-shadow stays `none`).

Reproduction rate: `confirmed live (Cancel request measured; Request a place shares the same unclassed styling)`

## Customer impact

Minor coherence/affordance gap on the app's most decision-heavy buttons; no functional or safety
impact. Purely presentational.

## Duplicate check

- Search terms: join-state, join-request-box, hover glow, box-shadow none.
- Tickets reviewed: systemic glow ticket (verified — button list does not include join-controls), share-invitation glow ticket (different button).
- Why new: a specific coverage gap not addressed by the closed systemic ticket, on the commit-journey CTAs.

## Acceptance criteria

- [ ] Hovering **Request a place** shows the green neon glow (`--glow-accent`).
- [ ] Hovering **Cancel request** / **Cancel my place** shows a role-appropriate neon glow (consistent with other neutral/positive buttons).
- [ ] Glow persists under `prefers-reduced-motion` (only lift/translate dropped); disabled buttons show no glow.
- [ ] `:focus-visible` ring unchanged; AA unaffected; no layout shift or overflow at 375/1280.
- [ ] Uses shared glow tokens (no new hardcoded hex).
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (commit-journey live pass); status `ready`.
