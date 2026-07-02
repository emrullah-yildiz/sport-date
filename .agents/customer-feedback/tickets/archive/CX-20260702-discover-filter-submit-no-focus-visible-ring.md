# CX-20260702-discover-filter-submit-no-focus-visible-ring

- Status: `implemented`
- Severity: `medium`
- Priority: `P2` — (Reach 3 × Impact 3 × Confidence 5) / Effort 1 = 45 → but capped at P2, not P1: accessibility regressions are never below P1 by policy, yet this is a *visible-focus indicator* gap on a single (non-safety, non-auth) discovery control with a working keyboard tab order and a live neon hover state, so it is a real WCAG 2.4.7 / 1.4.11 gap rather than a keyboard trap or a blocked journey. One-line CSS fix, very high confidence. Components: `apps/web/src/app/globals.css` (`.discover-filters button`).
- Customer journey: discovery (apply filters / "Find my events")
- Surface: `web` — shared `apps/web/src/app/globals.css`
- Environment and viewport/device: all widths; keyboard / non-pointer users
- Found by: User-simulator experience loop (2026-07-02), discover-filters + Plus-gating pass, logged in as a pooled free member (seeker-B), real Chromium `reducedMotion: reduce`
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified — added the *hover* glow to `.discover-filters button` but explicitly left `:focus-visible` rings untouched, assuming one already existed; it never did), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring` (verified — same class of gap on a *different* button, the share button, now fixed), `CX-20260701-plus-perks-advanced-discovery-filters` (verified — the filter surface this button submits)

## Customer outcome

As a keyboard user narrowing discovery, when I Tab to the "Find my events" filter submit button I want a clearly visible focus indicator (the neon focus ring the rest of the app uses) so I can see which control I'm about to activate — instead of the button appearing to lose focus entirely.

## What I observed

On `/discover`, the primary filter action **"Find my events"** (`button[type="submit"]` inside `form.discover-filters`) is rendered with **no class**, so it matches none of the app's per-surface `:focus-visible` rules and no global `button:focus-visible` fallback exists. When focused by keyboard, the browser falls back to the user-agent default `outline: 1px auto rgb(16, 16, 16)` with `box-shadow: none`.

- The page background on `/discover` is the anthracite `--bg` = `rgb(32, 38, 43)`. A `1px` near-black (`rgb(16,16,16)`) outline against that surface is roughly **1.1:1** contrast — effectively invisible, far below the WCAG 1.4.11 non-text minimum of 3:1.
- The neon glow (`--glow-accent` box-shadow) that this button *does* show on **hover** does **not** appear on keyboard `:focus-visible` (measured `box-shadow: none` when keyboard-focused), so a mouse user gets a strong affordance while a keyboard user gets essentially nothing.
- Every sibling primary action on the same surface has a proper paired focus ring: `.event-publish:focus-visible`, `.discover-broaden:focus-visible`, `.discover-plus-link:focus-visible`, `.discovery-card a:focus-visible`, `.discovery-empty a:focus-visible` all set `outline: 3px solid var(--focus)` (`--focus: #3BEA7E`). Only `.discover-filters button` was left out.

Observed 2026-07-02; reproduced on the running dev server at 1280px. Not a harness artifact — the gap is in the app's own `globals.css` (the button has a `:hover` rule at globals.css line ~1107 but no `:focus-visible` rule anywhere).

## What I expected

Tabbing to "Find my events" should show the same crisp `3px solid var(--focus)` neon focus ring the rest of Rally uses, clearly visible on the anthracite background — matching its neighbouring `.event-publish` / `.discover-broaden` buttons.

## Reproduction

1. Log in as any member and open `/discover`.
2. Using only the keyboard, Tab from the City input through the filter row to the green "Find my events" submit button.
3. Observe the focus indicator: only a faint 1px near-black UA outline appears; no neon ring, no glow. On the dark background it is effectively invisible.

Reproduction rate: `confirmed (code + live)` — `.discover-filters button` has a `:hover` glow rule but no `:focus-visible` rule in `globals.css`, and no global `button:focus-visible` fallback catches it; live keyboard focus measured `outline: 1px auto rgb(16,16,16)`, `box-shadow: none`.

## Customer impact

Accessibility (WCAG 2.4.7 Focus Visible and 1.4.11 Non-text Contrast). A keyboard or switch user cannot reliably see that the primary "run my filtered search" control is focused, so they may activate the wrong control or lose their place in the filter row. It is not a keyboard trap and the tab order works, and discovery itself remains completable, so it is a visible-focus defect rather than a blocked journey — but it is the primary CTA of the discovery filter bar and should meet the same focus-visible bar as every other button. No authorization, privacy, precise-location, or data-loss dimension.

