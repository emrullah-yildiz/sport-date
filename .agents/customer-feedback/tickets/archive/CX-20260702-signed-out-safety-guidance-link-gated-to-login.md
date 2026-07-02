# CX-20260702-signed-out-safety-guidance-link-gated-to-login

- Status: `verified`
- Severity: `high`
- Priority: `P1` — (Reach 5 × Impact 4 × Confidence 5) / Effort 3 = 33. Reach: EVERY signed-out first-time visitor evaluating whether to sign up can hit a "safety guidance" link (landing footer + Trust page). Impact: a cautious adult wants to read the safety posture BEFORE committing PII to signup, and is instead bounced to a login wall — the exact opposite of the honest, safety-first pitch the marketing makes. Confidence: reproduced live (307/308 → /login). Trust/safety involved, so it sits at the top of P1 rather than P2. Effort 3: publish the guidance section to an auth-open surface (or a public read-only guidance route) while keeping report-tracking gated.
- Customer journey: onboarding / trust — signed-out visitor understanding the product before signup
- Surface: `web` (desktop + mobile)
- Environment and viewport/device: dev server localhost:3000, signed OUT, all widths
- Found by: User-simulator (landing → understand-the-product journey, signed-out first-time visitor), 2026-07-02
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-ia-consolidate-guideline-and-legal-pages` (archived/verified — this is a signed-out regression introduced by that consolidation; its acceptance criteria only tested SIGNED-IN reachability of `/safety#guidelines`). Not a duplicate.

## Customer outcome

As a cautious adult evaluating this product while signed out, I want to read the safety guidance ("how to meet safely") before I create an account and hand over my details, so that I can decide whether the product's safety posture is one I trust — without being forced to sign up first.

## What I observed

On the public landing page (signed out) the footer links **"Safety guidance"** to `/safety#guidelines`, and the landing safety section plus the `/trust` page both cross-link the same "safety guidance" destination. Clicking any of them as a signed-out visitor does not show the guidance — it **redirects to `/login`**:

- `GET /safety` (signed out) → **307 → /login**
- `GET /safety-guidelines` (signed out) → **308 → /safety#guidelines** → 307 → /login
- `GET /safety#guidelines` (signed out) → **307 → /login**

The safety guidance content itself (the "How safety works here" accordions: Before the event / During the event / If something feels wrong / What the product does not promise) lives in `apps/web/src/app/safety/page.tsx`, which begins with `const user = await getCurrentUser(); if (!user) redirect("/login");` — so the whole page, guidance included, is auth-gated.

Observed 2026-07-02, reproduced every attempt.

## What I expected

A signed-out visitor who clicks a marketing "Safety guidance" link expects to READ the safety guidance (a public, reassuring, honest explanation of how meeting safely works). The report/case-tracker half of the Safety center can stay gated (it is personal data), but the general guidance the landing and Trust pages point to as the honest safety reference should be readable before signup.

## Reproduction

1. Sign out (or use a fresh browser). Open `/landing`.
2. Click the footer "Safety guidance" link (or open `/trust` and click its "safety guidance" link).
3. Land on `/login` instead of any safety guidance content.

Reproduction rate: `3/3 safe attempts (landing footer, trust cross-link, direct /safety#guidelines)`

## Customer impact

Practical: the product's own honest, safety-first marketing ("Safety is product work", "Here is the honest posture today", "Read how to meet safely") points prospective members at content they cannot reach without an account. Emotional: a cautious first-timer reads a confident safety pitch, clicks to verify it, and hits a login wall — which reads as either a bait-and-switch or a broken link, eroding exactly the trust the page is trying to build. **Trust/safety IS involved.** Authorization: the gate is over-broad (guidance is general, not personal). Privacy: no sensitive data is exposed by fixing this — the report tracker (which does contain personal cases) can remain gated.

## Evidence and limits

- Evidence: live redirects (307/308 → /login) captured signed-out; `apps/web/src/app/safety/page.tsx` L16-19 (`redirect("/login")`); landing footer link `apps/web/src/app/landing/page.tsx` L289 (`/safety#guidelines`); `/trust` cross-link `apps/web/src/app/trust/page.tsx` L66; `/safety-guidelines` 308 shim `apps/web/src/app/safety-guidelines/page.tsx`.
- Redactions made: none needed.
- Facts: `/safety` is entirely auth-gated; the guidance section (`id="guidelines"`) is inside it; three signed-out-reachable surfaces link to it as public "safety guidance".
- Hypotheses to verify during implementation: cleanest fix is likely a public, read-only guidance surface (or making the guidance section render for signed-out users while keeping the case tracker gated). Confirm no other signed-out surface links `/safety*`.
- Paths or surfaces not tested: signed-in behavior (already verified prominent by the consolidation ticket).

