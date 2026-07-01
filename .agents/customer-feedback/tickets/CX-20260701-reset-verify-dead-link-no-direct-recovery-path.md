# CX-20260701-reset-verify-dead-link-no-direct-recovery-path

- Status: `ready`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 3 × Impact 4 × Confidence 4) / Effort 2 = 24. Every member who follows an expired, malformed, or already-used recovery/verification link lands here; the card is otherwise excellent, but the one thing the member needs next — a fresh link — takes 3+ manual steps and is only described in prose, not offered as an action. Not a safety/authorization/privacy regression (recovery is still reachable), so severity stays honest at medium.
- Customer journey: account recovery / verification (coordination → recovery), unauthenticated entry from an email link
- Surface: `web` (both viewports; same components)
- Environment and viewport/device: dev server localhost:3000, real Chromium, observed 2026-07-01 at 1280px and 375px
- Found by: Experience & Design Explorer (reset-password / verify-email × completeness-of-states pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-login-rate-limited-state-no-recovery-guidance` (same "recovery path not surfaced" theme, but on the login *error* state — different surface and trigger; this one is the reset/verify *confirm* dead-ends), `CX-20260630-session-management-web-session-not-listed` (account-security surface where resend-verification lives)

## Customer outcome

As a cautious adult who clicked a password-reset or email-verification link from my inbox and hit a dead end (the link was missing its token, malformed, expired, or already used), I want a single obvious action to get a fresh link — right here on the page — so I can recover access without hunting for a collapsed panel and re-typing my email, at the exact moment I am already anxious about being locked out.

## What I observed

Both recovery-confirm surfaces render calm, well-designed, on-brand cards and cover their states thoroughly — **but neither offers a direct action to obtain a fresh link**; the forward action is only generic navigation, while the copy *tells* the member to go get a new link elsewhere.

Reset-password (`/reset-password`), measured at 1280 and 375px:
- No token → `role="alert"`: "This reset link is missing its secure token. Open the full link from your email or start the recovery flow again." Only action offered: **"Back to sign in"**.
- Malformed token (`?token=not-a-valid-token`) → `role="alert"`: "This reset link is invalid. Request a fresh recovery link from the sign-in page." Only action: **"Back to sign in"**.
- Valid-format but non-existent token, then submit a strong matching password → server responds and the card shows `role="alert"` "This reset link is invalid." with, again, only **"Back to sign in"**.
- The copy explicitly says *"start the recovery flow again"* / *"Request a fresh recovery link from the sign-in page,"* yet the actual request form (**"Forgot your password?"**) lives inside a **collapsed `<details>` panel on `/login`** (`ForgotPasswordPanel`). So the member must: (1) click "Back to sign in", (2) find and expand the collapsed "Forgot your password?" panel, (3) re-enter their email. Three steps and a hunt, described in prose but never offered as a link.

Verify-email (`/verify-email`), measured at 1280 and 375px:
- No token → h1 "Verification link missing", body: "Open the full link from your email, or sign in to request a fresh verification attempt from account security." Actions: **"Sign in" / "Create account"** only.
- Malformed token → h1 "Verification link invalid". Same two generic actions.
- Valid-format but non-existent token → after a brief loading state ("Verifying your email" / "Checking secure token...") the card resolves to h1 "Verification could not finish", body "This verification link is invalid." Same two generic actions.
- The resend control (`EmailVerificationControls`) is real but sits behind auth on `/profile` ("account security"). The guidance ("sign in to request a fresh verification attempt from account security") is at least directionally right, but there is no deep link and — for a member whose whole problem is that they can't get in — "sign in first" can itself be the blocker.

Positives worth preserving: no layout overflow at 1280 or 375 on any state; correct `role="alert"` (errors) and `role="status"` (success/loading) semantics; anti-enumeration is respected (fake tokens return a generic "invalid", never revealing whether an account/email exists); client-side "Passwords do not match." validation fires before submit; the honest verify note ("confirms inbox access only… does not verify identity, age, location accuracy, or in-person safety") is excellent trust copy; password inputs use `autocomplete="new-password"`. This ticket is only about the missing one-click recovery action on the dead-end states.

## What I expected

On a dead reset/verify link, the primary action should be the thing the member actually needs next: **"Send me a new reset link" / "Send a new verification link"** — either inline on the card (email field + submit, mirroring the anti-enumeration "if an account exists, a link is on its way" response) or a direct link straight to the request flow with the panel already expanded (e.g. `/login?recover=1#forgot-password` that opens the ForgotPasswordPanel focused). The prose instruction should be replaced by (or paired with) that real action, so no member has to read a sentence, navigate away, and reconstruct the flow by hand.

## What I expected to avoid (guardrails)

Anti-enumeration must be preserved: a fresh-link request from these pages must still respond identically whether or not the email exists (no "no such account" leak). No dark patterns — do not fabricate urgency ("link expires in 30s!") or bury the safe path. Keep the honest verify disclaimer. Do not weaken token validation or expiry to make recovery easier. If the resend action requires auth (verify-email case), say so plainly and link directly to the exact account-security control, not a generic "Sign in".

## Reproduction

1. Open `/reset-password` with no token, then with `?token=not-a-valid-token`, then with a syntactically valid but non-existent `?token=sdp_<43 url-safe chars>` and submit a strong matching password. Each dead-end offers only "Back to sign in" — no way to request a fresh link here.
2. Open `/verify-email` with no token, a malformed token, and a valid-format non-existent token. Each resolves to a dead-end offering only "Sign in / Create account".
3. Note that the copy points you to "the recovery flow" / "account security" but neither is one click away, and the reset request form is collapsed inside a `<details>` on `/login`.

Reproduction rate: `2/2 viewports (1280 + 375), all six token states, same build`

## Customer impact

Practical: a locked-out member who followed an expired or reused link is made to do extra navigation and re-typing at the worst possible moment; the friction increases abandonment right at recovery. Emotional: the page tells you what to do but doesn't help you do it, which reads as slightly cold at a moment that should feel reassuring. Accessibility: no keyboard trap or focus loss observed and semantics are correct, so this is a wayfinding/state-completeness gap, not an a11y regression. No authorization, privacy, or precise-location dimension — recovery remains reachable and anti-enumeration is intact; the gap is that the *fastest safe recovery* is described rather than offered.

## Evidence and limits

- Evidence: live DOM probe of all six states at 1280 and 375px — captured each state's h1, intro, `role="alert"`/`role="status"` text, the full list of offered actions (hrefs), form presence, and `documentElement` overflow (false everywhere). Redacted screenshots of `/verify-email` (valid-format fake token → "Verification could not finish") and `/reset-password` (submit fake token → "This reset link is invalid.") saved to scratchpad (not committed). Submitting a fake-but-valid-format reset token returned a generic "This reset link is invalid." (no account-existence leak). Client mismatch validation produced "Passwords do not match." before any network call.
- Redactions made: synthetic/placeholder tokens only (all-`A` filler); no real email, no real recovery token, no PII. Screenshots kept out of Git.
- Facts: `apps/web/src/components/PasswordResetConfirmCard.tsx` (missing/invalid/submit-error states each render only a `<Link href="/login">Back to sign in</Link>`); `apps/web/src/components/EmailVerificationConfirmCard.tsx` (all non-success states render only `Sign in` / `Create account`); the reset request form is `apps/web/src/components/ForgotPasswordPanel.tsx`, mounted collapsed inside `apps/web/src/components/LoginForm.tsx`; resend-verification is `apps/web/src/components/EmailVerificationControls.tsx`, rendered only on `apps/web/src/app/profile/page.tsx` (auth-gated); token format gate in `apps/web/src/lib/auth-flow.ts`.
- Hypotheses to verify during implementation: whether an inline email→request form (best for reset) vs. a focused deep-link to the existing panel is cleaner; the correct anti-enumeration copy to reuse from the password-reset request response; whether verify-email should expose an unauthenticated "resend" or keep it auth-gated but deep-link precisely.
- Paths or surfaces not tested: a genuinely *expired* (410) reset/verify token and the 503 "temporarily unavailable" verify branch (delivery is not live in this env, so those server states weren't triggerable here); the already-verified success branch; real assistive-tech end-to-end (semantics look correct structurally).

## Duplicate check

- Search terms used: reset-password, verify-email, recovery, forgot password, resend, fresh link, dead end, expired token, invalid token, Back to sign in, account security.
- Tickets reviewed: full queue — especially `login-rate-limited-state-no-recovery-guidance` (recovery-not-surfaced on the login error state), `session-management-web-session-not-listed` (account-security surface).
- Why this is new: the login ticket is about surfacing "Forgot your password?" from a *rate-limited login error*; this ticket is about the *reset/verify confirm dead-ends* (missing/malformed/invalid/expired token) offering no direct recovery action of their own. Different surfaces, different triggers, independently fixable. Cross-linked, not duplicated.

## Acceptance criteria

- [ ] On every dead-end reset state (missing token, malformed token, invalid/expired on submit), the card offers a **direct action to request a fresh reset link** — either an inline email→submit form or a link that lands the member on the request flow with the "Forgot your password?" panel already expanded and focused — not merely prose telling them to go elsewhere.
- [ ] On every dead-end verify state (missing/invalid/expired/error), the card offers a **direct, precise path to request a fresh verification link** (deep link to the exact account-security control if auth is required), not just generic "Sign in / Create account".
- [ ] Requesting a fresh link from these pages preserves anti-enumeration: the response is identical whether or not the email exists (no account-existence leak); copy matches the existing password-reset request response.
- [ ] "Back to sign in" (reset) and "Sign in / Create account" (verify) remain available as secondary options; the new recovery action is the primary/leading one.
- [ ] Honest copy preserved: the verify disclaimer ("confirms inbox access only… does not verify identity, age, location, or in-person safety") stays; no manufactured urgency; no dark patterns.
- [ ] Layout stays usable and overflow-free at 375px and 1280px; new controls keep ≥44px touch targets and visible focus; error/success keep `role="alert"`/`role="status"`; `autocomplete="new-password"` preserved.
- [ ] No precise location or account-existence data exposed; token validation/expiry unchanged.
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (reset-password / verify-email × completeness-of-states pass); status `ready`. Six token states probed live at 1280 + 375px on both surfaces; strengths (state coverage, anti-enumeration, honest copy, correct roles, no overflow) noted; the single gap is the absent one-click recovery action on the dead-end states.
