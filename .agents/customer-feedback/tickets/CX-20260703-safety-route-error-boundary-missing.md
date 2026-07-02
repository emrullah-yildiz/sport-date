# CX-20260703-safety-route-error-boundary-missing

- Status: `implemented`
- Severity: `high`
- Priority: `P2` — (Reach 2 × Impact 3 × Confidence 4) / Effort 2 = 12 → P2. Not an accessibility regression, so the P1 floor does not apply; but it degrades a **safety** surface on failure, so it is held above a routine P3. Files: new `apps/web/src/app/safety/error.tsx` (and, secondarily, `apps/web/src/app/moderation/error.tsx`), mirroring the existing `apps/web/src/app/hosting/error.tsx`.
- Customer journey: any moment a member opens the Safety center (`/safety`) to read guidance or track/appeal a report
- Surface: `web` (both viewports)
- Environment and viewport/device: source-verified 2026-07-03. No dev server this pass.
- Found by: Experience & Design Explorer (safety/moderation × empty/loading/error-state discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-global-error-boundary-white-screen-not-calm-branded` (archived; that hardened the *global* last-resort boundary — this ticket adds a *scoped* boundary so a `/safety` failure never has to fall all the way through to it), `CX-20260701-event-room-no-loading-state-blank-during-fetch` (archived; same class of missing route-level state on a different route). Precedent to copy: `apps/web/src/app/hosting/error.tsx` + `hosting/loading.tsx` already exist for the hosting hub.

## Customer outcome

As a cautious adult who opens the Safety center — often precisely because I want the emergency reminder, the "how to meet safely" guidance, or to track a report — I want the page to stay useful even if the server hits a transient error loading my cases, so a backend hiccup does not blank out the one screen that carries the "contact local emergency services" line and the pointers to reporting/blocking.

## What I observed

`/safety` is a server component that calls `getMemberSafetyCases(user.id)` for signed-in members (`apps/web/src/app/safety/page.tsx:26`). There is **no `error.tsx` and no `loading.tsx`** anywhere between `/safety` and the app root (`find apps/web/src/app -name error.tsx -o -name loading.tsx` returns only `events/[eventId]/room/loading.tsx`, `hosting/error.tsx`, `hosting/loading.tsx`). So if that case query throws (a transient DB error, a missing-column during a migration window, etc.), the failure propagates to the **global** error boundary (`apps/web/src/app/global-error.tsx`), which *replaces the entire root layout* with a generic "we're having a problem" page.

The consequence specific to this surface: the global fallback discards everything the Safety center renders — including the static, data-independent `SafetyGuidelines` block and its `safety-emergency-card` ("If anyone is in immediate danger, contact local emergency services") — even though that guidance needs no data and did not fail. A member who came to `/safety` under stress is shown a generic app-wide error instead of a calm, safety-contextual message that still points them to emergency services and reassures them that reporting/blocking remain reachable from an event, request, or room.

The same absence applies to `/moderation` and `/moderation/reports/[reportId]` (async server components calling `getModerationQueue` / `getModerationCase`), which would also fall through to the global boundary on a data error.

Observed 2026-07-03; source-confirmed (no `error.tsx`/`loading.tsx` under `apps/web/src/app/safety` or `.../moderation`).

## What I expected

A scoped `apps/web/src/app/safety/error.tsx` (client boundary, mirroring `hosting/error.tsx`) that keeps the app chrome, states plainly that the member's own reports could not be loaded right now, **re-states the emergency line and that reporting/blocking still work from an event/request/room**, offers a "Try again" retry (the boundary `reset()`), and exposes nothing internal (no error message, stack, `digest`, or SQL). A parallel `moderation/error.tsx` should give staff a calm retry without leaking internals. Optionally a `safety/loading.tsx` skeleton for the case list improves the transition, consistent with the hosting precedent.

## What I expected to avoid (guardrails)

Do not surface any internal error text, `digest`, SQL, or column names to the member (match `global-error.tsx`'s scrub-and-hide posture). Do not paywall or degrade the safety guidance/emergency reminder. Do not manufacture urgency. Keep the boundary self-recoverable (retry) rather than a dead end.

## Reproduction

1. Cause `getMemberSafetyCases` (or `getModerationQueue`) to throw — e.g. a transient DB error or a column-missing state during a migration window — while a signed-in member is on `/safety`.
2. Observe: the whole app is replaced by the generic global "we're having a problem" fallback; the Safety center's static guidance and emergency-services reminder are gone.
3. Confirm in source: there is no `error.tsx`/`loading.tsx` between `/safety` (or `/moderation`) and the root, so the nearest boundary is `global-error.tsx`.

Reproduction rate: `source-confirmed` — no scoped boundary exists; the fall-through to the global boundary is structural.

## Customer impact

Resilience and trust on a safety surface: a transient backend error turns the Safety center — the page most likely to be opened in a worried moment — into a generic app-wide failure that loses the emergency-services reminder and the reporting/blocking pointers. Practical: no retry affordance scoped to the page; the member must reload the whole app. No privacy/authorization exposure is introduced (and this ticket must not introduce one); the harm is loss of safety context and recoverability during an error, not data leakage.

## Evidence and limits

- Evidence: `apps/web/src/app/safety/page.tsx:24-26` (server component awaiting `getMemberSafetyCases`); absence of `apps/web/src/app/safety/error.tsx` / `loading.tsx` and `apps/web/src/app/moderation/error.tsx` / `loading.tsx` (directory listing + `find`); existing precedent `apps/web/src/app/hosting/error.tsx`, `hosting/loading.tsx`, `events/[eventId]/room/loading.tsx`; `global-error.tsx` header comment confirming it *replaces the root layout* and is the last-resort fallback.
- Redactions made: none needed (no member data involved in filing).
- Facts: no scoped error/loading boundary exists for `/safety` or `/moderation`; a data-layer throw there reaches `global-error.tsx`; the safety guidance/emergency card is static and does not itself require the failing query.
- Hypotheses to verify during implementation: whether to render the static `SafetyGuidelines`/emergency card *inside* the error boundary (so guidance survives even when the case list fails) or to keep the boundary a compact calm card that links to the guidance; whether a `loading.tsx` skeleton is worth adding alongside.
- Paths or surfaces not tested: could not force a live throw without a dev server this pass; the missing boundary is structural.

## Duplicate check

- Search terms used: `error.tsx`, `loading.tsx`, error boundary, `global-error`, `/safety`, `/moderation`, skeleton, retry, `getMemberSafetyCases`.
- Tickets reviewed: all open `CX-*` and all archived `CX-*`; closest are `global-error-boundary-white-screen-not-calm-branded` (the global boundary itself, already hardened) and `event-room-no-loading-state-blank-during-fetch` (a different route's loading state).
- Why this is new: no ticket adds a *scoped* error (or loading) boundary for the safety or moderation routes; this is about keeping a safety surface calm and recoverable on failure rather than falling through to the generic global page.

## Acceptance criteria

- [ ] A failure loading `/safety` renders a scoped, calm, on-brand error state (not the generic global fallback) that keeps the app chrome and states plainly that the member's own reports could not be loaded right now.
- [ ] That scoped error state re-states the emergency guidance ("contact local emergency services") and that reporting/blocking remain reachable from an event, request, or room — so safety context is not lost during an error.
- [ ] A "Try again" control re-runs the render via the boundary `reset()`; the state is not a dead end.
- [ ] No internal error detail (message, stack, `digest`, SQL, column names) is shown to the member — matches the global boundary's hide-and-scrub posture.
- [ ] `/moderation` (and `/moderation/reports/[reportId]`) get an equivalent scoped error boundary so a staff data error is a calm retry, not the global page.
- [ ] The boundary is keyboard-reachable with a visible focus ring on the retry control, meets AA contrast, and respects reduced-motion (no required motion to perceive it).
- [ ] Layout stays overflow-free and usable at 375px and 1280px.
- [ ] Relevant automated tests and repository checks pass (a render test of the new `error.tsx` asserting the emergency line + retry are present and no internal detail leaks, mirroring the hosting boundary's test if one exists).

Deleted generic line "The original customer can complete or safely leave the journey" — reason: covered more specifically by the retry + preserved-guidance criteria above.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; added scoped `safety/error.tsx` (keeps PrimaryNav + full `SafetyGuidelines` incl. emergency-services reminder reachable, calm alert card, `unstable_retry()` "Try again", no `error` internals rendered) and `moderation/error.tsx` (covers `/moderation` and nested `reports/[reportId]`, calm staff retry) mirroring `hosting/error.tsx`; added `safety/error.test.tsx` (renderToStaticMarkup) asserting emergency line + guidance + retry present and no message/digest/SQL/column leak. Checks: typecheck OK; lint 0 errors/0 new warnings (2 pre-existing in qa/full-flows.mjs + member-profile.test.ts); tests 749 passed/12 skipped; prod build compiled (`/safety`, `/moderation`, `/moderation/reports/[reportId]` in route graph). No live throw forced (no dev server this pass). Status `implemented`.
