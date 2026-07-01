# CX-20260702-typography-right-size-and-scale

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — (Reach 5 × Impact 3 × Confidence 5) / Effort 3 = 25. Every member meets these headings on nearly every surface; the "simple details too big" complaint is a direct owner ask. Broad reach, real polish/clarity impact, high confidence (source-located), moderate effort. Not a functional/safety floor → P1, not P0. Builds on the token layer (`CX-20260702-dark-neon-theme-tokens`) but is independently buildable against the current tokens too.
- Customer journey: cross-cutting (every surface's headings + meta)
- Surface: `web` (desktop + mobile; shared CSS)
- Environment and viewport/device: dev server localhost:3000, all widths; `apps/web/src/app/globals.css`
- Found by: Design Lead — black+neon refresh (2026-07-02); direction in `docs/design-refresh-2026.md` §2
- Implementation owner: `unassigned`
- Related tickets: **supersedes** `CX-20260701-in-app-page-headers-off-scale-headline-systemic` and `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (both folded in here — see those tickets' updated status notes); relates to `CX-20260630-signup-redundant-double-headline-weak-focal-point` (signup focal point), `CX-20260702-dark-neon-theme-tokens` (theme layer)

## Customer outcome

As a member moving between screens, I want headings that feel like one calm, well-tuned type system and "simple details" (labels, meta, statuses) sized like details — not like headlines — so that the product reads as considered and easy to scan rather than shouty and cluttered.

## What I observed

Two problems, both systemic in `globals.css`:

1. **12 bespoke off-scale headline rules** hard-code large, tight `clamp()` values instead of the shared `--fs-*` tokens. The same visual role (a page h1) renders from 78px to 92px with tracking as tight as `-.075em`, and differs surface to surface:
   - `.hero h1` (line ~139) — `clamp(54px,6.4vw,92px)/-.075em/.93` (landing, marketing)
   - `.steps h2, .safety h2` (line ~155) — `clamp(42px,5vw,70px)/-.06em/.98` (landing)
   - `.new-event-header h1, .host-event-hero h1` (line ~562) — `clamp(48px,7vw,86px)/-.068em/.94`
   - `.discover-header h1` (line ~574) — `clamp(48px,7vw,84px)/-.065em/.95`
   - `.hosting-header h1` (line ~599) — `clamp(48px,7vw,82px)/-.065em/.95`
   - `.event-detail-hero h1` (line ~618) — `clamp(48px,7vw,82px)/-.065em/.95`
   - `.room-hero h1` (line ~625) — `clamp(48px,7vw,84px)/-.065em/.95`
   - `.safety-center-header h1` (line ~635) — `clamp(48px,7vw,82px)/-.065em/.95`
   - `.moderation-header h1` (line ~637, staff) — `clamp(46px,7vw,78px)/-.065em/.95`
   - `.legal-hero h1` (line ~696) — `clamp(44px,7vw,78px)/-.06em/.95`
   - `.feedback-header h1` (line ~711) — `clamp(46px,7vw,78px)/-.065em/.95`
   - `.auth-card h1` (line ~447) — `clamp(34px,7vw,48px)/line-height:1/-.055em` (login/verify-email/reset-password/reset-confirm)

2. **Oversized "simple details."** Section sub-headings and labels are headline-sized where they are really labels: e.g. `.event-form-section h2`/`.privacy-panel h2` = `clamp(28px,4vw,44px)`, `.hosting-card h3` = 30px, `.accepted-location h2` = 38px, `.room-meeting h2` = 36px, plus `dt`/status/meta chips that shout. The owner's note: "simple details presented too big."

## What I expected

A single restrained scale, with every in-app page h1 on `--fs-h1`, only the logged-out marketing hero on a single named `--fs-display`, and "simple details" mapped down to `--fs-h3`/`--fs-small`/`--fs-label`. Heading→sub-text spacing driven by shared spacing tokens so rhythm is consistent across hero and panels.

## Reproduction

1. Visit `/discover`, `/hosting`, `/safety`, an event detail page, `/events/new`, `/feedback`, `/login`.
2. Note page h1s render up to 78–92px with tight tracking, varying per surface.
3. Note section labels/meta rendered at 28–44px where a small label would read better.

Reproduction rate: `confirmed via source 2026-07-02 (12 off-scale clamps + multiple oversized sub-heading rules located)`

## Customer impact

Practical/emotional: oversized, inconsistent type makes the product feel less polished and harder to scan — a subtle trust cost on safety-adjacent surfaces. No functional harm; not an auth/privacy/data-loss floor. Heading semantics and contrast are unaffected by size changes (contrast is handled by the token ticket), so severity is `medium` and priority P1 within the refresh.

## Target scale (from `docs/design-refresh-2026.md` §2)

```
--fs-display: clamp(40px, 5vw, 60px);   /* marketing hero ONLY */
--fs-h1:      clamp(30px, 3.4vw, 42px);  /* every in-app page header */
--fs-h2:      clamp(24px, 2.4vw, 30px);  /* section titles */
--fs-h3:      20px;   --fs-body: 16px;   --fs-small: 14px;   --fs-label: 12px;
```
Systemic heading treatment: `letter-spacing: -.02em; line-height: 1.1` (1.05 ok for `--fs-display`). Add spacing tokens (`--space-1..6`, `--space-heading-gap: 12px`) for consistent heading→sub-text rhythm.

## Evidence and limits

- Evidence: the 12 selectors above in `apps/web/src/app/globals.css`; oversized sub-heading rules at lines ~526, 564, 607, 618, 622, 625. `--fs-*` tokens at `:root` (lines ~18–24).
- Redactions made: none needed.
- Facts: the listed selectors hard-code the clamps/tracking shown; `/profile` was already moved onto `--fs-h1` by a prior verified ticket, so it is the reference for "correct."
- Hypotheses to verify during implementation: whether any long heading clips descenders at the tighter line-height (test `/login`, `/verify-email` at 375px); whether the marketing hero genuinely wants `--fs-display` (keep it, but as the single named token).
- Paths or surfaces not tested live this pass: each surface's headers were source-located; live pixel measurement at 1280/375 owed at retest.

## Duplicate check

- Search terms used: "clamp(48px,7vw", "-.065em", "--fs-h1", "off-scale", "headline", "font-size: clamp".
- Tickets reviewed: the two 2026-07-01 headline/spacing tickets. Both are folded into this ticket (this one covers the same 12 selectors PLUS the "simple details too big" axis PLUS the spacing rhythm) and marked superseded/cross-linked in their own files.
- Why this is new: it is the consolidated refresh-era typography ticket that supersedes the two narrower P3 tickets and adds the owner's "simple details too big" requirement.

## Acceptance criteria

- [ ] All 12 bespoke off-scale headline clamps are removed; every in-app page h1 uses `--fs-h1` with the systemic `-.02em`/`1.1` treatment — no per-surface `clamp()` for a page h1.
- [ ] `.auth-card h1` (login/verify-email/reset-password/reset-confirm) uses `--fs-h1`; long headings wrap cleanly with no clipped descenders at 375px.
- [ ] Only the logged-out marketing hero uses `--fs-display`, and it is the single named token (not a one-off clamp).
- [ ] "Simple details" are right-sized: section labels/eyebrows/statuses/`dt` use `--fs-label` or `--fs-small`; oversized sub-headings (`.event-form-section h2`, `.privacy-panel h2`, `.accepted-location h2`, `.room-meeting h2`, etc.) map to `--fs-h2`/`--fs-h3`. No label renders headline-sized.
- [ ] Heading → adjacent sub-text spacing uses a shared token/scale, consistent across hero and panels (absorbs the vertical-rhythm ticket).
- [ ] No surface introduces horizontal overflow at 1280 or 375 as a result.
- [ ] Heading semantics (single h1, correct h1→h2 order), contrast, focus, and reduced-motion behavior are unchanged.
- [ ] No precise location or sensitive data exposed (styling-only).
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by Design Lead (black+neon refresh). Supersedes the two 2026-07-01 headline/spacing tickets (marked accordingly). Adds the owner's "simple details too big" requirement. Status `ready`.
