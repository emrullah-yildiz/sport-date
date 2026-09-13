# KeepItUp: Less small talk. More good company.

Interactive concept and project evaluation, 14 September 2026.

**Owner-approved follow-up:** the concept is now applied to the main `/landing` page (also reached from `/`). The production presentation adapts actions to the current session and retains the interactive example, beta disclosure, legal links and feedback destinations. Shared implementation lives in `apps/web/src/components/landing/`; `/concept` remains a noindex preview of that presentation. This promotion is committed locally, not deployed. The original design-evaluation scope and evidence below describe the preceding concept cycle.

## Open the concept

Run `npm run dev:web` from the repository root, then open <http://localhost:3000/concept>. The preview uses the existing KeepItUp identity. It is a proposed experience, separate from the current landing and signed-in product. No production deployment is part of this work.

## Product judgment

The product has a strong reason to exist: a shared activity makes meeting someone easier. Its implemented event, request, approval, coordination, cancellation and safety flows provide more substance than the first impression conveys. The greatest opportunity is helping someone understand and try that core loop before creating a profile.

The existing landing explains the proposition in text, but its static event preview resembles live inventory. Ten-step signup and a filter-heavy discovery page introduce work early. The optional tap game adds playfulness without demonstrating how people actually meet. These are design findings, not measured conversion claims.

## The direction

**Meet people for dating, friendship, or a new crew through small local sports activities.**

A bold headline leads into an illustrated court and a tangible invitation. Choose an activity and intention; inspect the sample plan; try requesting a place; see why the host must review it; deliberately simulate acceptance. The fictional meeting point appears only in that accepted demo state. Change your choice or cancel to start again.

The visual direction retains charcoal surfaces, green actions and blue information. Court markings, a ball, player tokens and short transitions supply personality. The interactions teach the product; there are no points, streaks, urgency counters or incentives to keep playing.

Three specialists worked in parallel on UX evaluation, concept strategy, and implementation. The primary agent integrated their findings and performed browser verification. Their documents are complementary:

- [UX audit](2026-09-14-ux-audit.md): source evidence and prioritized problems.
- [Concept strategy](2026-09-14-concept-strategy.md): journey, recovery states, accessibility and proposed user-study criteria. Alternate copy in that exploration is not a second implemented design.
- `apps/web/src/app/concept/`: the working route, scoped styles, local demo model and regression tests.
- `apps/web/qa/design-concept.mjs`: repeatable local browser checks; screenshots go to the ignored `apps/web/qa/artifacts/` directory.

## Scope and privacy

Every invitation, host, place, price and acceptance in the preview is illustrative. Demo choices stay in component memory; no requests, messages or profile preferences are submitted. Refresh resets the example. This client-side teaching example must never be used as real authorization: existing server-side event-room gates remain authoritative for actual data.

The real signup and discovery links explicitly leave the demonstration. Discovery requires signing in. No real member portraits, event supply, testimonials, verification claims or selected launch geography are used. The route requests no indexing and is not added to the sitemap; this is crawl guidance, not access control.

## What follows

Use the concept for a short comprehension test with unfamiliar adults: can they explain what the app is, that a host decides, and when the meeting point becomes available? Targets in the strategy are proposed; no participant research has been performed in this cycle.

After review, carry the direction into the actual landing, simplify discovery, and make signup establish purpose before optional intimate profile enrichment. Preserve all adult, consent, compatibility and authorization rules while doing so. Full production journeys remain future implementation, with edge states already specified in the strategy.

## Verification

- Web suite: **1,173 passed, 14 skipped**, using `npm run test --workspace @sport-date/web -- --maxWorkers=4`. Database integration suites remain opt-in. The first unrestricted run exposed six stale July-date test failures and a login timeout under contention. Both event route test files now freeze only `Date` to their fixture period and restore it after each test; all nine focused tests pass. Login passed independently and in the final bounded-worker suite. Production event rules were unchanged.
- Web type check, scoped concept ESLint and production build passed. `/concept` is statically generated. The build is local, not a deployment.
- Local Chromium browser harness passed: activity/intention selection, explicit request/review/acceptance, cancellation, leaving, selection reset, pre-acceptance absence of meeting details, no demo API mutations, no storage changes from selections, no runtime errors, and noindex metadata.
- Visually inspected desktop and phone screenshots; overflow checks passed at 320, 390, 768 and 1440 pixels. A 200% CSS zoom reflow check passed. Reduced-motion keyboard completion preserves primary-button focus; cancelling restores it. The skip link is concealed until focused. Core explanation and signup links render with JavaScript disabled.
- Screenshots remain in local ignored QA artifacts. This is automated and visual review, not a full assistive-technology audit or user study. Exact-location checks cover fictional rendered demo content, not a new production authorization mechanism.
