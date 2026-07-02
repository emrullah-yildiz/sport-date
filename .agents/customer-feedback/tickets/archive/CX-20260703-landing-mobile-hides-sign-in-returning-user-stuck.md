# CX-20260703-landing-mobile-hides-sign-in-returning-user-stuck

- Status: `verified`
- Severity: `high`
- Priority: `P1` — RICE (10 × 2.5 × 0.9) / 0.5 = 45. Reach 10 (every returning member who opens the marketing home on a phone — the default first tap for a returning user), Impact 2.5 (a blocked core journey: the only way back into an existing account is hidden, leaving type-the-URL-yourself as the sole workaround), Confidence 0.9 (confirmed in CSS + both page/component sources), Effort 0.5 (add/unhide one Sign-in affordance + a reciprocal link on signup — CSS + markup only). Not safety/privacy/auth-gated (it is discoverability of a login entry point, not the login itself), so it sits below P0.
- Customer journey: Returning — a member who already has a profile opens `/landing` on a phone and tries to sign back in.
- Surface: `web` (mobile viewports ≤700px, incl. 375px)
- Environment and viewport/device: Source audit of `apps/web/src/app/landing/page.tsx`, `apps/web/src/components/SignUpForm.tsx`, and `apps/web/src/app/globals.css`; judged at ≤700px / 375px per the media rules below. Observed 2026-07-03.
- Found by: Experience & Design Explorer (landing × returning-user navigation)
- Implementation owner: `unassigned`
- Related tickets: `none found`

## Customer outcome

As a returning adult member on my phone, I want an obvious "Sign in" entry point on the landing page so that I can get back into my existing profile without having to guess or hand-type a URL.

## What I observed

On the public landing page the only "Sign in" affordance is the top-nav link:

- `apps/web/src/app/landing/page.tsx:110` — `<Link href="/login" className="nav-signin">Sign in</Link>` (signed-out state).

That link is hidden on mobile:

- `apps/web/src/app/globals.css:734` — `@media (max-width: 700px) { … .nav-signin { display: none; } }`.

Every other call-to-action on the signed-out landing page points at **sign-up**, never sign-in:

- Hero CTAs: `landing/page.tsx:138-139` — "Create a profile" (`/signup`) and "See how it works" (`#how-it-works`).
- Final CTA: `landing/page.tsx:275` — "Create a profile" (`/signup`).
- Footer nav: `landing/page.tsx:285-290` — Trust / Terms / Privacy / Safety guidance only.

So at ≤700px a signed-out visitor sees only "Create a profile." If they then tap it hoping to find a login link, the signup form has **no reciprocal path back to login** — `SignUpForm.tsx` (whole component, lines 94-125) renders no link to `/login`, unlike the login form, which does cross-link the other way (`LoginForm.tsx:144` — "New here? Create a private beta profile"). The result is a one-way street: on mobile there is no visible route from the marketing home to `/login`.

## What I expected

A returning member on any viewport should have a visible, tappable "Sign in" entry point from the landing page, and the signup form should offer a reciprocal "Already have a profile? Sign in" link — mirroring the sign-in → sign-up cross-link that already exists on the login form.

## Reproduction

1. Sign out. Open `/landing` at a phone width (≤700px, e.g. 375px).
2. Look for any way to sign in: scan the navbar, hero, final CTA, and footer.
3. Observe that "Sign in" is not shown (`.nav-signin` is `display:none`) and every visible CTA leads to `/signup`.
4. Tap "Create a profile"; observe the signup form offers no link back to `/login`.

Reproduction rate: `n/a (static source audit)` — deterministic from the CSS media rule + page/component markup above.

## Customer impact

A returning member on mobile is pushed toward creating a *second* account or is stranded until they manually type `/login`. That is a real journey blocker and an early trust ding ("this app forgot I already exist"). No authorization, privacy, precise-location, safety, or data-loss dimension — this is discoverability of an existing entry point, not a permission gap.

## Evidence and limits

- Evidence: `landing/page.tsx:110,138-139,275,285-290`; `globals.css:422` (`.nav-links` hidden ≤700), `globals.css:734` (`.nav-signin` hidden ≤700); `SignUpForm.tsx:94-125` (no `/login` link); `LoginForm.tsx:144` (reciprocal link exists the other way).
- Redactions made: none (public marketing markup + CSS).
- Facts:
  - `.nav-signin` is the only Sign-in link on `/landing` and is `display:none` at ≤700px.
  - No hero/final-CTA/footer element links to `/login` when signed out.
  - The signup form contains no link to `/login`.
