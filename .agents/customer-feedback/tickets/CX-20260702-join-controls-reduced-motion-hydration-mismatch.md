# CX-20260702-join-controls-reduced-motion-hydration-mismatch

- Status: `ready`
- Severity: `low`
- Priority: `P3` — (Reach 3 × Impact 2 × Confidence 4) / Effort 2 = 12. Console-level React hydration warning on the event detail page under reduced-motion; no visible break, but it degrades reliability of client hydration on a core page.
- Customer journey: discover & decide → commit (event detail / join controls)
- Surface: `web` — `apps/web/src/components/JoinRequestControls.tsx`
- Environment and viewport/device: live dev `http://localhost:3000`, Chromium with `prefers-reduced-motion: reduce`, 1280; observed 2026-07-02
- Found by: user-sim (experience loop), commit-journey pass
- Related tickets: `CX-20260630-landing-hero-reduced-motion-hydration-error` (archived — same class of bug, different surface/component)

## Customer outcome

As a member who uses reduced-motion, I want the event detail page to hydrate cleanly, so that the
join controls stay reliable and no rendering warning fires.

## What I observed

Loading `/discover/events/{id}` with `prefers-reduced-motion: reduce`, React logged a hydration
mismatch on the framer-motion wrapper of the join controls. The server rendered the
`.join-request-box` `motion.div` with `style="opacity:1;transform:none"` while the client produced
`style="opacity:1"` (no `transform`) — "A tree hydrated but some attributes of the server rendered
HTML didn't match the client properties. This won't be patched up." The mismatch points at
`<motion.div className="join-request-box" initial={false} animate={{opacity:1}} exit={{opacity:1}}>`.

Root cause (source): in reduced-motion mode `JoinRequestControls` sets `panelMotion` to
`{ initial: false, animate: { opacity: 1 }, ... }` (no `transform`), but framer-motion's SSR output
still emits `transform:none`, so the server and client style strings differ on first paint.

## What I expected

The event detail page hydrates with no React hydration warning under reduced-motion; the reduced-motion
branch produces identical server/client markup for the join-controls wrapper.

## Reproduction

1. In a browser with reduced-motion enabled, open any event detail page `/discover/events/{id}`.
2. Open the console: a hydration-mismatch warning fires for the `.join-request-box` motion element.

Reproduction rate: `2/2 (both page loads this pass)`

## Customer impact

No visible break, but React discards the mismatched subtree's server HTML, and the warning indicates
brittle hydration on a core commit-loop page. No safety/privacy/data impact.

## Duplicate check

- Search terms: hydration, join-request-box, reduced-motion mismatch, transform none.
- Tickets reviewed: landing-hero reduced-motion hydration (archived; landing hero, different component). No open ticket for JoinRequestControls.
- Why new: distinct component/surface; the landing fix does not touch JoinRequestControls.

## Acceptance criteria

- [ ] Loading an event detail page under `prefers-reduced-motion` produces no React hydration-mismatch warning for the join controls.
- [ ] The reduced-motion branch renders identical server/client markup (e.g. avoid the motion wrapper, or force a stable style, when reduced-motion so no `transform` diff occurs).
- [ ] Join controls still behave correctly (request/cancel/pending/accepted) with full reduced-motion parity.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (commit-journey live pass); status `ready`.
