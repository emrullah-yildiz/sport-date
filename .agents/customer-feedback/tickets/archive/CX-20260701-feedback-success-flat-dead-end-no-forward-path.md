# CX-20260701-feedback-success-flat-dead-end-no-forward-path

- Status: `implemented`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 3 × Impact 3 × Confidence 4) / Effort 2 = 18. Accessibility floor on a rewarding moment; sequence after higher-reach journeys. (A11y expectation keeps this at P2, not below.)
- Customer journey: reflection / feedback (success state)
- Surface: `web`
- Environment and viewport/device: all widths (`/feedback`, observed 1280 + 375)
- Found by: Experience & Design Explorer (feedback × copy pass, 2026-07-01)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-feedback-headline-assumes-breakage-excludes-ideas` (same surface); `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (same class of fix: focus + announce a committed moment)

## Customer outcome

As a member who just took the time to write feedback, I want a warm confirmation that tells me what happens next and lets me move on cleanly — announced to assistive tech and reachable by keyboard — so that the effort feels acknowledged and I'm not stranded on the form.

## What I observed

After submitting on `/feedback`, the only confirmation is a single flat line — **"Thank you. Your feedback is now with the team."** — rendered inline under the Share button in a `role="status"` region. Three gaps, observed live (dev localhost:3000, signed-in pooled synthetic adult, real Chromium, reduced-motion):

1. **Focus is not moved to the confirmation.** After submit the active element is `<body>` (measured `document.activeElement.tagName === "BODY"`). A keyboard or screen-reader member who tabbed through and submitted is dropped to the top of the document with no focus on the result — the most rewarding moment has no focus handling. (The `role="status"` region does announce the text politely, but focus is lost.)
2. **No forward path.** The success copy is a dead-end sentence: no "see it in your feedback history," no "back to profile," no way to view what was just shared. The one line that *does* point members to the history — "When you send feedback, you can return here to see its status." — lives only in the **empty state**, which disappears the moment the first ticket exists. So exactly when a member has something to track, the pointer to where they'd track it is gone.
3. **The success moment is copy-flat.** The submitted item silently appears in the "What you've shared" panel (the count ticks 0→1), but nothing links the confirmation to it, so the member isn't told their item is now visible and trackable.

The pieces to make this warm already exist on the page (the history panel, a status label per ticket) — they're just not connected to the success moment.

## What I expected

On successful submit: a warm confirmation that (a) moves keyboard focus to the confirmation so AT lands on it and a keyboard member isn't dumped to `<body>`, (b) tells the member their feedback is now visible in "What you've shared" and can be tracked, and (c) offers a clear next step (view it / back to profile). Reduced-motion parity (instant, no reliance on animation to convey success).

## What I expected to avoid (guardrails)

No dark patterns. Do not gamify feedback volume (no streaks, no "you've submitted N!" score, no nudges to submit more). The confirmation should close the loop with dignity, not pull the member back into an engagement loop.

## Reproduction

1. Sign in and open `/feedback`.
2. Fill summary/details/page and submit.
3. Observe: confirmation is one line "Thank you. Your feedback is now with the team."; `document.activeElement` is `<body>` (focus not moved); no link or next step; the "return here to see its status" hint is gone because the empty state is replaced by the ticket list.

Reproduction rate: `confirmed live 1/1 (focus → body measured; success copy static)`

## Customer impact

The most emotionally positive point in this journey — a member volunteering help — lands flat and, for keyboard/screen-reader members, drops focus with no landmark. Members aren't told their submission is now trackable, and the pointer to the tracking view vanishes at the exact moment it becomes useful. **Accessibility is involved** (focus management on a state change / lost focus to `<body>`). No privacy, authorization, or data-loss dimension. No safety dimension (the safety-routing note on the form is correct and unaffected).

## Evidence and limits

