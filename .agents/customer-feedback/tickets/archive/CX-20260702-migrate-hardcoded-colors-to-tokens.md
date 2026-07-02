# CX-20260702-migrate-hardcoded-colors-to-tokens

- Status: `verified`
- Severity: `high`
- Priority: `P1 high` — bumped from P2: until the ~141 hardcoded light card/panel/input colors + ~32 dark-fill surfaces are moved onto tokens, the app is a half-migrated mix (dark shell, light cards) that looks worse than either state. Completing this is what actually delivers the black+neon look. Split by surface-group if too large for one clean unit.
- Customer journey: cross-cutting (every surface with a card/panel — discovery, hosting, trust, profile, coordination, reflection, auth)
- Surface: `web` (desktop + mobile; shared CSS)
- Environment and viewport/device: dev server localhost:3000, all widths; `apps/web/src/app/globals.css`
- Found by: experience-build-agent — inventory taken while implementing `CX-20260702-dark-neon-theme-tokens` (2026-07-02)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260702-dark-neon-theme-tokens` (parent — established the token layer this migrates onto), `CX-20260702-typography-right-size-and-scale`, `CX-20260702-migrate-hardcoded-colors-moderation-remainder` (child — deferred staff `/moderation` + dead legacy landing CSS)

## Customer outcome

As a member on the new black+neon theme, I want every card and panel to be dark and legible like the rest of the app, so the product feels coherent instead of a patchwork of leftover light-mode cards on a dark page.

## What I observed

Flipping the `:root` tokens recolored only surfaces that read the shared tokens. Two residual classes remain OFF-THEME in `apps/web/src/app/globals.css` and must be migrated onto the semantic tokens:

**Class A — hardcoded LIGHT fills (`background: white` / `#fff` / `#f4f0e7`).** These stay light; with `--ink` now mapping to off-white `--text`, text on them is light-on-light (low contrast). Affected (non-exhaustive, from source grep — ~141 literal-color occurrences total):
`.event-card`, `.steps li`, `.preview-card`, `.step-card`, `.safety-card` (landing);
`.signup-card`, `.sport-card`, `.seeking-card`, `.review-card` (signup flow);
`.auth-card`, `.auth-support-form input`, `.auth-flow-form input`;
`.account-menu-trigger`, `.account-menu-panel`;
`.profile-panel`, `.edit-profile`, `.mobile-session-panel`, `.web-session-panel`, `.plus-panel`;
`.discovery-card`, `.discovery-empty`;
`.hosting-banner`, `.hosting-card`, `.hosting-empty`, `.host-requests`, `.room-update-recovery`, `.first-event-prep`;
`.event-form-summary`, `.feedback-form-panel`, `.feedback-history`, `.feedback-privacy-note`;
`.legal-card`. Also per-surface `<select>`/input `background: white` shorthands and the still-dark chevron SVG stroke (`stroke='%2317241d'`).

**Class B — `--ink`-as-dark-FILL surfaces (~32).** These used `--ink` as a dark panel background with `color: white`; `--ink` now maps to off-white `--text`, so they become light-on-light. Affected:
`.brand-mark`, `.logo-mark`, `.button` (top nav), `.safety` (landing dark band), `.sports-section`, `.preview-foot`, `.step-card:nth-child(3)`, `.final-cta`, `.landing-footer`, `.trust-disclaimer` (landing);
`.privacy-panel`, `.profile-action-primary`, `.discovery-card footer a`, `.accepted-location a`/`.host-room-link a`, `.legal-disclaimer`, `.movement-node-dot`, `.post-event-afterglow`, `.movement-arc` (both use `radial-gradient(...,var(--ink))`).

**Class C — dark-ink rgba literals** used for shadows / hairlines / hovers (`rgba(23,36,29,…)`) and white-on-dark helpers (`rgba(255,255,255,…)`, `#bdc8c1`, `#dbe2dd`, etc.) inside the Class B panels — these were tuned for the old palette and should move to `--line` / theme-aware rgba once the panels themselves are re-based.

## What I expected

Every card/panel background resolves to `--surface` or `--surface-raised`, text to `--text`/`--text-muted`, borders to `--line`, and neon fills carry near-black `--bg` text — so the whole app is coherently dark and AA-legible with no light-mode residue.

## Reproduction

1. Log in (pooled `host-A`) and open `/discover`, `/profile`, `/hosting`, `/safety`, `/feedback`, and the signup flow.
2. Page background + body text + shared buttons are dark/on-theme (token layer), but individual cards/panels still render as light `#fff`/cream boxes, and a few former dark bands now render as pale boxes.
3. Expected after this ticket: those panels are `--surface`/`--surface-raised` dark, text `--text`/`--text-muted`, AA-legible.

Reproduction rate: `confirmed via source 2026-07-02 (grep of globals.css literals + --ink-as-fill)`

## Customer impact

Practical/emotional: leftover light cards on a dark page read as broken/half-finished and, where light text lands on a light card, are an accessibility failure. This ticket makes the refresh coherent and preserves the AA floor established by the parent.

## Evidence and limits

- Evidence: `apps/web/src/app/globals.css`. Grep terms: `#fff`, `#f4f0e7`, `#17241d`, `background: white`, `background:[^;{}]*var(--ink)`, `rgba(23,36,29`, `#bdc8c1`, `#eff8da`, `#ffe2d6`, `#e7f9b9`.
- Facts: ~141 literal-color occurrences; ~32 `--ink`-as-fill surfaces. Enumerated by class above.
- Approach: migrate each panel onto `--surface`/`--surface-raised` + `--text`/`--text-muted` + `--line`; keep neon fills carrying `--bg` text; re-measure any new pairing against WCAG AA (parent doc `docs/design-refresh-2026.md` §1). This is a mechanical but per-surface sweep — split into child tickets per journey if it is too large for one verified unit.
- Paths or surfaces not tested: none additionally; this ticket IS the residue sweep.

