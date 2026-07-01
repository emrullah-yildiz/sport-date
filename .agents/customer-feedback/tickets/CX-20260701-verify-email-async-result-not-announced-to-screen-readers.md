# CX-20260701-verify-email-async-result-not-announced-to-screen-readers

- Status: `in-progress`
- Severity: `high`
- Priority: `P1 high` — (Reach 3 × Impact 4 × Confidence 5) / Effort 2 = 30. Accessibility floor: an assistive-technology member who follows a verification link is never told the outcome (verified / expired / error) because the result is written by an automatic post-load state swap into a non-live `<h1>`. Per the loop's priority rule, accessibility regressions are never below P1 regardless of the arithmetic. Not a privacy/authorization issue.
- Customer journey: signup → trust check → email verification (first trust gate), unauthenticated entry from an inbox link
- Surface: `web` (both viewports; single client component)
- Environment and viewport/device: dev server localhost:3000; source-verified against `apps/web/src/components/EmailVerificationConfirmCard.tsx` and `apps/web/src/app/globals.css`, 2026-07-01
- Found by: Experience & Design Explorer (verify-email × accessibility / completeness-of-states pass)
- Implementation owner: `Experience Build Agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-reset-verify-dead-link-no-direct-recovery-path` (same surface, but that one is about the missing one-click *recovery action* on dead-end states; this one is about the *result of the auto-verification never being announced* — different outcome, independently fixable), `CX-20260701-join-request-commitment-hard-reload-no-confirmation` (the same announce-the-async-result + move-focus fix pattern, already applied to the join flow), `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (sibling "success not announced / focus dropped" a11y theme)

## Customer outcome

As a member who uses a screen reader (or otherwise cannot see the screen change) and just clicked the "verify your email" link from my inbox, I want to actually be *told* whether verification succeeded, expired, or failed — not left hearing "Verifying your email…" while the page silently rewrites itself — so I know whether my first trust gate is cleared and what to do next.

## What I observed

`/verify-email` renders `EmailVerificationConfirmCard`, a client component whose entire outcome is communicated by swapping the visual `<h1>{state.title}</h1>` and `<p class="auth-intro">{state.body}</p>`. On mount it POSTs to `/api/auth/email-verification/confirm` inside a `useEffect`, so the state transition is **automatic and asynchronous, not triggered by any member action**:

1. Page loads → the h1 reads "Verifying your email" and a plain `<span class="auth-flow-status">Checking secure token…</span>` shows.
2. ~200 ms–2 s later the fetch resolves and the component silently rewrites the h1/body to one of: "Email verified", "Email already verified", "Verification link expired", "Verification temporarily unavailable", or "Verification could not finish".
3. **None of these regions is a live region and focus never moves.** There is no `role="status"`, no `role="alert"`, no `aria-live`, and no `aria-busy` anywhere in the component. The `auth-flow-status` "Checking secure token…" text is a bare `<span>` with no role.

Net effect for a non-sighted member: assistive tech announces "Verifying your email" once, then the meaningful result (success or a recoverable error) is written to the DOM with no announcement and no focus change. The member is left believing verification is still in progress, or must manually re-read the page to discover it changed — at the very first trust gate of the product.

This is materially worse than a normal form result because the change is **not user-initiated**: there is no submit button after which a screen-reader user would think to go re-check for a result. By contrast the sibling `PasswordResetConfirmCard` on `/reset-password` *does* announce its outcomes correctly — success is `<p role="status">` and errors are `<p role="alert">` — but that card changes state in response to the member's own submit click, so the gap is specific to the auto-verifying email card.

Positives worth preserving: the visual states are calm, on-brand, and complete (missing / invalid / loading / verified / already_verified / expired / unavailable / error all handled); the h1 is dark ink on white so contrast is fine; the honest disclaimer ("Email verification confirms inbox access only. It does not verify identity, age, location accuracy, or in-person safety.") is excellent trust copy and must stay; forward links are ≥44px `btn-primary`/`btn-secondary`. This ticket is only about making the async result perceivable to assistive technology.

## What I expected

When the verification result resolves, a screen-reader member should hear it. Concretely:

- Render the outcome title/body inside a polite live region (`role="status"` / `aria-live="polite"`) — or move keyboard focus to the resolved heading (make the outcome `<h1>`/a container `tabIndex={-1}` and focus it), mirroring the pattern already shipped for the join-request confirmation (`CX-20260701-join-request-commitment-hard-reload-no-confirmation`).
- While confirming, expose the pending state programmatically (e.g. `aria-busy` on the card and/or the "Checking secure token…" text as a `role="status"`), so the loading state is announced, not just shown.
- Error outcomes (expired / unavailable / could-not-finish) should be announced assertively enough to be noticed (`role="status"` at minimum; `role="alert"` is acceptable for the hard-error branch), so a member who needs a fresh link learns they need one.

## What I expected to avoid (guardrails)

Keep anti-enumeration intact — the announced copy must not reveal whether an account/email exists (the existing generic "invalid" copy is fine). Do not add manufactured urgency or dark patterns. Preserve the honest verify disclaimer verbatim. Do not weaken token validation, expiry, or the `isBrowserEmailVerificationToken` format gate to make the flow "announce faster". A focus move must not create a keyboard trap and must not steal focus away mid-typing (there is no input on this card, so a focus-to-heading is safe here).

## Reproduction

1. Open `/verify-email?token=<valid-format-but-non-existent token>` (e.g. `sdp_` + 43 url-safe filler chars) with a screen reader active.
2. Observe: the reader announces "Verifying your email"; after the confirm POST resolves, the h1 silently becomes "Verification could not finish" / "Verification link expired" with **no new announcement and no focus change**.
3. Repeat with a missing token (`/verify-email`) and a malformed token — same absence of any live region, though those two resolve synchronously in `initialState` so at least the initial render is the final state; the *async* branches (any real/expired/fake-format-valid token) are the ones that swap silently after load.
4. Inspect the component: `EmailVerificationConfirmCard.tsx` contains zero `role`/`aria-live`/`aria-busy` attributes.

Reproduction rate: `source-confirmed; 0 aria attributes in the component; every async branch swaps a non-live <h1>`

## Customer impact

Accessibility: a screen-reader or cognitively-assisted member cannot perceive the result of their first trust action without manually re-exploring the page; the pending state can be mistaken for a stall. This is an accessibility gap at the very first gate, so it disproportionately affects members who most need clear system feedback. Emotional: silence at "did my verification work?" is exactly the moment that should feel reassuring. No authorization, privacy, precise-location, or account-existence dimension — token handling and anti-enumeration are unchanged; the gap is purely that a non-user-initiated state change is announced to no one.

## Evidence and limits

- Evidence: source read of `apps/web/src/components/EmailVerificationConfirmCard.tsx` (state swaps only `<h1>`/`<p class="auth-intro">`; the confirm POST fires in a mount `useEffect`; `auth-flow-status` is a bare `<span>`); a grep for `role=|aria-live|aria-` in that file returns **no matches**; `globals.css:467` `.auth-flow-status` has visual styling only. Compared against `PasswordResetConfirmCard.tsx`, which uses `role="status"` (success) and `role="alert"` (errors) correctly.
- Redactions made: only synthetic/placeholder tokens referenced; no real email, token, or PII.
- Facts: the verification card has no live region and does not move focus on the async result; the reset card does announce (but is user-submit-driven, not auto-async); the confirm route returns 200/verified, 200/already_verified, 410/expired, 503/unavailable, 400/invalid, 500/error — every non-initial branch is reached via the post-load fetch and written into the non-live h1.
- Hypotheses to verify during implementation: whether a live region alone is sufficient or a focus move to the resolved heading is warranted (join-flow precedent used focus + polite announce); whether the pending "Checking secure token…" should be `role="status"` or `aria-busy` on the card.
- Paths or surfaces not tested with real assistive tech end-to-end: a genuinely *expired* (410) and *503 unavailable* live token were not triggerable in this env (delivery is not live); the absence of any live region is structural in source, so it applies to those branches too.

## Duplicate check

- Search terms used: verify-email, email verification, aria-live, role=status, announce, screen reader, focus, account security, resend.
- Tickets reviewed: full queue — especially `reset-verify-dead-link-no-direct-recovery-path` (same surface), `join-request-commitment-hard-reload-no-confirmation` and `feedback-success-flat-dead-end-no-forward-path` (same announce/focus a11y pattern on other surfaces).
- Why this is new: the existing verify-email ticket is scoped explicitly to the *missing one-click recovery action* on dead-end states ("This ticket is only about the missing one-click recovery action") and assessed the reset card's roles as correct; it does not address the verify card's async result being announced to no assistive tech. This is a distinct, independently fixable accessibility outcome (add a live region / focus move to `EmailVerificationConfirmCard`). Cross-linked, not duplicated.

## Acceptance criteria

- [ ] When the automatic verification result resolves (verified / already_verified / expired / unavailable / error), the outcome is announced to assistive technology via a live region (`role="status"`/`aria-live="polite"`, or `role="alert"` for the hard-error branch) and/or keyboard focus is moved to the resolved heading — a member using a screen reader is told the result without manually re-reading the page.
- [ ] The pending state is exposed programmatically while confirming (e.g. `aria-busy` and/or the "Checking secure token…" text as a `role="status"`), so "verifying" is announced, not only shown.
- [ ] A focus move (if used) does not trap the keyboard and there is no input on the card to steal focus from; tab order remains sensible and the forward action links stay reachable.
- [ ] Anti-enumeration preserved: announced copy never reveals whether an account/email exists; the generic "invalid" copy is retained.
- [ ] The honest disclaimer ("confirms inbox access only… does not verify identity, age, location accuracy, or in-person safety") is preserved verbatim; no manufactured urgency or dark patterns; token validation/expiry unchanged.
- [ ] Layout stays usable and overflow-free at 375px and 1280px; forward links keep ≥44px touch targets and visible focus; contrast unchanged (h1 stays dark ink on white).
- [ ] Relevant automated tests and repository checks pass (add a unit test asserting the resolved state renders inside a live region / receives focus for at least the verified and expired branches).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (verify-email × accessibility / completeness-of-states pass); status `ready`. Source-confirmed the component has zero `role`/`aria-live`/`aria-busy` and swaps the outcome into a non-live `<h1>` via a mount-time `useEffect` fetch; contrasted with the sibling reset card that announces correctly; deduped against the recovery-action ticket on the same surface.
- 2026-07-01 - Experience Build Agent (Claude Opus 4.8) took ownership; status `in-progress`. Implementing the announce-the-async-result + move-focus fix on `EmailVerificationConfirmCard` mirroring the shipped `JoinRequestControls`/reset-card pattern.