- Evidence: live submit on a synthetic account; measured `activeElement` = BODY after submit; success copy captured; empty-state hint text "When you send feedback, you can return here to see its status." confirmed present only while `tickets.length === 0` (source `FeedbackWorkspace.tsx` lines 239–241).
- Redactions made: submitted only synthetic product-experience test text (no addresses/contact/private data), per the form's own privacy note. Note: the feedback API exposes GET but no DELETE, so this one throwaway test ticket persists on the synthetic host-A account only (dev env, not real PII); flag if a clean-up path is wanted.
- Facts: success message string; `role="status"` present but focus not moved; forward-pointer copy scoped to the empty state; count increments silently.
- Hypotheses to verify during implementation: whether moving focus should target a confirmation heading vs the history region — pick whichever gives AT the calm message once (mirror the join-request pattern in `CX-...join-request-commitment...`).
- Paths or surfaces not tested: submit *failure* copy path (error string "Your feedback could not be shared." exists in source but not exercised live this pass); mobile app.

## Duplicate check

- Search terms used: `feedback`, `success`, `confirmation`, `focus`, `dead-end`, `role=status` across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (same fix pattern, different surface — join, not feedback); no existing feedback-surface ticket.
- Why this is new: first ticket on `/feedback` success state; the join-request ticket is a separate journey and is already verified.

## Acceptance criteria

- [ ] On successful feedback submit, keyboard focus moves to the confirmation (a confirmation heading or the history landmark) — `document.activeElement` is never left as `<body>`.
- [ ] The confirmation is announced to assistive tech (polite live region retained) and the announcement conveys the calm result once, without per-keystroke chatter.
- [ ] The success state tells the member their feedback is now visible in "What you've shared" and offers a clear next step (view it and/or back to profile) — the forward-pointer no longer lives only in the vanished empty state.
- [ ] No gamification of feedback volume (no streaks/scores/nudges to submit more); tone stays calm and dignified.
- [ ] Reduced-motion parity: success is conveyed without relying on animation; any transition has an instant fallback.
- [ ] Mobile and desktop layouts remain usable; no overflow at 375 or 1280; touch targets on any new links ≥44px; AA contrast on confirmation copy.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (feedback × copy pass); status `ready`.
- 2026-07-02 - Implemented by Experience Build Agent. `FeedbackWorkspace.tsx`: split the flat `message` into a distinct `submitted` success state + `error` string. On successful submit, focus moves to the confirmation heading via a callback ref guarded by `focusOnConfirmRef` (mirrors the JoinRequestControls pattern) — `document.activeElement` is never left as `<body>`. Extracted a presentational `FeedbackConfirmation` (role="status" aria-live="polite" polite live region announcing the calm result once; `<h3 tabindex="-1">` focus target). Forward path added: (a) copy tells the member their item is now in "What you've shared" and can be followed; (b) an in-page anchor "See it in what you've shared" -> `#feedback-history-title` (the history landmark, which already carries that id), so the pointer no longer lives only in the vanished empty state; (c) a quiet "Back to profile" link to `/profile`. No gamification of volume (no streaks/scores/nudges). Errors keep their own inline `role="alert"` so a typed note is retained. Success is instant (no animation) -> reduced-motion parity inherent. Files: `apps/web/src/components/FeedbackWorkspace.tsx`, `apps/web/src/app/globals.css` (added `.feedback-confirmation*` using semantic tokens only, `.feedback-message--error`), new test `apps/web/src/components/FeedbackWorkspace.test.tsx` (5 tests: polite live region, focusable heading, "What you've shared" pointer, forward-path hrefs, no-gamification). AA: confirmation copy is `--text` on `--surface-raised` (13.9 AAA); primary link is `--bg` on `--accent`/lime (15.95 AA+); quiet link text is `--accent-2` (7.74 AAA on surface); links >=44px (min-height 44px, primary padding 0 16px). No overflow at 375/1280 (actions row `flex-wrap: wrap`). Checks (from `apps/web`): typecheck PASS, lint PASS (only pre-existing warnings in untouched files), test PASS (525 passed + 5 new / 12 skipped), prod build PASS. No migration (presentational). Commit `52879f1`, pushed to origin/main.
