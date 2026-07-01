# CX-20260701-in-app-page-headers-off-scale-headline-systemic

- Status: `ready`
- Severity: `low`
- Priority: `P3 polish` — (Reach 5 × Impact 2 × Confidence 5) / Effort 2 = 25. Every signed-in member meets these headers on nearly every in-app surface (discover, hosting, safety, event detail, room, create, feedback, moderation), so Reach is high, but it is a visual-fidelity/consistency defect, not a functional, safety, privacy, auth, or accessibility floor — so P3. Cheap, token-driven fix. The `/profile` precedent (CX-20260701-profile-hero-off-scale-headline-demotes-member-name, verified) already established that in-app page h1s should sit on `--fs-h1`; this ticket finishes that reconciliation on the surfaces that were left behind.
- Customer journey: cross-cutting (every authenticated surface's page header) — coordination, trust, reflection
- Surface: `web` (desktop + mobile; shared CSS)
- Environment and viewport/device: dev server localhost:3000, all widths; `apps/web/src/app/globals.css`. Design tokens in `:root` (lines 20–24). Source-measured 2026-07-01; `/safety` confirmed rendering live (200, `.safety-center-header` h1 present).
- Found by: Experience & Design Explorer — safety-center × typography pass (2026-07-01)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-profile-hero-off-scale-headline-demotes-member-name` (verified — fixed the SAME off-scale headline pattern but ONLY on `/profile`, and also carried a name-demotion concern; this ticket covers the remaining in-app surfaces and is a consistency-only follow-up, not a duplicate), `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (ready — heading→subheading *spacing* rhythm, a different axis; complementary), `CX-20260630-signup-redundant-double-headline-weak-focal-point` (headline focal-point on the signup surface)

## Customer outcome

As a signed-in member moving between Sport Date's screens, I want the big page headings to feel like one consistent, calm, well-tuned type system, so that the product reads as trustworthy and considered rather than as a set of pages with slightly different, oversized display type.

## What I observed

The shared design system defines a heading-1 token `--fs-h1: clamp(36px, 5vw, 60px)` with the systemic tracking/leading used elsewhere (`-.02em` / `1.05`). But almost every **authenticated in-app** page header bypasses that token and hard-codes a larger, tighter bespoke value — `font-size: clamp(48px, 7vw, 82px)` (and near-identical `84/86/78px` variants), `line-height: .95`, `letter-spacing: -.065em`. So the same visual role (a page's h1) renders up to **82px** with much tighter tracking than the token intends, and the exact clamp differs slightly from surface to surface.

Surfaces carrying the off-scale header (source-located in `apps/web/src/app/globals.css`):

- `.safety-center-header h1` — "Your reports, without the black box." (line ~602) — `clamp(48px,7vw,82px)/-.065em/.95`
- `.hosting-header h1` (line ~569) — `clamp(48px,7vw,82px)/-.065em/.95`
- `.new-event-header h1, .host-event-hero h1` (line ~533) — `clamp(48px,7vw,86px)`
- `.discover-header h1` (line ~544) — `clamp(48px,7vw,84px)/-.065em`
- `.event-detail-hero h1` (line ~587) — `clamp(48px,7vw,82px)/-.065em`
- `.room-page` h1 (line ~594) — `clamp(48px,7vw,84px)/-.065em`
- `.moderation-header h1` (line ~604, staff-only) — `clamp(46px,7vw,78px)/-.065em`
- `.feedback-header h1` (line ~652) — `clamp(46px,7vw,78px)/.95/-.065em`

The `/profile` hero was already moved onto `--fs-h1` by CX-20260701-profile-hero-off-scale-headline-demotes-member-name (verified), so `/profile` is now the *only* in-app surface that matches the token — the reconciliation was started but not finished, and the sibling surfaces are visibly larger/tighter than the profile page a member just came from.

## What I expected

The page-level h1 on each in-app surface should use the shared `--fs-h1` token (and the systemic `-.02em` / `1.05` treatment), exactly as `/profile` now does, so the heading scale is consistent everywhere and future token changes propagate in one place. If the brand genuinely wants a larger *display* size for certain hero moments, that should be a named, reused token (e.g. a `--fs-display`) applied deliberately — not eight slightly-different one-off clamps. Marketing/landing display type is out of scope (a logged-out marketing hero may legitimately use a larger display scale); this ticket is about the authenticated in-app page headers.

## Reproduction

1. Log in as any member.
2. Visit `/profile` — note the page h1 sits on the shared scale (max 60px, -.02em).
3. Navigate to `/safety`, `/discover`, `/hosting`, an event detail page, `/events/new`, or `/feedback`.
4. Note the page h1 jumps to a larger, tighter bespoke size (up to ~82–86px, -.065em) — the same visual role rendered off the shared token, and inconsistent across these surfaces.

Reproduction rate: `confirmed via source 2026-07-01 (8 in-app selectors hard-code the off-scale clamp); /safety confirmed live 200 with the off-scale header class`

## Customer impact

Practical/emotional: inconsistent, oversized in-app headings make the product read as less polished and less considered — a subtle trust cost on safety-adjacent surfaces (the Safety Center header is one of the loudest offenders). No functional harm; a member can complete every journey. Not an authorization, privacy, safety, data-loss, or accessibility floor (contrast and heading semantics are unaffected — this is size/tracking only), so severity is honestly `low` / P3.

## Evidence and limits

- Evidence: `apps/web/src/app/globals.css` lines ~533, 544, 569, 587, 594, 602, 604, 652 (off-scale clamps) vs `:root` `--fs-h1` (line 20). `/safety` rendered live at 200 with `.safety-center-header` and the h1 text present.
- Redactions made: none needed (no credentials, PII, precise location, or report narratives involved).
- Facts: the listed selectors hard-code `clamp(48px,7vw,82px)`-class values with `-.065em`/`.95`; `--fs-h1` is `clamp(36px,5vw,60px)`; `/profile` already uses `--fs-h1` (`.profile-hero h1`, line ~473).
- Hypotheses to verify during implementation: whether any surface intentionally wants a distinct display size (if so, define one shared `--fs-display` token rather than per-surface clamps); whether reduced-motion / responsive behavior needs any change (expected: none — this is static type sizing).
- Paths or surfaces not tested live this pass: `/discover`, `/hosting`, `/events/new`, event detail, room, `/feedback`, `/moderation` headers were source-located, not each rendered (the styling is shared and unambiguous). Live pixel measurement at 1280/375 owed at implementation/retest.

## Duplicate check

- Search terms used: "clamp(48px,7vw", "-.065em", "--fs-h1", "off-scale", "headline", "header h1".
- Tickets reviewed: full queue, especially the two typography/heading tickets. `profile-hero-off-scale-headline-demotes-member-name` is `verified` and scoped to `/profile` only (plus a name-demotion concern that does not apply to these surfaces). `heading-subheading-vertical-rhythm-insufficient-spacing` is about vertical *spacing* between heading and subheading, a different property.
- Why this is new: no ticket covers the remaining in-app surfaces still using the bespoke off-scale header; this is the systemic consistency follow-up the `/profile` fix implied but did not complete.

## Acceptance criteria

- [ ] Every authenticated in-app page header h1 (`/discover`, `/hosting`, `/safety`, `/events/new`, event detail, event room, `/feedback`, `/moderation`) uses the shared `--fs-h1` token and the systemic `-.02em` / `1.05` treatment — no per-surface bespoke `clamp(...)` for the page h1.
- [ ] If a larger display size is genuinely wanted for any hero, it is a single named, reused token (e.g. `--fs-display`), not multiple slightly-different one-off clamps.
- [ ] The page h1 on these surfaces is visually consistent with the already-fixed `/profile` hero at 1280px and 375px.
- [ ] No page introduces horizontal overflow at 1280 or 375 as a result of the change (long headings still wrap cleanly).
- [ ] Heading semantics (single h1, correct h1→h2 order), contrast, focus, and reduced-motion behavior are unchanged.
- [ ] No precise location or other sensitive data is exposed to an unauthorized person (styling-only change).
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (safety-center × typography pass); status `ready`. Systemic follow-up to the verified `/profile` hero fix; consistency-only, P3.
