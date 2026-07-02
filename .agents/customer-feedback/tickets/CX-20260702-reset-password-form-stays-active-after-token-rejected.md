# CX-20260702-reset-password-form-stays-active-after-token-rejected

- Status: `ready`
- Severity: `low`
- Priority: `P3 low` — (Reach 2 × Impact 2 × Confidence 4) / Effort 1 = 16. Only members whose reset token is server-rejected (expired / already-used / valid-format-but-unknown) hit this; the correct recovery action IS present on the page, so nobody is locked out. It is a residual-affordance polish gap: the page keeps offering an action that can never succeed, which invites a confused retry loop. Not safety/privacy/authorization; anti-enumeration and error announcement are intact.
- Customer journey: account recovery (password-reset confirm dead-end), unauthenticated entry from an email link
- Surface: `web` (both viewports; same component)
- Environment and viewport/device: dev server localhost:3000, real Chromium (reduced-motion), observed 2026-07-02 at 1280px and 375px
- Found by: User-simulator (reset-password / verify-email recovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-reset-verify-dead-link-no-direct-recovery-path` (archived/verified — added the inline "Send me a new reset link" panel this ticket builds on; that one is about the recovery action being ABSENT, this one is about the now-useless password form still being PRESENT alongside it), `CX-20260701-verify-email-async-result-not-announced-to-screen-readers` (archived — the verify-email a11y announcement, a different surface)

## Customer outcome

As a cautious adult who clicked a password-reset link from my inbox and the server told me the link is invalid/expired, I want the page to stop offering me the "Update password" form that can never work and instead point me clearly at the one action that will (request a fresh link), so that I do not waste time re-typing a new password and clicking "Update password" over and over against a dead token.

## What I observed

Driven live end to end. On `/reset-password?token=<valid-format-but-unknown>` (`sdp_` + 43 url-safe chars), the card first renders the password form correctly. I filled a strong matching password and clicked **Update password**. The POST `/api/auth/password-reset/confirm` returned **400** with `{ "error": "This reset link is invalid." }` (correct — the token is not real).

After that rejection the card shows, top to bottom, all at once:

1. The **still-active** "New password / Confirm password / Update password" form (unchanged, fully interactive).
2. `role="alert"`: **"This reset link is invalid."**
3. The dead-end recovery panel **"Send me a new reset link"** (open), with an Email field + "Start password reset".

So the failing form and the real recovery action sit on the page together, with the dead form on top. A member's natural instinct — "it said invalid, let me try again" — is to re-type into the visible password form and press **Update password** again, which fails identically forever, because the *token* is dead, not the password. The action that actually recovers them (request a fresh link) is visually subordinate to a form that cannot succeed.

Root cause is visible in `PasswordResetConfirmCard.tsx`: the form renders whenever `!completed && tokenValid`, and `tokenValid` is a pure *format* check (`isBrowserPasswordResetToken`) that stays true after a server rejection; meanwhile `deadEnd` also becomes true (because `error` is set) and opens the request panel — so both render simultaneously. Focus after submit dropped to `<body>` (the error is a `role="alert"` so it is still announced, but focus does not land on the recovery action).

Positives worth preserving (all confirmed live this pass): the no-token and malformed-token dead-ends do NOT show the form (they correctly show only the error + the "Send me a new reset link" panel); anti-enumeration is intact (a registered and an unregistered email both return 202 with the identical "If an account exists for that email…" copy); the error is announced via `role="alert"`; no overflow at 1280 or 375; the `.auth-link-button`, `.btn-primary`, and `.btn-secondary` controls all carry the 3px focus ring; no leaked-internal text.

## What I expected

After the server rejects the token, the password form should be removed (or visibly disabled) and the primary, focus-receiving action should be **"Send me a new reset link."** The member should never be able to re-submit a new password against a token the server already declared dead. The no-token / malformed-token states already do exactly this — the server-rejected state should match them.

## What I expected to avoid (guardrails)

Keep anti-enumeration: the fresh-link request must still respond identically whether or not the email exists. No dark patterns / fabricated urgency. Do not weaken token validation to make the form "work." Do not remove the honest "email delivery is still disabled until an approved provider is connected" note. When the form is removed on rejection, move keyboard focus to the recovery panel's heading or its trigger so an AT user is taken to the next real step, mirroring the shipped join-flow / verify-email focus-on-resolve pattern.

## Reproduction

1. Open `/reset-password?token=sdp_AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA` (any valid-format but non-existent token).
2. Enter a strong matching password in both fields and click **Update password**.
3. Observe POST `/api/auth/password-reset/confirm` → 400 "This reset link is invalid."
4. Observe the still-active "Update password" form remains rendered above the error and above the "Send me a new reset link" panel; you can re-type and re-submit it, and it fails identically each time.

Reproduction rate: `2/2 viewports (1280 + 375), same build`

## Customer impact

Practical: a member with a genuinely expired or already-used link (the common real case — someone who clicked an old email) is invited into a futile retry loop on a form that can never succeed, delaying their actual recovery. Emotional: someone already anxious about being locked out is given a control that keeps failing without explaining that the *link*, not their input, is the problem. Accessibility: focus does not move to the recovery action on rejection (drops to `<body>`); the error is announced but the next real step is not focused. No authorization, privacy, safety, or data-loss dimension — recovery is still reachable and anti-enumeration holds.

## Evidence and limits

- Evidence: live Chromium drive at 1280 + 375; POST confirm returned HTTP 400 `{"error":"This reset link is invalid."}`; post-rejection DOM contained the password form (`#reset-password`, `#reset-password-confirm`, "Update password"), the `role="alert"` error, and the open `#forgot-password-panel` simultaneously; `document.activeElement` was `BODY` after submit.
- Redactions made: used synthetic non-existent tokens and the throwaway QA pool email only; no real account exercised for the reset itself.
- Facts: `PasswordResetConfirmCard.tsx` renders the form on `!completed && tokenValid` where `tokenValid` is format-only; `deadEnd` opens `ForgotPasswordPanel defaultOpen`; both conditions are true after a server rejection.
- Hypotheses to verify during implementation: hiding/disabling the form on `error` and moving focus to the recovery panel resolves it without regressing the happy path (valid token → success) or the no-token/malformed states (which already hide the form).
- Paths or surfaces not tested: a genuinely expired-but-real token (needs a seeded reset token + DB); the 410/503/500 confirm branches (only the 400 "invalid" branch was reproducible live without seeding).

## Duplicate check

- Search terms used: reset, verify, recovery, password, dead-end, tokenValid, "Update password", "form stays" across active tickets + archive.
- Tickets reviewed: `CX-20260701-reset-verify-dead-link-no-direct-recovery-path` (archived/verified — recovery action ABSENT; now fixed, this pass confirmed the inline panel is present), `CX-20260701-verify-email-async-result-not-announced-to-screen-readers` (archived — verify-email a11y), `CX-20260701-login-rate-limited-state-no-recovery-guidance` (archived — login error state).
- Why this is new: no active or archived ticket covers the *residual* password form staying interactive AFTER the server rejects the token. The archived dead-link ticket added the recovery panel but did not remove/disable the now-useless form that renders alongside it; that gap is what this ticket captures.

## Acceptance criteria

- [ ] On a server-rejected reset token (400 invalid / 410 expired), the "New password / Confirm password / Update password" form is no longer submittable (removed or disabled), so a member cannot re-submit against a dead token.
- [ ] The primary, clearly-labelled next action on the rejected state is "Send me a new reset link" (already present) and it, not the dead form, is the visual focal point.
- [ ] Keyboard focus moves to the recovery panel heading/trigger on rejection (not `<body>`), and the outcome remains announced.
- [ ] Anti-enumeration is preserved: the fresh-link request responds identically for existing and non-existing emails.
- [ ] The no-token and malformed-token states (which already hide the form) are unchanged; the happy path (valid token → "Password updated") is unchanged.
- [ ] The affected web layout remains usable at 375 and 1280 with no overflow.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- `2026-07-02` - Filed by User-simulator (recovery-pages pass); status `ready`.
