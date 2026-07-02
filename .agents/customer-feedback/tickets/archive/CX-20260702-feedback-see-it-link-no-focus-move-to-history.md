# CX-20260702-feedback-see-it-link-no-focus-move-to-history

- Status: `implemented`
- Severity: `low`
- Priority: `P3 polish` — (Reach 2 × Impact 2 × Confidence 4) / Effort 1 = 16. Small a11y-consistency fix on an already-good moment; completes the forward-path work.
- Customer journey: reflection / feedback (success → history forward path)
- Surface: `web`
- Environment and viewport/device: all widths (`/feedback`, observed 1280)
- Found by: User-simulator (feedback journey, 2026-07-02)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (verified — added the forward path; this is the focus behaviour of that path's link)

## Customer outcome

As a keyboard or screen-reader member who just submitted feedback, when I activate the confirmation's "See it in what you've shared" link I want focus to move to the "What you've shared" heading, so I actually land where the link promised and can read my newly shared item — not be dropped to the top of the document.

## What I observed

After a successful submit on `/feedback`, the warm confirmation offers a link **"See it in what you've shared"** (an in-page anchor to `#feedback-history-title`). Activating it by keyboard (focus the link, press Enter):

- The URL hash becomes `#feedback-history-title` and the history heading scrolls into view, BUT
- `document.activeElement` after activation is **`<body>`** — focus is not moved to the destination. The heading `<h2 id="feedback-history-title">` has **no `tabindex`**, so it cannot receive focus.

This is the same focus-management concern the team already solved for the *submit* moment — the confirmation title (`.feedback-confirmation-title`) has `tabIndex={-1}` and correctly receives focus on submit (verified live: active element = the confirmation H3). The forward-path link is the one remaining step where a keyboard/AT member is dropped to `<body>` instead of the place the link names.

Observed 2026-07-02, dev localhost:3000, signed-in pooled synthetic adult, real Chromium at 1280. No console/page/5xx errors. Sighted mouse users are unaffected (the panel scrolls into view visually).

## What I expected

Activating "See it in what you've shared" moves keyboard/AT focus to the "What you've shared" heading (or the first history item), consistent with the confirmation-heading focus-move already in place — so a keyboard member's next Tab continues from the history, and a screen-reader member is read the destination rather than the top of the document.

## What I expected to avoid (guardrails)

No dark patterns; no engagement loop. Purely close the a11y gap. Preserve reduced-motion parity (no reliance on smooth-scroll animation to convey arrival). Do not steal focus on ordinary renders — only when the member activates the link.

## Reproduction

1. Sign in and open `/feedback`.
2. Fill summary/details/page and submit; the warm confirmation appears (focus correctly on its heading).
3. Tab/Shift-Tab to (or click) "See it in what you've shared" and activate it.
4. Inspect focus: `document.activeElement` is `<body>`; the history heading is not focusable (`tabindex` absent).

Reproduction rate: `confirmed; deterministic`

## Customer impact

Low, accessibility-only. A keyboard or screen-reader member activating a labelled forward link is not taken (for focus purposes) to the named destination, so the promised "follow where it lands" is weaker for AT users than for sighted mouse users. No authorization, privacy, safety, or data-loss dimension. The submit-moment focus handling is already correct, so this is a consistency completion, not a regression.

## Evidence and limits

- Evidence: live measurement — after keyboard-activating the link, `document.activeElement.tagName === "BODY"`, `location.hash === "#feedback-history-title"`, history heading `getAttribute("tabindex") === null`.
- Redactions made: none needed (synthetic account, no member data).
- Facts: `FeedbackConfirmation` link `href="#feedback-history-title"`; `<h2 id="feedback-history-title">` has no `tabIndex`; the confirmation title already uses `tabIndex={-1}` + focus-on-mount (`attachConfirmation`).
- Hypotheses to verify during implementation: add `tabIndex={-1}` + `scroll-margin-top` to the history heading and move focus to it on link activation (or convert the link to a button that focuses it), matching the existing confirmation-heading pattern.
- Paths or surfaces not tested: mobile app feedback entry (web only this pass).

## Duplicate check

- Search terms used: `feedback`, `focus`, `See it`, `what you've shared`, `history`, `anchor` across `.agents/customer-feedback/tickets/` and `archive/`.
- Tickets reviewed: `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (verified — created the forward path and fixed submit-moment focus; did not cover the link's own destination focus).
- Why this is new: distinct from the verified success-forward-path ticket — that added the link and fixed focus *on submit*; this is about focus when the member *activates* that link.

## Acceptance criteria

- [ ] Activating "See it in what you've shared" moves keyboard/AT focus to the "What you've shared" heading (or first shared item), not `<body>`.
- [ ] The destination heading is a valid focus target (e.g. `tabindex="-1"`) with appropriate `scroll-margin-top` so it is not tucked under sticky UI.
- [ ] Focus is only moved on explicit activation; ordinary renders never steal focus.
- [ ] Reduced-motion parity: arrival does not depend on scroll animation.
- [ ] Mobile and desktop layouts unchanged; no overflow at 375 or 1280.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by User-simulator (feedback journey pass); status `ready`.
- 2026-07-02 - Implemented by Builder (commit `296a505`). Focus now moves to the history landmark on forward-path activation: `FeedbackWorkspace` gives the destination `<h2 id="feedback-history-title">` `tabIndex={-1}` (a valid focus target) held in `historyHeadingRef`, and passes `onSeeHistory={focusHistoryHeading}` to `FeedbackConfirmation`, whose "See it in what you've shared" anchor calls it via `onClick`. `focusHistoryHeading` runs `historyHeadingRef.current?.focus()`, so keyboard/AT lands on the heading (not `<body>`) and the next Tab continues from the history. Focus — not the scroll animation — conveys arrival, so reduced-motion parity holds; the browser still handles the anchor's smooth scroll (honouring prefers-reduced-motion via `globals.css`). Added `scroll-margin-top: 24px` so the heading clears the sticky panel top and a `:focus-visible` ring on `#feedback-history-title` (the global `:focus-visible` fallback also covers it). Focus is moved only on explicit link activation — no effect/render-time focus, so ordinary renders never steal focus. Test: added 4 assertions in `FeedbackWorkspace.test.tsx` (source tripwires, mirroring the verified `EditProfileForm`/confirmation focus tests) covering the onSeeHistory→onClick wiring, the heading being a focus target, `focusHistoryHeading` focusing the ref, and no render-time focus-steal. Checks (`apps/web`): typecheck, lint (0 errors), test (586 passed +4 new), production build — all pass. No migration. Status `implemented` (awaits independent Explorer retest).
