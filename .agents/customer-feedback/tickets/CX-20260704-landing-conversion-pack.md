# CX-20260704-landing-conversion-pack

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — first cold Instagram traffic (all mobile) starts hitting /landing on 2026-07-04; these are the audited top conversion leaks.
- Customer journey: cold IG visitor taps bio link → /landing → understands it's for them (incl. dating) and that they can get in → signup completes on a phone.
- Surface: `/landing` hero + `SignUpForm` step order
- Environment and viewport/device: mobile-first web
- Found by: funnel/SEO audit (Explore agent, 2026-07-04, CEO-commissioned)
- Implementation owner: `agent`

## Task (three audited fixes)

1. **Hero must show the intents.** The three intents (dating / friendship / community) only appear in body copy (`landing/page.tsx:22`) — a visitor from a dating-angled post can't confirm fit above the fold. Add them to the hero subtitle (e.g. "…for dating, friendship, or community — around a real local game"). Keep the equal-standing framing; no intent is "lesser".
2. **"Private beta" reads as a closed door.** Hero badge says "Private beta · Adults only · Europe first" while the explainer ("no invite is required") hides behind a tap (`BetaTermExplainer.tsx`). Replace the badge wording with an honest open phrasing (e.g. "Early preview · open to adults · Europe first") — do NOT fabricate anything; it genuinely is open, the copy just must say so without a tap.
3. **Move the heavy credentials step out of step 1.** Signup currently demands email + 12-char complex password + DOB + terms before any value (`SignUpForm.tsx:20-27`). Reorder: sports/level/intents first (investment first), account credentials as the final step. Do NOT weaken the password policy itself (12-char complexity stays — security bar is deliberate); this is a sequencing fix, not a security change. Preserve all existing validation, a11y, and the password meter.

## Acceptance criteria

- All three intents visible above the fold on a 390px viewport without scrolling or tapping.
- No copy claims anything unimplemented; "open" wording matches reality (no invite gate exists).
- Signup step order: profile-building steps → credentials last; abandonment-safe (no data loss when navigating back); tests updated for the new order; password rules unchanged.
- typecheck / lint / test / prod build green.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent, implementation owner per ticket).
- 2026-07-04 | build | implemented in commit a73bed7 (pushed to origin/main). (1) Hero subtitle now LEADS with "For dating, friendship, or community — all equally welcome" — verified above the fold at 390×844 via prod-server screenshot. (2) Badge → "Early preview · Open to adults (18+) · Europe first"; BetaTermExplainer label → "What does “early preview” mean?" (points unchanged, still honest); consistent term swap on login cross-link, profile eyebrow, signup metadata, landing final CTA, and the public /e invite note. Terms page untouched (legal/owner surface). (3) Signup order now sports → intent/bio → identity → credentials ("Save your profile") → review, via new pure `lib/sign-up-steps.ts` (SIGN_UP_STEP_ORDER + signUpStepError); password 12-char multi-class policy, DOB 18+ gate, terms, meter, and a11y untouched; store-backed steps → Back loses nothing (walked live end-to-end at 390px, "Ana" survived back-nav). Checks: typecheck ✓ lint ✓ vitest 795 ✓ (10 new tests incl. credentials-last + password-policy-unchanged tripwires) prod build ✓. Unverified: real-device fold variance (small phones <844px tall may need one flick — intents sit directly under the h1); Explorer to retest.

## Why (CEO note)

These three are the difference between paying for traffic with content and converting it. Fix before meaningful spend/volume arrives.
