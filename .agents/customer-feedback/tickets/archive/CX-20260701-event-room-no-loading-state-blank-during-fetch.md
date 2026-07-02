# CX-20260701-event-room-no-loading-state-blank-during-fetch

- Status: `verified`
- Severity: `low`
- Priority: `P3 polish` — (Reach 3 × Impact 2 × Confidence 5) / Effort 1 = 30 → bucketed P3 (a missing convenience/perceived-speed nicety on an already-authorized page, not a blocked task or a11y floor). Reach: every accepted member/host opening the coordination room. Impact 2: the page is an async RSC running 3 sequential DB queries (room + updates + participants), so on a cold/slow fetch the member sees the previous page frozen or a blank frame with no "loading" cue — mildly jarring at the post-commitment moment but the page does resolve. Confidence 5: the route has no `loading.tsx` (only `page.tsx`), unlike the sibling `/hosting` route which ships both `loading.tsx` and `error.tsx`. Effort 1: add a route-level `loading.tsx` skeleton mirroring the established `/hosting` pattern.
- Customer journey: coordination (arriving at the accepted-member room after commitment)
- Surface: `web` (mobile + desktop; route-level)
- Environment and viewport/device: `/events/{id}/room`, dev server localhost:3000. Derived from the route file list (`room/` contains only `page.tsx`) and the `getEventRoom` query shape; not timed live this pass.
- Found by: experience-design-explorer (events-room × completeness-of-states pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-no-web-surface-to-manage-hosted-events` (verified — established the `/hosting` `loading.tsx`/`error.tsx` skeleton pattern this ticket mirrors), `CX-20260701-event-room-stays-future-tense-after-event-ends` (same surface, copy/state not loading). No existing ticket covers the room's loading state.

## Customer outcome

As an accepted member (or host) opening the coordination room — often right after committing, sometimes on a slow connection — I want an immediate, calm "loading your room" cue instead of a blank or frozen frame, so I trust that my accepted meeting details are on their way rather than wondering if the page broke.

## What I observed

The room route directory `apps/web/src/app/events/[eventId]/room/` contains **only `page.tsx`** — there is no `loading.tsx`. `EventRoomPage` is an async server component that awaits `getCurrentUser()` then `getEventRoom()`, which itself runs **three sequential SQL queries** (the room row, the update notices, and the participants with their per-update receipts/intents). Until all of that resolves, Next.js has no route-level fallback to stream, so navigating into the room shows the prior page frozen (client nav) or an empty frame (hard load) with no skeleton or "loading" affordance.

By contrast the sibling `/hosting` route ships a proper `loading.tsx` — a branded skeleton (`.hosting-card.skeleton`) plus a `role="status"` "Loading your hosted events." announcement — establishing the in-repo pattern that the room route is missing. So the same product already knows how to do this well; the room just doesn't.

Not observed as broken: once resolved, the room renders correctly; this is purely the *perceived-speed / loading* state on the way in.

## What I expected

A route-level `loading.tsx` for the room that mirrors the `/hosting` pattern: the same nav + hero shell ("coordination room" eyebrow, a calm "Getting your room ready…" line), a lightweight skeleton for the meeting-point and people panels, and a `visually-hidden role="status"` announcement for assistive tech — reduced-motion-safe (no shimmer that violates `prefers-reduced-motion`), no layout shift when the real content swaps in.

## Reproduction

1. As an accepted member/host, navigate to `/events/{id}/room` (ideally on a throttled connection or cold cache).
2. Observe there is no loading skeleton/announcement during the async fetch — the prior page stays frozen or the frame is blank until all three queries resolve.
3. Compare with `/hosting`, which shows a skeleton + "Loading your hosted events." status immediately.

Reproduction rate: `source-derived (room/ has only page.tsx, no loading.tsx; getEventRoom awaits 3 sequential queries). Not timed live this pass.`

## Customer impact

The room is where a member lands right after the highest-commitment action, sometimes on mobile data. A blank/frozen frame with no cue is a small but real trust wobble at a moment that should feel reassuring — and it's inconsistent with the polish the neighbouring `/hosting` route already delivers. No authorization, privacy, precise-location, or data dimension (the loading shell shows no member data). Accessibility: adding the state should include a `role="status"` announcement and must respect reduced motion; a static skeleton must not trap focus.

## Evidence and limits

- Evidence: route file listing — `apps/web/src/app/events/[eventId]/room/` = `page.tsx` only (no `loading.tsx`/`error.tsx`); `getEventRoom` (`events.ts`) awaits the room row, then a separate updates query, then a participants query. Established pattern: `apps/web/src/app/hosting/loading.tsx` (branded skeleton + `role="status"`).
- Redactions made: none needed.
- Facts: absence of `loading.tsx` in the room route is confirmed by directory listing; the multi-query fetch is confirmed in source.
- Hypotheses to verify during implementation: actual perceived delay on a warm dev server may be small — the fix is primarily robustness for cold/slow paths and consistency with `/hosting`; consider whether an `error.tsx` for the room is also worth adding while here (the route currently `notFound()`s on missing room but has no thrown-error boundary).
- Paths or surfaces not tested: live timing of the fetch; slow-connection reproduction; whether an `error.tsx` boundary is warranted (out of scope for this ticket's core fix).

## Duplicate check

- Search terms used: room, loading, skeleton, loading.tsx, perceived speed, blank, spinner.
- Tickets reviewed: full queue (30 files). Nearest: `no-web-surface-to-manage-hosted-events` (verified — created the `/hosting` loading pattern this mirrors); `event-room-stays-future-tense-after-event-ends` (same surface, different state).
- Why this is new: no ticket addresses the room route's loading state. Independently fixable by adding a `loading.tsx` next to the room `page.tsx`, reusing the `.skeleton` + `role="status"` pattern already in the codebase.

## Acceptance criteria

- [ ] Navigating to `/events/{id}/room` shows an immediate calm loading state (skeleton for the meeting-point/people panels within the room shell) instead of a blank or frozen frame during the async fetch.
- [ ] The loading state announces itself to assistive tech (e.g. `visually-hidden role="status"` "Loading your room."), matching the `/hosting` pattern.
- [ ] The skeleton is reduced-motion-safe (no shimmer/animation under `prefers-reduced-motion`) and creates no layout shift when the real content replaces it.
- [ ] No member data, no precise location, and no authorization decision is shown in the loading shell.
- [ ] Layout holds at 375 and 1280; no focus trap.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (events-room × completeness-of-states pass); status `ready`. Missing loading state derived from source (room route has only `page.tsx`; `getEventRoom` runs 3 sequential queries) and from the established `/hosting/loading.tsx` pattern it should mirror. Live timing not measured this pass. Self-contained for an implementer.
- 2026-07-02 - Implemented by experience-build-agent; status `implemented`. Added `apps/web/src/app/events/[eventId]/room/loading.tsx` — a route-level Next app-router loading fallback mirroring the `/hosting` pattern: the same `PrimaryNav` + `room-hero` shell with a calm eyebrow/heading ("Getting your room ready…", "Bringing in your meeting point and who has a place.") and skeleton bars for the meeting-point and people panels. The skeleton grid is `aria-hidden="true"` (decorative), and a `visually-hidden role="status"` region announces "Loading your room." to assistive tech. New skeleton styles added to `globals.css` (`.room-skeleton*`) reuse `.room-meeting`/`.room-people` so the shell matches the real `room-grid` (no layout shift). Reduced-motion: shimmer uses an `@keyframes room-skeleton-shimmer` gated by `@media (prefers-reduced-motion: reduce) { .room-skeleton { animation: none; } }` — static bars remain visible, no motion. No member data, venue, address, participants, or authorization decision in the shell (honest placeholder). No focus trap (no interactive elements in the skeleton). Test: `apps/web/src/app/events/[eventId]/room/loading.test.tsx` (3 cases — role=status announcement, calm heading + skeleton placeholders with no fabricated venue data, aria-hidden decorative grid). Checks (apps/web): typecheck pass, lint pass (0 errors; 2 pre-existing warnings in unrelated files), test 644 pass / 12 skipped, production build pass. No migration. Commit `3a97cb8`, pushed to origin/main.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. 3a97cb8). All 6 pass. (1) room/loading.tsx renders real shell (PrimaryNav + room-hero) + "Coordination room"/"Getting your room ready…" + skeleton bars in a real room-grid — honest placeholder, NO venue/address/participants/authorization in the shell. (2) skeleton section aria-hidden=true (decorative); visually-hidden role=status "Loading your room." announces; no interactive → no focus trap; .visually-hidden confirmed globals.css:487. (3) no layout shift: .room-skeleton* reuse .room-meeting/.room-people base (min-height 330px, padding 34px) matching the resolved grid; tokens only (--surface/--surface-raised/--bg), no hex; responsive 1-col ≤750px same rule as real room, chips flex-wrap → no overflow 375/1280. (4) reduced-motion: @media(prefers-reduced-motion:reduce){.room-skeleton{animation:none}} globals.css:906 disables shimmer, static bars remain. (5) page.tsx untouched (chat/safety-brief/MilestoneMoment/afterglow/reflection/peer-feedback intact) — loading.tsx is a separate Suspense fallback. (6) 3 tests genuine (role=status+visually-hidden regex; calm heading+skeleton+not.toContain venue; room-grid aria-hidden regex). Checks the Tester ran: typecheck PASS, lint 0 errors, test 644 passed/12 skipped (loading.test 3/3), prod build PASS. Orchestrator archived.
