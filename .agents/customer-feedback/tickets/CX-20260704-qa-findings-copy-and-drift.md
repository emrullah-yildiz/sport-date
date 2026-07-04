# CX-20260704-qa-findings-copy-and-drift

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — member-visible defects found by the User-simulator QA pass (2026-07-04). Small, high-confidence fixes.
- Customer journey: signup + discovery — copy that's off-brand or contradicts current behavior.
- Surface: registration domain, discover page, signup form, (optional) migration safety
- Environment and viewport/device: web
- Found by: User-simulator QA pass (2026-07-04)
- Implementation owner: `agent`

## Findings to fix

1. **Off-brand "Sport Date" string (member-visible).** `packages/domain/src/registration.ts:~280` returns `"You must be 18 or older to use Sport Date."` — shown on the onboarding birthday step + final validation. Everything else is "KeepItUp". → Use the brand name (source from `BRAND_NAME` / lib/brand, or hardcode "KeepItUp" if domain can't import the web brand lib). Search the domain + web for any other member-visible "Sport Date" strings and fix them too (keep internal package names like `@sport-date/*` as-is).

2. **Discovery empty-state copy contradicts the new no-sport-gating.** `apps/web/src/app/discover/page.tsx:~178-182` (and the near-me note ~line 131). A member with no profile sport and zero results is told "We match you to events by the sports in your profile… Add a sport… your matches will start showing up here" — implying a sport gate that **no longer exists** (discovery is no longer gated by profile sport, per CX-20260704-discovery-not-gated-by-profile-sport). The area note also says "events that fit **your sports** and age range" to someone with none. → Rewrite for sportless members so it does NOT blame a missing sport: e.g. "No events open near you yet — try 'Search everywhere' or host the first one." Frame adding sports as *improving/refining* matches, not *unlocking* them.

3. **Signup success copy may drift from LIVE email delivery.** `apps/web/src/components/SignUpForm.tsx:~122` says "Email verification delivery is not active yet … once delivery is approved." Email delivery is now **LIVE in production via Gmail**. Ensure this success copy + the verification-request states reflect the ACTUAL runtime delivery state (dynamic), not a hardcoded "not active" message. If already dynamic (keyed off the delivery/verification state), confirm prod shows the live-delivery wording and leave the dark-state copy for when it's off; if hardcoded, make it reflect state.

## Acceptance criteria

- No member-visible "Sport Date" strings remain (18+ error + anywhere else); brand reads "KeepItUp".
- Discovery empty-state + area note make sense for a member with no profile sport (no implication that a sport is required to see events).
- Signup success/verification copy matches the deployed email-delivery state (live in prod).
- typecheck / lint / test / prod build green; update/adjust any tests asserting the changed strings (e.g. registration domain tests, discover copy tests, SignUpForm tests).
- Docs unaffected.

## Also (low priority, note only — NOT a prod emergency)

- Finder flagged migration-drift risk (code needing an unapplied migration → signup 500). **Prod is SAFE** (auto-migrate-on-deploy applied 038; verified the columns exist). Optional hardening for a future ticket: a readiness/startup check that fails closed if the running code references columns from an unapplied migration. Do NOT scope into this ticket unless trivial.

## Process

- No migration. `git pull --rebase` first. Full DoD. COMMIT AND PUSH to main. Don't touch `apps/web/public/*.html` or `docs/marketing/**`. Report commit hash + test counts + which strings changed.