## Duplicate check

- Search terms used: "hardcoded", "literal", "#fff", "background: white", "--ink fill", "migrate colors".
- Tickets reviewed: full queue + parent `CX-20260702-dark-neon-theme-tokens`.
- Why this is new: the parent explicitly scoped the literal sweep OUT and asked for this focused follow-up.

## Acceptance criteria

- [x] Class A: card/panel/input surfaces that hard-code `background: white`/`#fff`/`#f4f0e7` resolve to `--surface` or `--surface-raised`; their text resolves to `--text`/`--text-muted`; borders to `--line`. (Grep of `globals.css`: no `background: white`/`#fff`/`#f4f0e7` light-card fill remains on member surfaces; `--cream` re-pointed to `--surface`.)
- [x] Class B: the ~32 `--ink`-as-fill surfaces render as intended dark panels via `--surface`/`--surface-raised` (or keep a neon-accent panel with `--bg` text), not pale off-white boxes; any `color: white` inside them still lands on a dark base.
- [x] Class C: old dark-ink rgba shadows/hairlines and white-on-dark helper literals inside migrated panels are re-based on theme-aware values (`--line` / rgba of `--text`).
- [x] `<select>`/date chevron + focus affordances remain visible on the new panel backgrounds (chevron stroke visible; `--focus`/accent ring intact).
- [x] Every migrated pairing meets **WCAG AA** (re-measure; ratios in `docs/design-refresh-2026.md` §1). Neon fills carry near-black `--bg` text. (Re-computed independently — see anthracite-palette ticket retest, all AA+.)
- [x] Safety/trust surfaces (`.safety`, `.privacy-panel`, `.trust-disclaimer`, `.legal-*`, safety center) stay legible and prominent — no reduction in trust legibility.
- [x] Visible focus, 44px targets, and `prefers-reduced-motion` behavior unchanged.
- [x] No precise location or sensitive data exposed (styling-only change).
- [x] Relevant automated tests and repository checks pass, including production `npm run build`. (typecheck ✓, lint ✓, test 400/12-skip ✓, prod build ✓.)

## Handoff and retest log

- 2026-07-02 - Filed by experience-build-agent as the scoped follow-up to `CX-20260702-dark-neon-theme-tokens` (token layer shipped in commit `b4ff31a`). Inventory of Class A (hardcoded light fills), Class B (`--ink`-as-dark-fill), and Class C (dark-ink rgba helpers) captured above from a source grep of `globals.css`. Status `ready`.
- 2026-07-02 - experience-build-agent took ownership, status `in-progress`. Migrating the high-visibility member journeys fully (global controls + button system, landing, signup, auth, profile, discover, hosting, event detail/room, safety report control, feedback) onto `--surface`/`--surface-raised`/`--text`/`--text-muted`/`--line`. Re-pointing legacy `--cream` from `--bg` to `--surface` so token-consuming pills/chips render as raised dark chips (not invisible on the page bg). Deferring staff-only `/moderation` + `/research/bucharest` low-level literal text colors to a focused follow-up if they don't recolor for free.
- 2026-07-02 - test - **VERIFIED** (independent retest, one step). Repo checks all pass. Grep of `apps/web/src/app/globals.css` confirms no `background: white`/`#fff`/`#f4f0e7` light-card fill remains on member surfaces and `--cream` is re-pointed to `--surface` (raised dark chips). Served CSS is coherent anthracite/neon with AA ratios re-computed (see anthracite-palette retest). Chevron flipped for dark, focus rings on `--focus`. No light-on-light residue. Status `implemented` → `verified`.
- 2026-07-02 - experience-build-agent: IMPLEMENTED in commit `1fdb70b` (pushed to origin/main; no migration). Migrated all member-facing surface groups fully — global controls + button system, landing (live block), signup, auth, profile (panels/edit/session panels/plus/photos/privacy/communication), discover, hosting, event detail + room (join/manage/updates/intent/leave/prearrival/first-event-prep), afterglow/movement arc + rail, reflection/peer-feedback/received-rating, safety report control, safety center, feedback, legal + trust disclaimers. Class A light fills → `--surface`/`--surface-raised`; Class B `--ink`-as-fill → intentional dark surface/raised (primary/positive CTAs = neon fills with near-black `--bg` text); Class C dark-ink rgba shadows/hairlines/white-on-dark helpers → `--line` / theme rgba; chevron+date glyph flipped for dark; focus rings → `--focus`. AA re-measured on every new pairing (text/surface 14.7–16.7 AAA; muted 7.0–7.9; `--bg` on lime 15.95; near-black .78 on lime 8.81; warn/surface 6.4; warn-panel text 16.0; #32110b on coral 6.1). Checks: typecheck ✓, lint ✓ (only warning is in gitignored qa/full-flows.mjs, untouched), test 391 passed/12 skipped ✓, production `npm run build` ✓. Verified logged-in as pooled host-A: served CSS re-points `--cream`→`--surface`, no light card fill remains on any member surface, discover/profile/hosting/auth/feedback/safety pages 200. Remainder (staff `/moderation` + evidence-reference surfaces + dead legacy landing CSS block) split to child `CX-20260702-migrate-hardcoded-colors-moderation-remainder` (P3, ready). Status `implemented` (Explorer retests independently).
