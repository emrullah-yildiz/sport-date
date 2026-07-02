# CX-20260702-global-focus-visible-fallback-for-interactive-elements

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 4) / Effort 2 = 32. Systemic accessibility hardening: instead of fixing invisible-keyboard-focus one control at a time (the User-simulator has already found several: discover-filter submit, room safety-options summary, and more likely remain), add ONE global `:focus-visible` fallback so every interactive element has a visible focus ring by default. Closes the entire WCAG 2.4.7 / 1.4.11 focus-ring-gap CLASS the way the shared `--glow-*` tokens closed the hover-affordance class.
- Customer journey: all (keyboard / switch / low-vision users, every surface)
- Surface: `web` — `apps/web/src/app/globals.css` (global base layer)
- Found by: Tester + User-simulator (four-agent loop), 2026-07-02 — recurring focus-ring gaps
- Related tickets: `CX-20260702-discover-filter-submit-no-focus-visible-ring` (verified — one instance), `CX-20260702-room-safety-options-summary-no-focus-ring-or-hover` (P1, in progress — another instance), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring` (verified — another), `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified — the analogous SYSTEMIC fix for hover, which this mirrors for focus)

## What I observed

Multiple interactive controls have shipped without a `:focus-visible` ring because they are classless or use a class not covered by a per-surface `:focus-visible` rule, so keyboard focus falls back to the UA default (~1px near-black outline on the anthracite `--bg`, ~1.1:1 — effectively invisible, failing WCAG 2.4.7 / 1.4.11). Each has been fixed individually (discover-filter submit, room safety-options summary, share button…), but new ones keep surfacing. There is no global safety-net: the only `button:focus-visible` rules are container-scoped (`.hosting-page`, `.room-chat`, `.feedback-form`) or per-class.

## What I expected

A single global base rule so that **every** natively-focusable / interactive element (`a[href]`, `button`, `summary`, `[role="button"]`, form controls, `[tabindex]`) shows the app's neon focus ring on `:focus-visible` by default, with per-component rules only *overriding* the offset/radius where needed. New controls then inherit a visible focus ring automatically and can't regress this class.

## Acceptance criteria

- [ ] A global `:focus-visible` rule in globals.css gives all interactive elements a visible `outline: 3px solid var(--focus); outline-offset: 2px` (or equivalently visible token ring) by default, meeting WCAG 1.4.11 (≥3:1 on the adjacent background) and 2.4.7.
- [ ] The rule uses `:focus-visible` (not `:focus`), so it does not show rings on mouse click where inappropriate; it must not remove focus from any control (no `outline:none` without a replacement).
- [ ] Existing per-component focus rings still work (no double-ring regressions; consolidate/override where a component sets its own offset/radius). Spot-check the previously-fixed controls (discover-filter, room safety-options, share button, join controls) still look correct.
- [ ] No layout shift or overflow introduced (outline/offset only); disabled controls show no ring.
- [ ] A quick sweep confirms previously-ringless classless controls (e.g. any bare `<button>`/`<a>`/`<summary>`) now get the ring — verify a couple live at 375 and 1280.
- [ ] Repository checks pass incl. production build.

## Duplicate check

- Search terms: `:focus-visible`, focus ring, global outline, keyboard focus.
- Tickets reviewed: the individual focus-ring tickets above (each scoped to one control) and the systemic hover-glow ticket (the hover analogue). No ticket adds a GLOBAL focus-visible fallback.
- Why new: this is the systemic/base-layer fix that subsumes the one-off focus-ring gaps and prevents the whole class going forward.

## Handoff and retest log

- 2026-07-02 - Filed by the orchestrator from a Tester recommendation (deferred global safety-net) after multiple one-off focus-ring gaps; status `ready`.
