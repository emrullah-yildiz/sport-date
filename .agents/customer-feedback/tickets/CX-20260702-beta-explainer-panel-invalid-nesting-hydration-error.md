# CX-20260702-beta-explainer-panel-invalid-nesting-hydration-error

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 5) / Effort 2 = 30. Reach: every signed-out landing visitor who clicks "What is the private beta?" (the explainer that satisfies design criterion #2) triggers it. Impact: not visually broken (the panel still opens and reads correctly) but throws 4 React DOM-nesting/hydration console errors at a key trust moment; invalid HTML (`<div>`/`<ul>` inside `<p>`) can also cause subtle layout/repaint quirks and pollutes the console for any diagnostics. Confidence 5: reproduced live (0 errors on load → 4 errors on click). Effort 2: change the `microcopy` wrapper from `<p>` to a `<div>` (or render the explainer outside the paragraph). Not safety/auth-gated → P2.
- Customer journey: onboarding / understanding the product — signed-out visitor opening the "private beta" explainer
- Surface: `web` (desktop + mobile)
- Environment and viewport/device: dev server localhost:3000, signed OUT, 1280 (also applies at 375 — same DOM), Chromium
- Found by: User-simulator (landing → understand-the-product journey), 2026-07-02
- Related tickets: `CX-20260701-private-beta-term-unexplained-no-tooltip` (archived — added this explainer; this is a nesting bug in that component). `CX-20260630-landing-hero-reduced-motion-hydration-error` (archived — different component/cause). Not a duplicate.

## Customer outcome

As a signed-out visitor deciding whether to join, I want to click "What is the private beta?" and read a clean explanation, so that I understand what I'm opting into — without the app throwing errors at the exact moment it is trying to earn my trust.

## What I observed

On `/landing` (signed out), the hero microcopy renders `<p className="microcopy">Private beta · Adults only · Europe first <BetaTermExplainer/></p>`. `BetaTermExplainer` is a `<span>` containing a `<button>` (valid inside `<p>`), but when opened its disclosure panel (`BetaTermPanel`) renders a `<div className="term-explainer-panel">` wrapping a `<ul className="term-explainer-points">` — **block elements nested inside a `<p>`, which is invalid HTML**.

Live console capture:
- On page load: **0 console errors**.
- Immediately on clicking "What is the private beta?": **4 console errors**:
  - `In HTML, %s cannot be a descendant of <%s>. This will cause a hydration error. <ul> p`
  - `<p> cannot contain a nested <ul>`
  - `In HTML, %s cannot be a descendant of <%s>. This will cause a hydration error. <div> p`
  - `<p> cannot contain a nested <div>`

The panel still visually opens and its content reads correctly ("This is an early preview for adults (18+)…", "It is free to use during the preview.", "Access is open…", "Got it").

Observed 2026-07-02, reproduced every attempt.

## What I expected

Opening the explainer should render the panel with no console errors and valid HTML. A member should never trip a hydration/nesting error while reading the product's own trust disclosure.

## Reproduction

1. Sign out. Open `/landing` with the browser console open.
2. Note: no errors on load.
3. Click the "? What is the private beta?" button in the hero microcopy.
4. Observe 4 React DOM-nesting / hydration errors appear (`<p> cannot contain a nested <ul>` / `<div>`), while the panel still opens.

Reproduction rate: `confirmed (0 errors before click, 4 after) — repeated`

## Customer impact

Practical: invalid HTML (block-in-`<p>`) forces the browser to auto-close the `<p>` and can produce subtle layout/margin differences and extra client repaints; it also floods the console at the moment a diagnostics-minded member or reviewer is watching. Emotional: for a cautious first-timer who opens dev tools (some do), seeing "This will cause a hydration error" while reading a trust explainer undercuts confidence. Not a safety/privacy/auth issue; the copy itself is correct and honest.

## Evidence and limits

- Evidence: live console capture (0→4 errors on click); source `apps/web/src/app/landing/page.tsx` L146-150 (`<p className="microcopy">…<BetaTermExplainer/></p>`); `apps/web/src/components/BetaTermExplainer.tsx` `BetaTermPanel` (renders `<div>` > `<ul>`).
- Redactions made: none.
- Facts: SSR HTML contains only the `<button>` inside `<p>` (valid) because the panel is closed on first render; the illegal `<ul>`/`<div>` are injected into the `<p>` on client open, which is when the nesting errors fire.
- Hypotheses to verify during implementation: simplest fix is to make the microcopy wrapper a `<div className="microcopy">` (or a `<span>`/`<p>` sibling that is not the parent of the explainer). Confirm no other surface embeds `BetaTermExplainer` inside a `<p>` (e.g. login/signup) — if so, fix those wrappers too.
- Paths or surfaces not tested: whether the same explainer is used inside a `<p>` on `/login` or `/signup` (should be checked during the fix).

## Duplicate check

- Search terms used: "hydration", "cannot be a descendant", "nested", "beta explainer", "term-explainer".
- Tickets reviewed: `CX-20260701-private-beta-term-unexplained-no-tooltip` (archived, added the explainer), `CX-20260630-landing-hero-reduced-motion-hydration-error` (archived, different hero-motion cause), `CX-20260702-join-controls-reduced-motion-hydration-mismatch` (archived, different component).
- Why this is new: no ticket covers the block-in-`<p>` nesting in `BetaTermExplainer`/`BetaTermPanel`; the prior explainer ticket only added the disclosure, and the prior hydration tickets are unrelated components.

## Acceptance criteria

- [ ] Opening "What is the private beta?" on `/landing` produces **zero** console errors (no `<p> cannot contain a nested <ul>/<div>` hydration/nesting warning).
- [ ] The explainer panel content and behavior are unchanged (opens, reads correctly, Esc/outside-click/"Got it" close, focus returns to trigger).
- [ ] The fix is applied wherever `BetaTermExplainer` is rendered inside a `<p>` (landing hero; check login/signup).
- [ ] The rendered HTML is valid (no block element inside a `<p>`); layout on the landing hero is unchanged at 375 and 1280.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by User-simulator (landing → understand-the-product, signed-out); status `ready`.
