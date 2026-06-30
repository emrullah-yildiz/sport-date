# CX-20260630-landing-hero-reduced-motion-hydration-error

- Status: `ready`
- Severity: `low`
- Customer journey: First impression — a reduced-motion visitor opens the public landing page (`/landing`)
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium headless, viewport 1280x900, `prefers-reduced-motion: reduce` emulated. Observed 2026-06-30.
- Found by: Customer Experience Agent (targeted 3D-surface verification pass)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a cautious adult who keeps "reduce motion" turned on (often for comfort, vestibular, or accessibility reasons), I want the landing page to load cleanly and calmly so that my very first impression of the product is one of polish and trustworthiness, with no signs of something being subtly broken under the hood.

## What I observed

Observed 2026-06-30, reproduced 3/3 with reduced-motion on and 0/3 with it off.

- With `prefers-reduced-motion: reduce` active, opening `/landing` produces exactly one browser console error: a React hydration mismatch warning. React reports that the server-rendered hero copy and the client-rendered hero copy disagree on inline style, and that the mismatch "won't be patched up."
- The reported difference is on the hero copy elements (eyebrow, `h1` title, subtitle, CTA wrapper, microcopy): the server emits `style={{opacity:1}}` while the client emits `style={{opacity:"1",transform:"none"}}`. The diff also shows the visible hero text ("Meet through movement", the headline, the subtitle, "Private beta · Adults only · Europe first") being re-inserted on the client side of the mismatch.
- Customer-visible impact in this run: NONE that I could see. The hero copy was fully visible (computed `opacity` = 1), the headline and subtitle were present, and the "Start your profile" CTA worked and navigated to `/signup`. The 3D canvas mounted without error.
- With reduced motion OFF, the same page loads with a completely clean console (0 errors). The error is specific to the reduced-motion path.

I did not observe any flash of invisible/missing copy, but React's own warning says the mismatched subtree "won't be patched up," which is a correctness risk worth removing on the product's primary first-impression page.

## What I expected

The landing page should hydrate cleanly in both motion modes. A reduced-motion visitor should get the same calm, correct page as everyone else, with no console errors and no server/client markup disagreement — especially on the hero, which is the first thing every visitor sees.

## Reproduction

1. Emulate `prefers-reduced-motion: reduce` (OS setting or browser devtools rendering emulation).
2. Open `http://localhost:3000/landing` with the browser console open.
3. Observe one React hydration-mismatch error naming the hero copy elements (`style` `opacity`/`transform` disagreement).
4. Toggle reduced motion OFF, reload: the console is clean.

Reproduction rate: `3/3 safe attempts` with reduced-motion on; `0/3` with it off.

## Customer impact

Low. The hero copy stays visible and the primary CTA works, so no customer is blocked and nothing safety-, privacy-, or authorization-related is involved. The cost is (a) a polish/trust ding for the exact audience most likely to have devtools or accessibility tooling open, and (b) a real correctness smell: React declines to reconcile the mismatched hero subtree, so future changes near this code could turn a harmless style disagreement into a visibly wrong first paint. It is a tier-5 polish/correctness issue.

- Authorization/privacy/precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- Accessibility: tangentially involved — the defect is triggered exclusively by the reduced-motion preference, so it disproportionately surfaces for accessibility-conscious visitors, even though it does not (in this run) degrade what they can see or do.

## Evidence and limits

- Evidence: console-error capture and screenshots from the verification pass (`landing-reduced-motion.png`), saved under the session scratchpad (gitignored, no PII). The error text and the server-vs-client style diff are quoted above.
- Redactions made: none needed (no PII; the page is public marketing copy).
- Facts:
  - The error appears only under `prefers-reduced-motion: reduce` (3/3), and never without it (0/3).
  - The diff is `style={{opacity:1}}` (server) vs `style={{opacity:"1",transform:"none"}}` (client) on the hero copy elements.
  - The landing hero copy is wrapped in framer-motion `motion.*` elements driven by an `enter`/`heroStagger` variant set whose reduced-motion branch differs from the animated branch (`apps/web/src/app/landing/page.tsx`, the `enter` variants and the `hero-content` `motion.div`).
  - Hero copy remained visible (opacity 1) and the CTA navigated to `/signup`.
- Hypotheses to verify during implementation:
  - The mismatch likely comes from the `initial={mounted ? "hidden" : false}` / variant setup: under reduced motion the resolved inline style on the server pass (`opacity:1`) differs from what framer-motion writes on the client (`opacity:"1"` + `transform:"none"`). The fix is probably to make the server and first client render emit identical inline style for the reduced-motion case (e.g. avoid framer-motion injecting `transform:none`, or render plain elements when reduced motion is preferred), not to hide the copy.
  - Confirm no other page (e.g. `/profile` Movement Arc, `/discover`) shows the same reduced-motion hydration mismatch; this pass only saw it on `/landing`.
- Paths or surfaces not tested: the reduced-motion hydration check was run on `/landing` only; mobile-viewport reduced-motion was not separately captured for this specific error (desktop reduced-motion reproduced it). Real assistive-tech (screen reader) behavior was not evaluated.

## Duplicate check

- Search terms used: "hydration", "reduced-motion", "landing", "hero", "opacity", "motion" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-new-member-empty-discovery-missing-language.md` (unrelated; discovery/onboarding), `README.md`.
- Why this is new: no existing ticket covers the landing hero, reduced motion, or hydration; this is the first finding on the new 3D landing surface.

## Acceptance criteria

- [ ] `/landing` hydrates with a clean browser console under `prefers-reduced-motion: reduce` (no hydration-mismatch error).
- [ ] The hero eyebrow, headline, subtitle, CTA, and microcopy remain visible immediately in both motion modes (no regression to the current visible-by-default behavior).
- [ ] The "Start your profile" CTA continues to navigate to `/signup` in both motion modes.
- [ ] Server-rendered and first-client-rendered inline styles for the hero copy match in the reduced-motion case (no `transform:none` vs absent disagreement).
- [ ] No new console errors are introduced on the non-reduced-motion path (it must stay at 0).
- [ ] Relevant automated checks pass (`npm test`, `npm run typecheck`).

Removed criteria: precise-location/data-exposure criterion deleted — this page exposes no member data.

## Handoff and retest log

- `2026-06-30 05:06 GTBDT` - Filed by Customer Experience Agent; status `ready`. Reproduced 3/3 under reduced motion, 0/3 without. Content stays visible; this is a console-error / correctness finding, not a blocked journey.
