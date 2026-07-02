# CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring

- Status: `implemented`
- Severity: `low`
- Priority: `P2` — a single, prominent host CTA on the "It's live" success panel violates the owner's app-wide "every button glows on hover, always" mandate (CX-20260702-button-hover-inconsistent-no-neon-glow), and additionally has NO visible focus ring — a keyboard/accessibility gap on the exact button a host reaches to share their new event. Low reach (host, post-publish, hover/keyboard only) keeps it below P1, but it is a clear, checkable break in a standard the owner just had fixed.
- Customer journey: Host — create + publish an event → success ("It's live") panel → Copy invitation link
- Surface: `web` — `apps/web/src/app/globals.css` (`.share-event-button`), rendered by `apps/web/src/components/ShareEventLink.tsx` inside `apps/web/src/app/events/[eventId]/page.tsx` (`.host-published` success panel)
- Environment and viewport/device: dev http://localhost:3000, Chromium, reduced-motion; observed at 1280 and 375
- Found by: user-sim (host journey, 2026-07-02)
- Related tickets: `CX-20260702-button-hover-inconsistent-no-neon-glow` (archived/verified — established the app-wide glow standard but scoped the share button's glow ONLY to the event-room empty state, leaving the success-panel instance uncovered); `CX-20260701-view-public-invitation-404s-for-host-own-event` (archived — sibling success-panel CTA, different issue)

## Customer outcome

As a host who just published an event, when I move my mouse over — or tab to — the "Copy invitation link" button on the "It's live" success panel, I want the same neon-glow hover and a visible focus ring that every other button in the app now shows, so the button clearly reads as interactive and I can operate it confidently by keyboard.

## What I observed

On the just-published success panel (`/events/{id}?published=1`), three CTAs appear: "View the public invitation" and "Manage your events" (solid dark buttons on the green panel) and "Copy invitation link" (a transparent, thin-outlined button). Measured live via computed style, the "Copy invitation link" button has `box-shadow: none` at rest and — unlike the other two host CTAs — gains **no glow on hover** and shows **no `:focus-visible` ring** when tabbed to.

Root cause (confirmed in source): `.share-event-button` has only a base rule in `globals.css`. The hover glow and focus ring were added by the app-wide glow fix ONLY under a scoped selector — `.room-people-empty .share-event-button:hover { box-shadow: var(--glow-info) }` and `.room-people-empty .share-event-button:focus-visible { outline: 3px solid var(--focus) }`. The identical `ShareEventLink` button rendered on the `.host-published` success panel is not inside `.room-people-empty`, so it inherits neither treatment.

Reproduced 2/2 (1280 and 375). No console/page/5xx errors anywhere in the host flow.

## What I expected

Every button-styled CTA glows on hover with the correct semantic role colour (blue for this info/share action, consistent with the room instance) and has a visible focus ring, per the owner's standard. The success-panel "Copy invitation link" button should match the event-room instance exactly.

## Reproduction

1. Log in as a host and publish an event (or open an owned event at `/events/{id}?published=1`).
2. On the green "It's live" panel, hover the "Copy invitation link" button — no neon glow appears (the two neighbouring CTAs do glow).
3. Tab to the same button with the keyboard — no visible focus ring appears.

Reproduction rate: `2/2 safe attempts`

## Customer impact

Cosmetic-plus-accessibility: the button still works (copies the approximate-only link), but it is the one host CTA that breaks the interface's now-consistent hover language, so it reads as weaker/ghosted next to its neighbours, and keyboard users get no focus indication on it. Accessibility (focus visibility) is involved. No authorization, privacy, safety, or data-loss concern — the copied link remains approximate-area only.

## Evidence and limits

- Evidence: computed style on the success-panel button = `background: rgba(0,0,0,0)`, `box-shadow: none`; source shows glow/focus scoped to `.room-people-empty .share-event-button` only; full-page screenshots at 1280 and 375 show the transparent-outline button as the visibly weakest of the three CTAs.
- Redactions made: event id and host identity omitted; no tokens/credentials.
- Facts: the neighbouring `.host-published-actions a` CTAs DO glow (they are covered by the consolidated glow block); this button is not.
- Hypotheses to verify during implementation: none — root cause is confirmed in source (missing unscoped hover/focus rule).
- Paths or surfaces not tested: the share button's copy/clipboard behaviour itself (works; out of scope for this styling ticket).

## Duplicate check

- Search terms used: `share-event-button`, `Copy invitation link`, `ShareEventLink`, `share.event`, `glow`, `hover` across active + archived tickets.
- Tickets reviewed: `CX-20260702-button-hover-inconsistent-no-neon-glow` (archived/verified), `CX-20260701-event-room-host-zero-participants-cold-empty-state`, `CX-20260701-host-accept-decline-hard-reload-no-confirmation`, `CX-20260701-shareable-branded-motivational-card`, `CX-20260701-view-public-invitation-404s-for-host-own-event`.
- Why this is new: the verified glow ticket explicitly added the glow/focus ONLY to `.room-people-empty .share-event-button` (the event-room empty-state instance). The SECOND render site of the same component — the just-published success panel — was not covered and is a residual gap in that standard, not a re-report of it.

## Acceptance criteria

- [ ] The "Copy invitation link" button on the "It's live" success panel shows the neon glow on hover (blue/info `--glow-info`, matching the event-room instance and the button's info/share role) — no button on this panel is "no change" on hover.
- [ ] The same button shows a visible `:focus-visible` ring when reached by keyboard.
- [ ] Glow uses the shared `--glow-*` tokens (no new hardcoded colour); the treatment is applied so BOTH render sites (event-room empty state and success panel) stay consistent and cannot drift apart again (e.g. an unscoped `.share-event-button` rule rather than two scoped copies).
- [ ] Glow persists under `prefers-reduced-motion`; disabled state (if any) shows no glow.
- [ ] AA is unaffected (decorative box-shadow only); no layout shift or overflow at 375 and 1280.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (host journey pass); status `ready`.
- 2026-07-02 - Implemented (build agent). Moved the hover glow + `:focus-visible` ring onto the `.share-event-button` class itself (unscoped) in `apps/web/src/app/globals.css`, replacing the previously `.room-people-empty`-scoped-only rule, so BOTH render sites now share one source of truth and cannot drift apart: the `.host-published` "It's live" success panel (`events/[eventId]/page.tsx`) and the `.room-people-empty` event-room empty state (`events/[eventId]/room/page.tsx`) — the only two `ShareEventLink`/`.share-event-button` render sites (grep-confirmed). Hover uses shared `box-shadow: var(--glow-accent)`; focus uses `outline: 3px solid var(--focus); outline-offset: 2px`, matching the app's other CTAs. Glow-only (no transform) so reduced-motion parity is preserved; disabled state shows no glow; kept the room instance's blue-tinted hover background. Tokens only, no hardcoded hex, AA unaffected (decorative box-shadow). Note: used `--glow-accent` (green primary CTA) per implementation directive rather than the ticket's originally-suggested `--glow-info` (blue). Checks (apps/web): typecheck pass, lint pass (pre-existing warnings only), unit tests 532 pass / 12 skip, production build pass. Commit `a9159ad`, pushed to origin/main. Ready for independent retest.
