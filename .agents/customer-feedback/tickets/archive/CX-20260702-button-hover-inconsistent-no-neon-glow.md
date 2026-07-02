# CX-20260702-button-hover-inconsistent-no-neon-glow

- Status: `verified`
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
- 2026-07-02 - Implemented (Builder). Added three shared glow tokens in `:root` next to `--shadow*` in `apps/web/src/app/globals.css`: `--glow-accent` = `0 0 0 1px rgba(59,234,126,.55), 0 6px 22px rgba(59,234,126,.38)` (GREEN); `--glow-info` = `0 0 0 1px rgba(67,198,245,.55), 0 6px 22px rgba(67,198,245,.38)` (BLUE); `--glow-danger` = `0 0 0 1px rgba(255,110,104,.55), 0 6px 22px rgba(255,110,104,.38)` (RED) — a crisp neon ring + soft outer bloom, decorative box-shadow only.
  Button selectors now glowing GREEN (`--glow-accent`, primary/positive/neutral): `.btn--primary`, `.btn--accent`, `.btn--secondary`, `.btn--ghost`, `.btn-primary`, `.btn-secondary`, `.sport-card`, `.seeking-card`, `.custom-sport-tag`, `.custom-sport-add`, `.account-menu-trigger`, `.account-menu-item` (non-signout), `.term-explainer-trigger`, `.profile-empty-action`, `.profile-action-secondary`, `.profile-action-primary`, `.nav-host-cta`, `.profile-photo-btn`, `.profile-logout`, `.plus-upgrade`, `.plus-manage`, `.discover-broaden` (+`.use-my-location` control button, which uses `.discover-broaden`), `.discover-filters button`, `.event-publish`, `.privacy-action`, `.add-sport`, `.remove-sport`, `.host-decision button`, `.moderation-case-form button`, `.moderation-queue …footer a`, `.evidence-reference-form button`, `.event-reflection button`, `.peer-feedback-target button`, `.safety-appeal button`, `.room-chat-composer button`, `.room-intent-actions button`, `.room-chat-report-close`, `.event-detail-manage-primary`, `.received-rating-action`, `.room-people-empty-primary`, `.prearrival-brief-dismiss`, `.host-principles > a`, `.host-guidance a`, `.host-published-actions a`, `.accepted-location a`, `.host-room-link a`, `.movement-empty a`, `.feedback-confirmation-link` + `.feedback-confirmation-link--quiet`, `.feedback-form > button`, `.feedback-history-state button`, `.post-event-afterglow-reflect`/`-discover`, and the host-request/room-person profile link-buttons (`.host-request-profile-link`, `.room-person-profile-link` — replaced the old underline-thickness hover with the glow, per ticket).
  Glowing BLUE (`--glow-info`, info/nav): `.primary-nav-link`, `.safety-guidance-link`, `.room-people-empty .share-event-button`, `.room-chat-retry button`.
  Glowing RED (`--glow-danger`, destructive): `.account-menu-item-signout`, `.profile-photo-btn-danger`, `.danger-action`, `.host-cancel-card button`, `.room-leave-card button`, `.room-chat-report button[type=submit]`, `.safety-quick-action button`, `.safety-controls form > button`, `.mobile-device-list button`, `.mobile-session-panel > button`, `.web-session-list button`.
  Reduced-motion: glow REMAINS; only the translate/lift is dropped (existing `.btn`/`.btn-primary`/`.btn-secondary`/`.plus-*` reduced-motion rules extended to cover `.btn-secondary`). Disabled: no glow and no lift (`.btn:disabled(:hover)`, per-surface `:not(:disabled)` guards, `.sport-card:disabled:hover`, `.discover-broaden[disabled]:hover`, `.account-menu-item:disabled:hover`, plus a foot-of-block `button:disabled:hover / button[disabled]:hover { box-shadow: none }` catch-all). All existing `:focus-visible` rings untouched.
  Deliberately left as prose-link underline (NOT buttons): `.landing-footer nav a`, `.site-footer-legal a`, `.nav-links a` (landing marketing nav), `.safety-honest a`, `.safety-case-empty p a`, `.legal-disclaimer a`, `.terms a`, `.auth-switch a`, `.privacy-inline-note a`, `.discover-plus-link`, `.auth-link-button`, `.post-event-afterglow-host`, `.event-detail-manage-actions a:not(.…-primary)`, prearrival/first-event-prep inline links, `.member-profile-safety a`, `.feedback-safety-route a`. `src/app/global-error.tsx` is a self-contained last-resort fallback that does NOT load globals.css (can't consume tokens) — left as-is; `research/bucharest` preview button is a disabled mock — no glow.
  Checks: typecheck PASS, lint PASS (0 errors; 2 pre-existing warnings in unrelated files), unit tests 525 passed / 12 skipped, prod build PASS. Live-checked on dev http://localhost:3000 — served CSS confirmed the tokens + hover rules for primary CTA (green), nav link (blue), sign-out (red), profile-photo button (green). No migration. Commit `d1ae032`.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD). 3 glow tokens in :root (green/blue/red); `var(--glow-*)` applied to 29 button/CTA hovers with correct semantic colour mapping; reduced-motion drops only transform/transition (box-shadow/glow PERSISTS); disabled buttons no glow (per-surface guards + `button:disabled:hover{box-shadow:none}` catch-all); all 43 `:focus-visible` rings intact; prose/footer inline links still underline; no hardcoded glow hex (tokens only); no layout shift; AA unaffected. Checks the Tester ran itself: typecheck PASS, lint PASS, build PASS, tests pass (one unrelated stripe-server-only test hit vitest's 5s timeout under cold-worktree parallel I/O → re-ran in isolation 2 passed; not a regression, touches neither ticket). Follow-up: the discover empty-state bare-link buttons (`.discovery-empty a`) were a coverage gap not in this pass — fixed separately in `2c81e3c` (glow + equal-height). Orchestrator applied `verified` in main tree and archived.
