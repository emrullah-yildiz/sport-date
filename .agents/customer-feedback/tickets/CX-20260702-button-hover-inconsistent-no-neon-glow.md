# CX-20260702-button-hover-inconsistent-no-neon-glow

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — OWNER-REPORTED directly (2026-07-02): "Hovering mouse on buttons is not creating neon light all the time. Sometimes it underlines the text, sometimes it does nothing. Use neon light effect for hovering on button all the time." A visible, systematic hover affordance is core to the anthracite+neon design language and affects every screen; owner-raised → P1.
- Customer journey: all (global button interaction)
- Surface: `web` — shared `apps/web/src/app/globals.css` (+ any component-local button styles)
- Environment and viewport/device: all widths, pointer devices
- Found by: Owner, direct report 2026-07-02

## Customer outcome

As anyone using Rally with a mouse, when I hover any button I want a consistent neon-light (glow) affordance every time, so the interface feels coherent and buttons clearly read as interactive — instead of the current mix where some buttons glow, some only shift border/background, some just underline their text, and some do nothing.

## What I observed (root cause)

Button hover states are defined ad-hoc across ~15 different classes in `globals.css` with no shared treatment:
- Glow today: `.btn--primary`/`.btn--accent` (`box-shadow` green), `.plus-upgrade`/`.plus-manage`.
- Border/background only (no glow): `.btn--secondary`, `.btn-secondary`, `.account-menu-trigger`, `.profile-action-secondary`, `.term-explainer-trigger`, `.profile-photo-btn`.
- Colour/text only or underline: `.btn--ghost` (colour), `.nav-links a` (colour), footer/link CTAs (`text-decoration: underline`), `.host-request-profile-link`/`.room-person-profile-link` (`text-decoration-thickness`).
- Nothing meaningful: several.

So hover affordance is inconsistent exactly as reported.

## What I expected

Every button and button-styled CTA shows a **neon glow on hover, always**, coloured by its semantic role per the palette contract (`globals.css` top): GREEN `--accent` for primary/positive, BLUE `--accent-2`/`--accent-info` for info/nav/links, RED `--warn` for destructive (e.g. sign-out). Implement as shared glow tokens (e.g. `--glow-accent`, `--glow-info`, `--glow-danger` = a crisp `0 0 0 1px` ring + a soft outer `box-shadow` in the role colour) applied uniformly to button hovers.

## Acceptance criteria

- [ ] Every interactive button and button-styled CTA in the app shows a neon glow on hover (box-shadow in the semantic role colour) — no button hover is "underline only" or "no change". Genuine inline text links inside prose/legal/footer may keep an underline, but anything presented as a button/CTA/pill/action glows.
- [ ] Glow colour follows the palette contract: green for primary/positive/default, blue for info/nav/link-style actions, red/`--warn` for destructive (sign-out). No off-palette colours; tokens only (no new hardcoded hex outside the token definitions).
- [ ] The glow is the consistent hover signal and is present even under `prefers-reduced-motion` (only the translate/lift is dropped for reduced-motion, the glow remains).
- [ ] `:focus-visible` rings are unchanged (accessibility preserved); disabled buttons show no glow (and no lift).
- [ ] AA is unaffected (glow is decorative, does not change text/background contrast); no layout shift or overflow at 375 and 1280 from the glow (use box-shadow, not layout-affecting properties).
- [ ] Consolidated via shared glow tokens so button hovers can't drift again; the `.btn*`, `.btn-primary/.btn-secondary`, `.plus-*`, `.profile-action*`, `.profile-empty-action`, `.account-menu-*`, `.profile-photo-btn`, `.custom-sport-tag`, `.sport-card`/`.seeking-card`, `.term-explainer-trigger`, and nav CTA button hovers all resolve to a glow.
- [ ] Relevant automated tests and repository checks pass incl. production build.

## Handoff and retest log

- 2026-07-02 - Filed from the owner's direct report; status `ready`, prioritised P1 above the remaining P2/P3 polish.
