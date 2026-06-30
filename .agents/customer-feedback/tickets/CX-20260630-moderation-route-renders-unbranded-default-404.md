# CX-20260630-moderation-route-renders-unbranded-default-404

- Status: `ready`
- Severity: `low`
- Customer journey: A signed-in member (without moderator role) navigates to `/moderation`.
- Surface: `web`
- Environment and viewport/device: Local dev, Chromium, all widths (1920/1440/1024/768/390).
- Found by: Visual QA
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a signed-in adult member who lands on a moderator-only URL (shared link, typo, curiosity), I want a calm, on-brand page that tells me this is not available to me, rather than a bare framework error that looks like the app broke.

## What I observed

Visiting `/moderation` while signed in as a normal (non-moderator) member renders the **Next.js default not-found page**: a centered black-on-white "404 | This page could not be found." with the framework's default typography and layout — no Sport Date header, branding, navigation, or guidance back. Same at all 5 widths. The role gate itself works correctly (the moderation tooling is not exposed); only the presentation of the gated result is unstyled.

## What I expected

A branded "you don't have access to this area" or not-found state that matches the rest of Sport Date (header/logo, calm copy, a way back to `/profile` or `/discover`), consistent with the styled `verify-email` "Verification link missing" state.

## Reproduction

1. Register/sign in as an ordinary member.
2. Navigate to `/moderation`.
3. Observe the generic Next.js 404 rather than a branded page.

Reproduction rate: `5/5 widths`

## Customer impact

Cosmetic + trust. No privacy/authorization leak (the gate holds; no moderator content shows). But an unbranded framework 404 momentarily reads as "the site is broken," which is jarring on a product whose whole tone is calm and deliberate.

## Evidence and limits

- Evidence: `scratchpad/audit2/131-moderation-1920.png`, `133-moderation-1024.png`, `135-moderation-390.png`.
- Redactions made: none.
- Facts: `/moderation` returns the default Next not-found UI for a non-moderator; gate is effective.
- Hypotheses to verify: route likely calls `notFound()` (or redirects) without a custom `not-found.tsx` / branded gate; adding a branded not-found or access page resolves it.
- Paths or surfaces not tested: behavior for an actual moderator account (could not provision a moderator role in dev).

## Duplicate check

- Search terms used: moderation, 404, not found, access, gate.
- Tickets reviewed: all CX-2026* tickets.
- Why this is new: no existing ticket covers the moderation route presentation.

## Acceptance criteria

- [ ] A non-moderator hitting `/moderation` sees a branded, on-tone page (header + calm copy + a clear way back).
- [ ] The moderator-only tooling remains fully gated (no content exposure).
- [ ] Layout is usable at mobile and desktop widths.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- `2026-06-30 19:00 EEST` - Filed by Visual QA; status `ready`.