## Duplicate check

- Search terms used: "safety", "guideline", "login", "signed out", "redirect", "gate", "landing safety".
- Tickets reviewed: `CX-20260702-ia-consolidate-guideline-and-legal-pages` (archived/verified), `CX-20260701-safety-center-report-tracker-only-no-proactive-guidance-link` (archived), all active safety tickets.
- Why this is new: the consolidation ticket moved guidance into `/safety` and verified SIGNED-IN prominence, but never checked the SIGNED-OUT path; the marketing/trust surfaces still advertise the guidance as public. No ticket covers signed-out access to safety guidance.

## Acceptance criteria

- [ ] A signed-out visitor who clicks "Safety guidance" from the landing footer, the landing safety section, or the `/trust` page reaches readable safety guidance (not `/login`).
- [ ] The personal report/case tracker portion of the Safety center remains authenticated (no member's cases shown to signed-out visitors).
- [ ] No precise location or personal safety-case data is exposed to a signed-out visitor by this change.
- [ ] The guidance surface is legible on the black+neon theme at 375 and 1280, with correct keyboard focus, `<details>` semantics, and AA contrast.
- [ ] Shared/bookmarked `/safety-guidelines` and `/safety#guidelines` links resolve for signed-out visitors without a login bounce.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by User-simulator (landing → understand-the-product, signed-out); status `ready`.
- 2026-07-02 - Implemented by Build agent; status `implemented`. Split chosen (Option B + shared component): the general safety guidance ("How safety works here" accordions + the not-an-emergency-responder line) was extracted into a new shared server component `apps/web/src/components/SafetyGuidelines.tsx` (static, NO member data, no auth) and `/safety` now renders it for EVERYONE. **Now public** for signed-out visitors: the `#guidelines` guidance section, the emergency-services line, a public sign-in/create-profile header, and a calm "your reports stay private to you — sign in to see them" note. **Still gated** (signed-in only): the personal report/case tracker — `getMemberSafetyCases()` is not even *called* when signed out (`const cases = user ? await getMemberSafetyCases(user.id) : []`), so no member/case/location data is fetched or rendered for signed-out visitors (asserted by test). All advertised links now resolve for signed-out visitors: `/safety#guidelines` (landing footer, /trust, terms, privacy, signup, hosting) no longer 307→/login; `/safety-guidelines` (308→/safety#guidelines) resolves; no link targets needed changing. Signed-in members unchanged (tracker + guidance + `#guidelines` anchor). Added `apps/web/src/app/safety/page.test.tsx` (signed-out → guidance 200, no member data, `getMemberSafetyCases` never called; signed-in → tracker + guidance). Anthracite+neon tokens only (globals.css guest-nav/report-note additions), AA, 44px targets on the nav CTAs/summaries, visible focus, `<details>` semantics preserved, no overflow 375/1280. Checks: typecheck PASS, lint 0 errors (2 pre-existing warnings in unrelated files), 572 unit tests + 5 in the two touched suites PASS, `next build` (production) PASS (`/safety` dynamic, `/safety-guidelines` static). No migration. Commit `be297ef`, pushed to origin/main.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. be297ef). All 6 properties pass. (1) NO MEMBER-DATA LEAK signed-out: safety/page.tsx has no redirect/requireUser/middleware gate; `getMemberSafetyCases` called ONLY in `const cases = user ? await getMemberSafetyCases(user.id) : []` (never signed-out); SafetyGuidelines.tsx imports only next/link (no DB/auth/reporter_user_id/coordinate — grepped 0); defense-in-depth SQL scoped `WHERE reporter_user_id=$userId`; signed-out render = guest nav + generic "reports stay private" note + static guidance, tracker chrome absent. (2) signed-out reads guidance (4 #guidelines accordions + emergency line, no 307→login); advertised links (landing/trust/terms/privacy/hosting/signup/profile → /safety#guidelines; /safety-guidelines 308→#guidelines) resolve. (3) signed-in unchanged (tracker + guidance, #guidelines anchor). (4) guidance pure static, honest "not an emergency responder" copy preserved. (5) tokens-only, 44/52px, focus rings, details semantics, responsive. (6) page.test.tsx non-tautological (getMemberSafetyCases .not.toHaveBeenCalled + tracker absent signed-out; .toHaveBeenCalledWith signed-in). Checks the Tester ran: typecheck PASS, lint 0 errors, safety test 2/2, full suite 576 passed/12 skipped/0 failed on clean rerun (one unrelated BetaTermExplainer.test flake under parallel load, passes 10/10 isolated), prod build PASS. Orchestrator archived. Safety guidance is now legible to signed-out visitors before signup — safety-first principle upheld.
