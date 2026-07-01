# CX-20260701-host-accept-decline-hard-reload-no-confirmation

- Status: `implemented`
- Severity: `high`
- Priority: `P1 high` — (Reach 3 × Impact 4 × Confidence 5) / Effort 2 = 30. Accessibility regressions are never below P1 regardless of the arithmetic: this is the host mirror of the already-`verified` seeker-side join-request a11y floor.
- Customer journey: coordination / host management (commitment → coordination) — the host's accept/decline decision on a real person's join request
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, source-confirmed in `HostRequestDecision.tsx`; parallel to the seeker-side control observed live at commit `1d1897a`
- Found by: Experience & Design Explorer — `host accept/decline flow × completeness-of-states / accessibility` pass, 2026-07-01
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (the seeker-side twin, now `verified` — this is the same defect on the host side, and its shipped fix is the pattern to mirror); `CX-20260701-hosting-hub-hides-pending-join-requests` (the hub that routes the host here, `verified`); `CX-20260701-peer-feedback-submit-no-focus-confirmation-and-empty-default` (same focus-on-async-resolve pattern)

## Customer outcome

As a host reviewing who wants to join my event, I want a calm, announced confirmation when I welcome or turn away a real person — with my keyboard focus kept somewhere sensible — so that I (including if I use a screen reader or keyboard) know the decision landed, and the most human moment of hosting does not feel like the page just blinked out from under me.

## What I observed

On the host event page (`/events/{id}`), each pending request card renders an **Accept** and a **Skip** button (`HostRequestDecision`). Choosing either fires `POST .../requests/{id}/decision` and then, on success, calls **`window.location.reload()`** — a full-document reload. There is **no `role="status"` / `aria-live` announcement** of the outcome and **no focus management**: after the reload, focus drops to `<body>`, and a screen-reader host is never told "you welcomed {name}" or "request closed". This is the exact anti-pattern that the seeker-side join control moved away from (its ticket is now `verified`): every comparable interactive control in the app (`JoinRequestControls`, `PeerFeedbackPanel`, `ShareEventLink`, `ReportSafetyControls`, the session controls) resolves in place and announces via `role="status"`. `HostRequestDecision` is the last commitment control still hard-reloading.

Source-confirmed (2026-07-01): `apps/web/src/components/HostRequestDecision.tsx:17` is the only remaining interactive-commitment `window.location.reload()`; the component has no live region and no focus move. The error path does announce (`<p role="alert">`), but the success path is silent.

## What I expected

Accepting or skipping a request should mirror the shipped seeker-side pattern:
- resolve the card **in place** (local state) rather than reloading the whole document;
- announce the calm result in a polite `role="status"` / `aria-live` region ("You welcomed {firstName} — they can now see the meeting point." / "Request closed. Skip counts stay private.");
- move focus to that confirmation (never to `<body>`), so keyboard/screen-reader hosts land on the outcome;
- on **accept**, the accepted-member panel / places-filled count updates without a jarring reload (`router.refresh()` after the local resolve, as the seeker-side accepted-cancel branch does).

This is an accessibility and dignity fix, not new capability. It exposes no new data: the host already sees the requester's first name/age/skill on the card; the confirmation names only what the host already sees, and **skip counts stay private** (never surfaced to the requester).

## Reproduction

1. Log in as a host with at least one pending join request; open `/events/{id}`.
2. Turn on a screen reader (or just watch focus). Press **Accept** (or **Skip**) on a pending card.
3. Observe: the whole page reloads, nothing is announced, and focus is back at the top of the document (`<body>`), not on any confirmation of what just happened.

Reproduction rate: `source-confirmed 1/1 (window.location.reload with no live region / focus move); live host-with-pending re-drive blocked by browser-auth rate limit this pass`

## Customer impact

