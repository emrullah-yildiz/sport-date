# CX-20260703-reset-password-requirements-hidden-until-error

- Status: `ready`
- Priority: `P2` — RICE (3 reach × 1.0 impact × 0.9 confidence) / 0.5 effort = 5.4. Friction at a security-recovery moment; small copy/markup fix.
- Severity: `medium`
- Customer journey: Setting a new password from a recovery link (`/reset-password`).
- Surface: `web`
- Environment and viewport/device: `/reset-password` confirm card, all viewports. Source-based audit, 2026-07-03.
- Found by: experience-design-explorer (source audit)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-reset-password-form-stays-active-after-token-rejected` (archived — token-rejection dead-end), `CX-20260701-reset-verify-dead-link-no-direct-recovery-path` (archived — missing-link recovery). Both are about recovery/dead-ends; neither addresses the password-rules copy.

## Customer outcome

As a member choosing a new password, I want to see the actual requirements before I submit, so that I meet them on the first try instead of learning the 12-character minimum only after a rejected attempt.

## What I observed

The reset form states its requirements in prose that omits the enforced minimum length:

`apps/web/src/components/PasswordResetConfirmCard.tsx:83-85`
```
"Use a long private phrase with upper-case, lower-case, and numeric
 characters. We keep your profile private until trust signals are in place."
```

But the validation actually enforced on submit is stricter and specific:

`apps/web/src/lib/auth-flow.ts:20-23`
```
if (password.length < 12) errors.push("Password must be at least 12 characters.");
if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))
  errors.push("Password must include upper-case, lower-case, and numeric characters.");
```

The copy says only "long" — the concrete **12-character minimum is never shown up front**. A member who enters, say, a 9-character mixed-case-with-digit password (which satisfies every stated rule) is bounced with a surprise "Password must be at least 12 characters." after submitting (`PasswordResetConfirmCard.tsx:194-200` shows the first validation error only).

Additionally, both password inputs are masked with no reveal control (`PasswordResetConfirmCard.tsx:103-119`), so a member composing a 12+ character complex password twice cannot verify what they typed — compounding the retry loop.

## What I expected

The requirements should be visible before submission and match what is enforced: at least 12 characters, plus upper-case, lower-case, and a number. Ideally shown as a short static checklist near the fields (not just after an error), so the member succeeds on the first attempt. A show/hide toggle on the password field would further reduce mistyped-password retries.

## Reproduction

1. Open a valid `/reset-password?token=...` link.
2. Enter a password that meets the stated rules but is under 12 characters (e.g. `Abcdef1g`), confirm it, submit.
3. Observe the first-time-visible error "Password must be at least 12 characters." — a rule never stated in the form copy.

Reproduction rate: `1/1 safe attempts` (deterministic: copy omits the length rule that validation enforces).

## Customer impact

Practical: avoidable failed submissions at a moment the member is often already frustrated (locked out, resetting). Emotional/trust: hidden rules that only surface as errors feel like the system is testing you. No authorization, privacy, safety, or data-loss dimension. Accessibility: error-only discovery is worse for screen-reader users, who must round-trip through a submit + alert to learn a rule that could be stated once, up front and programmatically associated with the field.

## Evidence and limits

- Evidence: copy `PasswordResetConfirmCard.tsx:83-85`; enforced rules `auth-flow.ts:20-23`; single-error surfacing `PasswordResetConfirmCard.tsx:194-200`; masked-only inputs `PasswordResetConfirmCard.tsx:103-119`.
- Redactions made: none (no secrets/personal data).
- Facts: the form copy states case+numeric but not the 12-char minimum; validation enforces 12.
- Hypotheses to verify during implementation: whether the same requirements copy is (or should be) shared with the signup password field so the rule statement stays in one place; confirm `validateBrowserPasswordStrength` remains the single source of truth so the checklist can't drift from enforcement.
- Paths or surfaces not tested: the signup password field (out of this pass's scope; flag for follow-up if it shares the same understated copy).

## Duplicate check

- Search terms used: `password strength`, `password requirement`, `12`, `character minimum`, `choose a new password`, `reveal/show password`, across `tickets/` and `tickets/archive/`.
- Tickets reviewed: `CX-20260702-reset-password-form-stays-active-after-token-rejected` (token rejection, not rules), `CX-20260701-reset-verify-dead-link-no-direct-recovery-path` (dead-link recovery), `CX-20260701-login-rate-limited-state-no-recovery-guidance` (login rate limit).
- Why this is new, or which existing ticket was updated: no ticket addresses the stated-vs-enforced password requirements mismatch on the reset form.

## Acceptance criteria

- [ ] The reset form states the actual requirements before submission, including the 12-character minimum, matching `validateBrowserPasswordStrength` exactly.
- [ ] The requirements text is programmatically associated with the password field (e.g. `aria-describedby`) so it is announced to screen-reader users, not only surfaced as a post-submit error.
- [ ] The requirements are sourced so they cannot drift from the enforced validation (shared constant/helper or a single copy source).
- [ ] (Optional within scope) A show/hide toggle lets the member verify the typed password; if added it has a >=44px target, visible focus, and an accessible name reflecting its state.
- [ ] ~~Loading, empty, failure, and retry behavior is appropriate.~~ Partially N/A — submit/retry states already exist and are unchanged; this ticket only adds up-front requirement disclosure.
- [ ] ~~No precise location or other sensitive data is exposed.~~ N/A — no location data on this surface.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