## Evidence and limits

- Evidence: live keyboard focus on the submit button measured `{ outline: "1px auto rgb(16, 16, 16)", boxShadow: "none" }`; button `className` empty; page `--bg` = `rgb(32, 38, 43)`; source: `globals.css` `.discover-filters button` styled at line ~735 and given a hover glow at line ~1107, with no matching `:focus-visible` rule (grep of `focus-visible` shows `.event-publish`, `.discover-broaden`, `.discover-plus-link` covered, `.discover-filters button` absent; the only `button:focus-visible` rules are container-scoped to `.hosting-page` / `.room-chat` / `.feedback-form`).
- Redactions made: none needed (no personal data, tokens, or precise locations involved).
- Facts: the button has a hover glow but no focus-visible ring; the UA default outline is near-black on anthracite.
- Hypotheses to verify during implementation: adding `.discover-filters button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }` (mirroring `.discover-broaden`) fully resolves it with no layout shift.
- Paths or surfaces not tested: whether other bare/classless `<button>`/`<a>` submit controls elsewhere share this fall-through (a global `button:focus-visible` safety-net would be the durable fix, but is out of scope for this single-button ticket).

## Duplicate check

- Search terms used: `focus-visible`, `focus ring`, `discover-filters`, `Find my events`, `visible focus`, `keyboard focus`, `outline`.
- Tickets reviewed: `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified; added the *hover* glow to `.discover-filters button` and its AC + verify note state `:focus-visible` rings were left unchanged / "all 43 focus-visible rings intact" — it assumed a ring existed here but none does, so the focus gap is out of its scope), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring` (verified; same *category* of defect on the share button, not this one), all active `CX-*` and archived `CX-*` tickets.
- Why this is new: no ticket covers the missing **`:focus-visible` ring on the discover filter submit button**. The verified hover-glow ticket deliberately excluded focus rings; this button is the one primary CTA that received a hover glow but was never paired with a focus ring, unlike its siblings.

## Acceptance criteria

- [ ] Tabbing to the "Find my events" button on `/discover` shows a clearly visible neon focus ring consistent with the rest of the app (`outline: 3px solid var(--focus)` with an offset), on the anthracite background.
- [ ] The focus indicator meets WCAG 1.4.11 (≥3:1 against the adjacent background) and 2.4.7 (focus is visible); it is present for keyboard/`:focus-visible` even though the neon glow is the pointer-hover signal.
- [ ] Mouse hover behaviour (the existing `--glow-accent` glow) is unchanged; disabled state shows no ring/glow.
- [ ] No layout shift or overflow introduced at 375 and 1280 (use outline/offset, not layout-affecting properties).
- [ ] Fix is token-based (`var(--focus)`), consistent with the sibling `.event-publish` / `.discover-broaden` / `.discover-plus-link` focus rules; ideally consider a durable global `button:focus-visible` safety-net so future classless buttons don't regress (optional, note if deferred).
- [ ] Relevant automated tests and repository checks pass (typecheck, lint, web tests, production build).

## Handoff and retest log

- 2026-07-02 - Filed by the User-simulator experience loop during the discover-filters + Plus-gating pass (free member, live + source-confirmed). Status `ready`.
- 2026-07-02 - Picked up by experience-build-agent, set `in-progress`. Adding `.discover-filters button:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }` mirroring `.discover-broaden` / `.discover-plus-link`.
- 2026-07-02 - Implemented (commit `e12af3a`). Selector `.discover-filters button:focus-visible` added to `apps/web/src/app/globals.css` (co-located with the button rule at line ~735): `outline: 3px solid var(--focus); outline-offset: 2px;` — the same neon-green ring as `.discover-broaden` / `.discover-plus-link` / `.event-publish`. The "Find my events" submit button (confirmed the only classless `<button type="submit">` in `form.discover-filters`, `apps/web/src/app/discover/page.tsx:163`) now shows a visible 3px `var(--focus)` (#3BEA7E) ring on keyboard `:focus-visible`, ~high-contrast on anthracite `--bg`. Outline/offset only — no layout shift at 375/1280; hover glow (globals.css ~1107) and `:disabled` no-glow reset (~1169) untouched; reduced-motion unaffected. Checks: typecheck pass, lint pass (0 errors, 2 pre-existing unrelated warnings), production build pass; unit tests 560 pass with 2 unrelated `beforeEach` hook-timeout flakes (auth-email, photo-storage) that pass in isolation and are untouched by this CSS-only change. Handoff for independent retest.