Practical: a host acting on requests — the coordination step this whole surface exists for — gets a full reload with no feedback, so a keyboard or screen-reader host cannot tell whether the accept/skip succeeded without re-reading the entire page. Emotional: welcoming someone into a real meeting (or gently declining) is the warmest, most human host action; a silent page-blink strips it of any acknowledgement. **Accessibility: yes** — silent async success + focus-to-`<body>` is a WCAG-relevant floor (status changes not announced; focus not managed). No authorization/privacy/precise-location dimension is changed (requester identity already shown to the host on the card; skip counts stay private; this is the host's own event). Not a safety regression. The decision API and its authorization are unchanged — this is a presentation/announcement fix only.

## Evidence and limits

- Evidence: source of `HostRequestDecision.tsx` — `window.location.reload()` on success, no `role="status"`/`aria-live`, no focus move; contrasted with `JoinRequestControls.tsx:242` (`<p role="status" aria-live="polite">`) which is the shipped good pattern on the seeker side.
- Redactions made: no requester identity, email, or location reproduced; skip-count value not exposed.
- Facts: the decision endpoint returns JSON the component already parses; a local-state resolve + `router.refresh()` (accept) needs no API change, exactly as the seeker-side accepted-cancel branch does.
- Hypotheses to verify during implementation: whether accept should optimistically move the card into the "Accepted" section client-side or rely on `router.refresh()`; keep the "This next skip closes the request quietly." note and calm copy; ensure `prefers-reduced-motion` parity (instant swap, no motion required) as the seeker-side control does.
- Paths or surfaces not tested: live host-with-pending accept/skip re-drive this pass (per-IP browser-auth 429; not polled per the no-wait handshake).

## Duplicate check

- Search terms used: host, accept, decline, skip, decision, reload, confirmation, aria-live, role=status, focus, request.
- Tickets reviewed: full queue (68 tickets), especially `join-request-commitment-hard-reload-no-confirmation` (seeker side, verified), `hosting-hub-hides-pending-join-requests` (verified), `peer-feedback-submit-no-focus-confirmation-and-empty-default`, `verify-email-async-result-not-announced-to-screen-readers`.
- Why this is new: the verified seeker ticket fixed `JoinRequestControls` (the requester's request/cancel). No ticket covers the **host's** accept/skip control (`HostRequestDecision`), which still hard-reloads with no announcement. Independently fixable in one component and independently checkable by a member.

## Acceptance criteria

- [ ] Accepting or skipping a pending request resolves the card **without a full-document reload** (`window.location.reload()` is gone from `HostRequestDecision`).
- [ ] The outcome is announced in a polite `role="status"` / `aria-live` region with calm, host-toned copy ("welcomed {firstName}" on accept; a calm closed message on skip). No urgency/scarcity language; no coral-as-pressure.
- [ ] Keyboard focus moves to the confirmation on resolve (never to `<body>`); no focus trap is introduced; the error path keeps its `role="alert"`.
- [ ] On accept, the accepted-member panel and any places-filled/pending count reflect the change (e.g. via `router.refresh()` after the in-place resolve) without a jarring reload.
- [ ] Skip counts stay private (never shown to the requester); the "This next skip closes the request quietly." note behaviour is preserved.
- [ ] Buttons keep ≥44px touch targets and visible focus; the announcement is legible at 1280 and 375 with no overflow; `prefers-reduced-motion` gives an instant swap (no required motion).
- [ ] Relevant automated tests pass (add a test asserting the confirmation copy/announcement and the absence of `window.location.reload`, mirroring `join-request-policy.test.ts`).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (`host accept/decline flow × completeness-of-states / accessibility`); status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `ready` → `in-progress`. Mirroring the shipped seeker-side `JoinRequestControls` fix: replacing the `window.location.reload()` accept/skip path with in-place local client state, a polite `role="status"`/`aria-live` announcement of the outcome, focus moved to the confirmation heading (never `<body>`) via the same `attachConfirmation` callback-ref pattern, `router.refresh()` on accept (re-asserting focus after the RSC merge), and a `prefers-reduced-motion`-safe framer-motion swap. Calm, private copy (no skip-count exposure).
- 2026-07-01 - experience-build-agent implemented; status `in-progress` → `implemented` (commit `8e310d4`). `HostRequestDecision` no longer calls `window.location.reload()` — accept/skip resolve the card in place via local `useState`. The decision route already returns `{ status }` from `summarizeHostDecision` (`accepted` / `pending` skipped-not-closed / `declined` third-skip-close); the component mirrors that into a resolved panel inside `AnimatePresence mode="wait"`. AC-by-AC: **AC1** no full-document reload — the only `reload` token left is a comment; resolves via local state ✅. **AC2** polite `role="status" aria-live="polite" .visually-hidden` region fed by new `hostDecisionConfirmationMessage()`; accept says "You welcomed {firstName}. They can now see the exact meeting point." (first name already on the card), skip/close stays calm and private ✅. **AC3** focus moves to the confirmation `<strong tabIndex={-1}>` via `attachConfirmation` callback ref (never `<body>`); error path keeps `role="alert"` on the still-mounted buttons panel ✅. **AC4** accept calls `router.refresh()` then `requestAnimationFrame(() => confirmationRef.current?.focus())` so the accepted section / pending+accepted counts re-sync without a jarring reload, focus re-asserted after the RSC merge ✅. **AC5** skip counts never surfaced to the requester; the "This next skip closes the request quietly." note (rendered when `skipCount >= 2`) is preserved on the deciding panel; unit test asserts the skip/close copy contains no digit and no leak ✅. **AC6** buttons keep existing `.host-decision` styling (≥44px, `:focus-visible` lime outline added for the resolved heading); resolved note is muted (not coral), legible at 1280/375; `useReducedMotion()` → instant swap (duration 0, no transform) ✅. **AC7** added `hostDecisionConfirmationMessage` + 1 unit test (calm copy, names only visible data, never leaks skip counts); page passes `requesterName={request.requester.firstName}`. Checks (all `--workspace @sport-date/web`): typecheck **pass**, lint **pass** (0 errors; sole warning is the untracked out-of-scope `qa/full-flows.mjs`), test **pass** (268 passed / 12 skipped), **production `npm run build` pass** (compiled in 20.5s, 53/53 static pages). No authorization / privacy / precise-location / decision-data-flow change. Left for Explorer independent retest: live host-with-pending accept/skip walkthrough (per-IP browser-auth cap this pass — not polled per the no-wait handshake; dev server reachable, source + unit complete), and a real-AT screen-reader pass.
