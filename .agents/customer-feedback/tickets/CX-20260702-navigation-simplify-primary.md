# CX-20260702-navigation-simplify-primary

- Status: `implemented`
- Severity: `low`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 4) / Effort 3 = 16. Fewer, clearer primary destinations directly addresses "hard to navigate," but depends on the IA consolidation landing first (so the nav has the right set to point at), so it sits at P2 just behind that ticket. Broad reach, real clarity impact, moderate effort.
- Customer journey: cross-cutting — every authenticated surface's navigation
- Surface: `web` (desktop + mobile)
- Environment and viewport/device: dev server localhost:3000, all widths; per-page nav (e.g. `.profile-nav`) + `apps/web/src/components/AccountMenu.tsx`
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md` §3
- Implementation owner: `experience-build-agent (Rally)`
- Related tickets: `CX-20260702-ia-consolidate-guideline-and-legal-pages` (P1, land first — supplies the consolidated destinations), `CX-20260702-dark-neon-theme-tokens`

## Customer outcome

As a member, I want a small, consistent set of primary destinations that reads the same on every screen, so that I always know where I am and how to get to Discover, my events, safety, and my account without hunting.

## What I observed

In-app navigation is defined per-page (e.g. `.profile-nav` in `discover/page.tsx` renders links to `/hosting` "Your events", `/events/new` "Host an event", and `AccountMenu`), so the primary destinations aren't a single shared, consistent bar, and legal/guideline links have historically leaked into various headers.

## What I expected

A single, consistent primary nav with at most four destinations — **Discover**, **Host** (your events + create entry), **Safety**, and the **Account menu** (Profile, Switch account, Sign out) — with Feedback and Legal & trust living in the account menu or footer, and progressive disclosure for detail. Per `docs/design-refresh-2026.md` §3.

## Reproduction

1. Move between `/discover`, `/profile`, `/hosting`.
2. Note nav is assembled per page rather than from one shared, consistent primary set.

Reproduction rate: `confirmed via source 2026-07-02 (.profile-nav defined per page)`

## Customer impact

Practical/emotional: a stable, minimal nav lowers cognitive load and makes the app feel simpler and more trustworthy. No auth/privacy/data-loss dimension; accessibility must be maintained (keyboard, focus, current-page indication).

## Evidence and limits

- Evidence: `apps/web/src/app/discover/page.tsx` line ~35 (`.profile-nav` with `/hosting`, `/events/new`, `AccountMenu`); `AccountMenu.tsx` (profile / switch account / sign out).
- Redactions made: none.
- Facts: nav is per-page; `AccountMenu` already provides a keyboard-operable account affordance with focus management and Escape handling.
- Hypotheses to verify during implementation: whether a shared nav component should be introduced (vs. keeping per-page but standardizing the link set); which surfaces currently show extra links that should move to footer/account menu.
- Paths or surfaces not tested: exhaustive per-surface nav audit owed at implementation.

## Duplicate check

- Search terms used: "profile-nav", "nav-links", "AccountMenu", "primary nav".
- Tickets reviewed: full queue; IA consolidation ticket is the pair, not a duplicate (that one moves pages; this one shapes the nav that points at them).
- Why this is new: first ticket standardizing the primary member nav to the refreshed 4-destination set.

## Acceptance criteria

- [ ] Primary member nav exposes at most four destinations: Discover, Host, Safety, Account menu — consistent across every authenticated surface.
- [ ] Feedback and Legal & trust are reachable from the account menu and/or footer, not the primary bar.
- [ ] `/moderation` never appears in member nav (staff-only).
- [ ] The current page/section is indicated for orientation; detail links use progressive disclosure rather than crowding the top level.
- [ ] Keyboard operation, screen-reader naming, visible focus (`--focus` on the black+neon theme), and 44px targets are correct; reduced-motion unaffected.
- [ ] No horizontal overflow at 1280 or 375; nav collapses cleanly on mobile.
- [ ] No precise location or sensitive data exposed.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by Design Lead (black+neon refresh). Depends on `CX-20260702-ia-consolidate-guideline-and-legal-pages` landing first. Status `ready`.
- 2026-07-02 - Picked up by experience-build-agent; set `in-progress`. Standardizing authenticated primary nav to a shared component (Discover, Host, Safety + AccountMenu).
- 2026-07-02 - Implemented (commit `89038dd`, pushed). New shared `apps/web/src/components/PrimaryNav.tsx` (nav landmark, logo→/discover, Discover/Host/Safety with aria-current, one page-action slot, AccountMenu) replaces the per-page `.profile-nav` on discover, discover event detail, hosting (+ loading/error), host event detail, create flow, room, profile, safety, feedback. Feedback moved into the AccountMenu (progressive disclosure); legal/trust stays in SiteFooter; `/moderation` staff-only untouched. Blue (`--accent-info`) nav links/active-state, green CTAs. Checks: typecheck/lint/test pass (400 pass/12 skip; AccountMenu.test updated for the new Feedback item), production `npm run build` pass. Verified logged in as pooled host-A: primary nav byte-identical across surfaces, aria-current correct, no legal/feedback in the top bar, no overflow at 375. Migration: none. Ready for independent retest.
