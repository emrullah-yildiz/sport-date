# CX-20260702-join-controls-reduced-motion-hydration-mismatch

- Status: `implemented`
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
- 2026-07-02 - build - Implemented (commit `ada3e8d`). Root cause: `JoinRequestControls` wrapped every join panel in a framer-motion `motion.div` on every render pass; `motion.*` serializes its resolved inline style differently on the server (emits `transform:none`) than the client's first (pre-mount) render (no `transform`), so under reduced-motion the `.join-request-box` server/client style strings diverged — a mismatch React "won't patch up". Fix approach: gate the motion wrapper behind a `mounted` flag via `useSyncExternalStore` (server snapshot `false`, client snapshot `true`), rendered through a local `Panel` component. Before mount (the SSR pass and the first client paint) every panel is a plain `<div>` with NO motion props and NO motion-injected inline `opacity`/`transform`; after mount the `motion.div` swaps in. Why server+client now agree: both the SSR HTML and the first client render take the `mounted === false` branch, so they emit byte-identical plain markup in every motion setting — there is no `transform`/`opacity` diff to mismatch. `AnimatePresence initial={false}` means the first mounted panel does not animate its entrance, so hydration is visually unchanged; only later in-place resolutions (request → pending/accepted/cancelled) get the calm fade/rise, and reduced-motion users still get the instant motion-free swap (parity preserved, no visual regression). Test: added `JoinRequestControls.test.tsx` — a `renderToStaticMarkup` (server-pass) tripwire asserting the join form and a resolved panel emit no motion inline `transform`/`opacity` style. Checks: typecheck green, lint 0 errors, vitest 570 passed / 12 skipped, `next build` compiled + all 56 pages generated. No migration. Handing back for independent reduced-motion retest.
