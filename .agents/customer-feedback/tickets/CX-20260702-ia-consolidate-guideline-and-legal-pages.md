# CX-20260702-ia-consolidate-guideline-and-legal-pages

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — (Reach 4 × Impact 4 × Confidence 4) / Effort 4 = 16. Directly answers the owner's "too many guideline/staff pages, hard to navigate" complaint by cutting standalone info pages and grouping legal behind a compact footer. Broad reach, real clarity impact; effort is higher (route changes + redirects + content moves) so P1 at the top of the P1/P2 band. Can ship before or after nav-simplify; pairs with it.
- Customer journey: cross-cutting — trust, safety, hosting, legal discovery
- Surface: `web` (desktop + mobile)
- Environment and viewport/device: dev server localhost:3000, all widths; routes under `apps/web/src/app/`
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md` §3
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-navigation-simplify-primary` (P2, pairs), `CX-20260702-dark-neon-theme-tokens`, `CX-20260702-typography-right-size-and-scale`

## Customer outcome

As a member (and a cautious first-timer), I want a small, clear set of destinations with safety and legal information easy to find but not cluttering the main navigation, so that I can move through the app without wading through a pile of near-identical guideline pages.

## What I observed

~22 routes, several of which are thin info/guideline/staff pages: `/safety`, `/safety-guidelines`, `/hosting-guidelines`, `/privacy`, `/terms`, `/trust`, `/research/bucharest`, `/moderation`. Safety guidance is split between `/safety` and `/safety-guidelines`; hosting guidance sits on its own `/hosting-guidelines`; three legal pages stand alone; `/moderation` is staff-only but adds to the route sprawl.

## What I expected

Fewer top-level destinations, with guidance consolidated into the surface it belongs to (progressive disclosure) and legal grouped behind a compact footer, per `docs/design-refresh-2026.md` §3.

## Reproduction

1. Note `/safety` and `/safety-guidelines` are two separate destinations for one topic.
2. Note `/hosting-guidelines` is a standalone page rather than help within hosting.
3. Note `/privacy`, `/terms`, `/trust` are separate top-level routes.

Reproduction rate: `confirmed via source 2026-07-02 (routes present under apps/web/src/app/)`

## Customer impact

Practical: reduces navigation load and decision fatigue; makes safety and legal info easier to find, not harder. Trust/safety IS involved — the consolidation MUST keep safety and legal content legible and prominent (safety guidance stays on the Safety Center, clearly labeled; legal stays one click away in the footer). No content is deleted; it is relocated with redirects so shared links don't break.

## Plan (from `docs/design-refresh-2026.md` §3)

1. Merge `/safety-guidelines` into `/safety` as a progressively-disclosed "How safety works" / guidelines section; redirect `/safety-guidelines → /safety#guidelines`.
2. Fold `/hosting-guidelines` into a "Hosting standards" section within `/hosting` (or the create flow); redirect `/hosting-guidelines → /hosting#standards`.
3. Add a compact footer with a single **"Legal & trust"** grouping linking `/privacy`, `/terms`, `/trust`; remove them from primary nav. (Optional `/legal` index — not required.)
4. Keep `/moderation` staff-only and out of ALL member navigation and footer.
5. Keep `/research/bucharest` out of member nav; footer/vision link only. Bucharest stays a hypothesis, not a claim.

## Evidence and limits

- Evidence: routes at `apps/web/src/app/safety`, `safety-guidelines`, `hosting`, `hosting-guidelines`, `privacy`, `terms`, `trust`, `research/bucharest`, `moderation`. Legal pages share `.legal-*` CSS. In-app nav is currently per-page (e.g. `.profile-nav` in `discover/page.tsx`) plus `AccountMenu`.
- Redactions made: none.
- Facts: `/safety-guidelines` and `/hosting-guidelines` are standalone `page.tsx` files; the three legal pages are standalone.
- Hypotheses to verify during implementation: whether any in-app link points to the routes being merged (grep `safety-guidelines`, `hosting-guidelines`, `/privacy`, `/terms`, `/trust`) — update each to the new anchor; Next redirect mechanism to use (config vs route `redirect()`); whether `/moderation` has any accidental member-facing link.
- Paths or surfaces not tested: content-move fidelity (ensure no guideline copy is lost) owed at implementation.

## Duplicate check

- Search terms used: "safety-guidelines", "hosting-guidelines", "legal", "footer", "consolidate", "redirect".
- Tickets reviewed: full queue; no existing IA/consolidation ticket.
- Why this is new: first ticket acting on the owner's "too many guideline/staff pages" complaint per the refresh plan.

## Acceptance criteria

- [ ] `/safety-guidelines` content lives within `/safety` as a clearly-labeled, progressively-disclosed section; `/safety-guidelines` redirects to `/safety` (anchored). Safety guidance remains prominent and legible (not buried).
- [ ] `/hosting-guidelines` content lives within hosting as a "Hosting standards" section; `/hosting-guidelines` redirects to the hosting anchor.
- [ ] A compact footer groups `/privacy`, `/terms`, `/trust` under "Legal & trust"; these routes are removed from primary member nav. The honest-claims disclaimer is preserved.
- [ ] `/moderation` has no link in any member navigation or footer and remains staff-gated.
- [ ] All removed/merged routes redirect (no 404) so shared links and bookmarks resolve.
- [ ] Every in-app link that pointed to a merged route is updated to the new destination.
- [ ] Keyboard, screen-reader naming, focus, contrast (on the black+neon theme), and 44px targets are correct on the new footer and consolidated sections; reduced-motion unaffected.
- [ ] No precise location or sensitive data is exposed by the consolidation.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by Design Lead (black+neon refresh); IA plan in `docs/design-refresh-2026.md` §3. Status `ready`.