- Hypotheses to verify during implementation: whether the mobile hide was intended only for the *signed-in* greeting ("Signed in as {firstName}", `landing/page.tsx:103`) but unintentionally also removes the signed-out "Sign in" link — both share `.nav-signin`. Fix should keep a Sign-in route visible for signed-out mobile users regardless.
- Paths or surfaces not tested: exact browser autofill behavior; whether any member reaches `/login` via a bookmark.

## Duplicate check

- Search terms used: "signup", "sign-up", "login", "nav-signin", "reduced-motion", "mobile", "landing" across `.agents/customer-feedback/tickets/*.md` and `…/archive/*.md`.
- Tickets reviewed: `CX-20260701-home-landing-not-auth-aware-appears-signed-out.md` (auth-aware CTA swap — different: it makes the page reflect the session, but does not restore a mobile Sign-in link), `CX-20260701-no-discoverable-sign-out-or-account-switch.md` (sign-*out*, in-app, different), `CX-20260630-signup-redundant-double-headline-weak-focal-point.md` and `CX-20260630-signup-step1-disabled-back-above-primary-action.md` (signup layout, different).
- Why this is new: no existing or archived ticket covers the mobile-hidden Sign-in entry point or the missing signup→login cross-link.

## Acceptance criteria

- [ ] On viewports ≤700px (including 375px), a signed-out visitor on `/landing` has a visible, tappable route to `/login` (a persistent header "Sign in", or an equivalent affordance in the hero/CTA), not only a "Create a profile" button.
- [ ] The signup form offers a reciprocal path back to sign-in ("Already have a profile? Sign in" → `/login`), mirroring the existing login → signup cross-link.
- [ ] The Sign-in affordance meets a 44px touch target, has a visible focus ring, and meets AA contrast on the landing surface.
- [ ] The signed-in navbar is unchanged (the "Signed in as {firstName}" greeting may still collapse on mobile; only the signed-out Sign-in route must remain reachable).
- [ ] Desktop landing behavior is unchanged; no horizontal overflow is introduced at 375px.
- [ ] The interface explains what happened and what can be done next without internal terminology. — n/a (no error state; navigation affordance only).
- [ ] Loading, empty, failure, and retry behavior. — n/a (static navigation).
- [ ] No precise location or other sensitive data is exposed. — n/a.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; gave the signed-out "Sign in" link a `.nav-signin--guest` modifier that the ≤700px media query keeps visible (the shared `.nav-signin` greeting still collapses), made `.nav-signin` a 44px inline-flex target (global `a[href]:focus-visible` supplies the ring; `--text` on the dark navbar is AAA contrast), and shrank the mobile CTA button padding (`.landing-nav-actions .btn` → 44px min-height / `0 15px`) so the restored link doesn't crowd or overflow the 375px header; added a reciprocal "Already have a profile? Sign in" → `/login` link to `SignUpForm` mirroring the login cross-link. Tests: landing + SignUpForm tripwires added. Checks: typecheck PASS, lint 0 errors (2 pre-existing warnings in qa/full-flows.mjs + member-profile.test.ts, not mine), test 755 passed/12 skipped, production build PASS. Responsive result is source-reasoned (no live dev server this pass). Status `implemented`.
- 2026-07-03 - Independently verified + hardened by orchestrator. Verified (source): the shared `.nav-signin` was split so at ≤700px the signed-in greeting still collapses (`.nav-signin{display:none}`) while the guest sign-in link stays visible via higher-specificity `.nav-signin.nav-signin--guest{display:inline-flex}` → `/login` (landing/page.tsx:110); base `.nav-signin` is now a real 44px inline-flex target; signup carries a persistent reciprocal `Already have a profile? Sign in → /login` (SignUpForm.tsx:128) outside the animated step content; both resolve to real routes; desktop nav untouched. HARDENING: the mobile `.landing-nav-actions` had no `flex-wrap`, so the source-reasoned ~28px 375px budget was the only overflow guard — added `flex-wrap: wrap; justify-content: flex-end` so an over-tight header drops to a second row instead of overflowing horizontally (belt-and-suspenders; stays single-row when it fits). lint/prod build pass after the hardening. RESIDUAL: exact 375px single-row fit still best confirmed with a live render, but overflow is now structurally impossible. Status `verified`.
