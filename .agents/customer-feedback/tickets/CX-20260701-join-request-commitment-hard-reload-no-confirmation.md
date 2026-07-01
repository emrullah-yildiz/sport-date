# CX-20260701-join-request-commitment-hard-reload-no-confirmation

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — (Reach 4 × Impact 4 × Confidence 5) / Effort 2 = 40. This is the product's single most emotionally significant action — a member committing to meet a stranger — and it currently resolves with a jarring full-document reload, no warm confirmation, lost focus, and no screen-reader announcement. Accessibility (focus loss + silent success) also floors this at P1 regardless of the arithmetic. Effort is a client-side state update + aria-live + focus management; no data/query/authorization change.
- Customer journey: commitment (request a place / cancel a place / accepted → cancel) on a public event invitation
- Surface: `web` (mobile + desktop; same component)
- Environment and viewport/device: dev server localhost:3000, real Chromium, 1280×900. Observed 2026-07-01 with a signed-in synthetic adult requesting a place on a compatible tennis invitation.
- Found by: experience-design-explorer (event-detail × motion & micro-interaction pass)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-hosting-hub-hides-pending-join-requests` (host-side visibility of the same request, different surface/fix), `CX-20260630-event-detail-safety-emergency-microcopy-smallest-text` (same page, copy not motion), `CX-20260630-landing-hero-reduced-motion-hydration-error` (motion on a different surface — verified)

## Customer outcome

As a cautious adult who has just decided to ask a stranger for a place at their game, I want the app to confirm my request warmly and immediately — keeping me oriented on the page and telling me clearly what happens next — so that committing feels safe and acknowledged rather than like the page broke and reloaded.

## What I observed

`JoinRequestControls` resolves every state change — creating a request, cancelling a pending request, and cancelling an accepted place — by calling `window.location.reload()`. Measured on the live event-detail page when a member types a short note and clicks **"Request a place"**:

- **A full hard page reload fires.** Instrumenting main-frame navigations across the submit showed **2 main-frame navigations** — i.e. the whole document is torn down and re-fetched. The button flips to "Sending…", then the entire page blanks and reloads before the pending state ("Your request is with the host") appears (~392 ms). There is no in-place transition; the confirmation blinks in after a reload flash.
- **Focus is lost to `<body>`.** After the reload, `document.activeElement` is `BODY`. A keyboard or screen-reader member who just committed is dropped at the very top of the page and must re-traverse the whole hero, facts, and location panels to discover whether their request succeeded.
- **The commitment confirmation is not announced.** The pending panel ("Your request is with the host. You can cancel quietly at any time. Skip counts stay private.") sits in a plain `<div class="join-state pending">` with **no `aria-live` / `role=status`** on it or any ancestor. Because the state arrives via a full reload rather than a live update, assistive tech gets no notification that the most important action on the page just succeeded.
- **Declared transition never runs.** `.join-request-box` has `transition: all` in computed style, but the element is destroyed by the reload, so no enter/exit motion is ever perceived — the CSS intent is dead. There is no purposeful motion marking the shift from "deciding" to "committed."

The same `window.location.reload()` path governs the cancel-pending and cancel-accepted flows, so leaving/backing out has the identical cold-reload, lost-focus, silent-result behaviour. Observed facts only; reproduced in one session. No authorization, precise-location, or data issue — approximate area stays approximate and the accepted meeting point still gates on acceptance.

## What I expected

The commitment should resolve **in place**: the request box swaps to the pending confirmation without a full-document reload, focus moves to (or the confirmation is announced by) the new state so keyboard/screen-reader members immediately know it worked and what to do next, and a small, purposeful, reduced-motion-safe transition marks the moment (this is exactly where the experience principles call for "warm confirmation after a commitment"). Cancel and accepted-cancel should resolve the same calm, oriented way. No manufactured celebration, no manipulative motion — just a clear, dignified acknowledgement.

## Reproduction

1. Sign in as a member whose profile matches an open compatible event (sport + language).
2. Open the event's public invitation at `/discover/events/{id}`.
3. Type an optional note and click **"Request a place"** (keyboard-only makes the focus loss obvious).
4. Observe: the whole page reloads (document navigation), the pending confirmation appears at the top with no announcement, and focus is on `<body>` rather than the confirmation — you must scroll/tab back to find out what happened.
5. Repeat with **Cancel request** and, after acceptance, **Cancel my place** — same full-reload, lost-focus, silent-result behaviour.

Reproduction rate: `1/1 session (create-request path measured; cancel paths share the identical reload code)`

## Customer impact

The highest-stakes, most anxious moment in the whole journey — asking a stranger for a place — is acknowledged with a page that appears to break and reload, then silently shows a result somewhere off-screen. Practically and emotionally this undercuts trust at the exact moment the product should feel most reassuring. Accessibility is directly involved: a keyboard or screen-reader member loses focus to `<body>` and receives no live announcement that their commitment succeeded, so they may not realise the request went through (risk of double-submitting or abandoning). No authorization, privacy, or precise-location dimension. State-coverage: the pending/accepted/declined/cancelled *content* already exists and reads well — the gap is purely how the transition into those states is delivered.

## Evidence and limits

- Evidence: live instrumentation — `mainframe navigations during submit = 2` (full reload); `document.activeElement.tagName = BODY` after submit; pending panel `liveRegion = null` (no aria-live/role=status on it or any ancestor); `.join-request-box` computed `transition: all` but element destroyed on reload; pending confirmation copy captured (no PII); redacted screenshots of the before/after states (synthetic event, approximate area only).
- Redactions made: synthetic host name and test event only; no precise venue/address (correctly absent pre-acceptance).
- Facts: `apps/web/src/components/JoinRequestControls.tsx` uses `window.location.reload()` in `createRequest` and `cancelRequest`; the pending/accepted/declined/cancelled panels are plain `<div class="join-state …">` with no live region; `apps/web/src/app/discover/events/[eventId]/page.tsx` renders the controls.
- Hypotheses to verify during implementation: best pattern to refresh the request state without a full reload (router refresh + local optimistic state, or return the new state from the POST and render it); where focus should land (the confirmation heading vs. its "Cancel" affordance); exact aria-live politeness (`polite` for success, `assertive` only if an error).
- Paths not tested: the declined and full/closed inbound states (member arriving to an already-declined request — that content is server-rendered, not reload-driven, so likely unaffected); screen-reader end-to-end with a real AT (finding is structural: no live region + focus to body).

## Duplicate check

- Search terms used: reload, window.location, optimistic, motion, micro-interaction, aria-live, confirmation, join, request a place, pending, commit.
- Tickets reviewed: full queue — especially hosting-hub-hides-pending (host side of the same request; different surface and fix), event-detail-safety-microcopy (same page, copy severity not motion), event-detail-approx-location-spatial-cue (same page, spatial not motion), landing-hero-reduced-motion (motion on landing, verified).
- Why this is new: no existing ticket addresses the join/cancel commitment micro-interaction — the full-document reload, the lost focus, the missing confirmation announcement, or the absent purposeful transition. Independently fixable (client component state + a11y), separate from host-side visibility and from same-page copy tickets.

## Acceptance criteria

- [ ] Requesting a place resolves **without a full-document reload** — the request box updates in place to the pending confirmation.
- [ ] After the request succeeds, a keyboard/screen-reader member is oriented: focus moves to the new confirmation (e.g. its heading or primary control) **or** the confirmation is exposed via an `aria-live`/`role=status` region so success is announced; focus is never left on `<body>`.
- [ ] Cancel-pending and cancel-accepted resolve the same in-place, oriented, announced way (all three share the fix).
- [ ] A purposeful transition marks the commitment shift, with full **reduced-motion parity** (no motion, or an instant swap, under `prefers-reduced-motion`); no celebratory/manipulative motion.
- [ ] The confirmation copy remains calm and honest (no artificial urgency, "skip counts stay private" preserved); no new claims.
- [ ] Error states (request/cancel failure) still surface clearly in place with `role=alert`, without a reload, and without losing the member's typed note where recoverable.
- [ ] No precise location exposed; approximate-area-only and accept-gated meeting point unchanged; no authorization change.
- [ ] Layout remains usable at 375px and 1280px; the confirmation and its controls keep ≥44px touch targets and visible focus.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by experience-design-explorer (event-detail × motion & micro-interaction pass); status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `ready` → `in-progress`. Replacing the window.location.reload() commitment path with in-place client state + router.refresh(), a polite role=status announcement, focus moved to the confirmation heading, and a reduced-motion-safe framer-motion swap.
- 2026-07-01 - experience-build-agent implemented; status `in-progress` → `implemented` (commit 1d1897a). `JoinRequestControls` now resolves request / cancel-pending / cancel-accepted in place via local client state (no window.location.reload) — verified live on localhost:3000 with two synthetic adults that a window marker survives the update (no full document reload), a polite `role="status"` aria-live region announces the calm result, and focus lands on the confirmation `<strong>` heading (not `<body>`) for both request and cancel. Cancel-of-accepted additionally calls `router.refresh()` to drop the meeting-point section, re-asserting focus after the RSC merge (this specific branch not re-run live because the signup rate limit (5/hr per IP) was exhausted by repeated verification registrations; it shares the verified local-state + announcement code and the refresh was separately observed to be a soft, marker-surviving refresh). Calm copy and "Skip counts stay private." preserved; typed note kept on error; framer-motion swap honours `prefers-reduced-motion` (instant swap); no authorization / privacy / precise-location / data-flow change. Added a `join-request-policy` unit test for the confirmation copy. Checks: typecheck pass, lint pass (0 errors; the sole remaining warning is in the untracked, out-of-scope qa/full-flows.mjs), test pass (165). Left for Explorer retest: cancel-of-accepted live (rate-limited this pass), declined/full inbound states, and real-AT screen-reader pass.
