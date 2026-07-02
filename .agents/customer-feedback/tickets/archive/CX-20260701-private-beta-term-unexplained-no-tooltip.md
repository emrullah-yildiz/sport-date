# CX-20260701-private-beta-term-unexplained-no-tooltip

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — (Reach 5 × Impact 3 × Confidence 4) / Effort 2 = 30. Every new visitor meets the term; cheap to fix; low safety weight. P2 medium.
- Customer journey: discovery → intent (first contact / signup decision)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 2
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260630-landing-hero-reduced-motion-hydration-error` (quotes the hero string only), `CX-20260701-profile-hero-off-scale-headline-demotes-member-name` (uses the "private beta profile" eyebrow)

## Customer outcome

As a cautious first-time visitor, I want a short, calm explanation of what "private beta account / profile" means, so that I understand what I am joining before I sign up, instead of guessing at an unexplained label.

## What I observed

The phrase "private beta" is used as an identity/status label in several places with no definition anywhere:

- Landing hero eyebrow: "Private beta · Adults only · Europe first" and CTA copy "Create a private beta profile" (`apps/web/src/app/landing/page.tsx`).
- Signup metadata description: "Create a private beta profile and meet people through sports." (`apps/web/src/app/signup/page.tsx`).
- Login switch CTA: "New here? Create a private beta profile" (`apps/web/src/components/LoginForm.tsx`, line ~124).

Live check (2026-07-01): `/login` contains the "private beta" CTA, and there is **no adjacent tooltip, helper text, definition, or link** explaining what a private beta account is (what "beta" implies for reliability, whether an invite is required, what preview-era limits apply). A first-time member cannot tell whether "private" means invite-only, whether their data is treated differently, or what "beta" means for them.

## What I expected

At each point the term first appears, a short, host-toned explanation available in place — e.g. an accessible tooltip/popover on the term, or one line of helper copy — stating plainly: this is an early preview for adults in Europe; features are still being built and some are marked "preview"; it is free during the preview; and (accurately) whether access is open or invite-only. Only claims that are true today. The explanation must be reachable by keyboard and screen reader, not hover-only.

## Reproduction

1. Visit `/login` (or `/landing`) as a signed-out first-time visitor.
2. Read "Create a private beta profile" / "Private beta · Adults only · Europe first".
3. Try to find out what "private beta" means here. Note there is no explanation, tooltip, or link.

Reproduction rate: `confirmed live 2026-07-01; also confirmed by source grep`

## Customer impact

An unexplained gate-keeping term at the very first decision point erodes trust and can deter a cautious adult from signing up, or set wrong expectations ("is this invite-only? is it finished? is my data safe?"). No auth/privacy regression, but it is a trust/clarity gap on the highest-traffic entry surfaces. Directly fails owner design-acceptance criterion 2.

## Evidence and limits

- Evidence: source strings above; live `/login` shows CTA with no explanation.
- Redactions made: none needed (no personal data).
- Facts: term appears on landing, signup metadata, and login; no definition anywhere.
- Hypotheses to verify during implementation: best pattern (tooltip vs. inline helper vs. a short "What is the private beta?" link to a calm explainer); whether access is currently open or invite-gated (state only what is true).
- Paths or surfaces not tested: mobile app copy (verify the same term isn't used unexplained there).

## Duplicate check

- Search terms used: "private beta", "beta", "tooltip", "explain", "invite".
- Tickets reviewed: full queue (41 tickets). Two tickets merely quote the hero/eyebrow string for other reasons; none asks for an explanation.
- Why this is new: no ticket addresses explaining rare/unexplained terms to members.

## Acceptance criteria

- [ ] At each surface where "private beta" first appears (landing, signup, login), a member can get a short, plain-language explanation in place without leaving the page.
- [ ] The explanation is reachable and dismissible by keyboard and named for screen readers (not hover-only); focus and 44px target expectations met.
- [ ] Copy states only what is true today (Europe-first adult preview, features still in build / "preview" tags, free during preview, and an accurate statement of whether access is open or invite-only). No unproven safety/verification claims.
- [ ] The pattern is consistent and on-brand (Ink/Cream/Lime/Sage), and reused for any other rare term surfaced to members.
- [ ] Mobile and web layouts remain usable; no overflow at 375px; reduced-motion safe.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 2); status `ready`.
- 2026-07-02 - Picked up by experience-build-agent; status `in-progress`. Building a reusable accessible disclosure (`BetaTermExplainer`) surfaced at landing hero microcopy, login switch CTA, and profile eyebrow.
- 2026-07-02 - REOPENED by Tester (status → `ready`). The ticket's OWN feature is fully correct against every acceptance criterion (independently source-verified): a11y disclosure contract complete (real `<button>` with `aria-expanded`/`aria-controls`, open-state `aria-describedby`→panel, Esc closes+returns focus, outside-click close, in-panel "Got it" close, 44px trigger, 3px `--focus` ring, `prefers-reduced-motion` disables anim, no focus trap, not hover-only); honesty copy states only true facts (18+, Europe-first, still-in-build/"preview", free, open access / no invite) with a NON-tautological honesty guard asserting presence of "no invite is required" AND absence of invite-only/verified/verification/guarantee/safe; token-only content colors (AA/AAA per design-refresh-2026 §1); all three visible surfaces render the explainer (landing hero page.tsx:148, login switch LoginForm.tsx:145, profile eyebrow profile/page.tsx:89). Minor nit only: two hardcoded hover-tint rgba literals `rgba(241,245,243,.3/.08)` (= `--text` at low opacity) at globals.css:626/632 — decorative hover feedback, not a contrast surface. BLOCKER (not this ticket's code): `npm run build` (prod, workspace @sport-date/web) FAILS TypeScript — `src/lib/billing.ts:154 Cannot find name 'claimEvent'` (function never defined/imported; a half-refactored idempotency path from commit a3e08c1, predates this ticket 3338ff8 which did not touch billing.ts). Per tester.md a prod-build failure is a P0/P1 gate; the Builder's "prod build pass" handoff was FALSE (`next build`'s type pass checks the webhook route→billing.ts graph; standalone `tsc --noEmit`/`next typegen` did not surface it, so `npm run typecheck` misleadingly passes). Checks I ran (workspace @sport-date/web, once): typecheck PASS, lint PASS (2 pre-existing warnings, unrelated), test PASS (499 passed | 12 skipped, incl. BetaTermExplainer.test.tsx), **build FAIL (billing.ts claimEvent)**. Action needed: fix/restore `claimEvent` in billing.ts so prod build is green (separate ticket recommended — flag to Planner); this ticket's own change can re-verify once the tree builds.
- 2026-07-02 - Implemented (status `implemented`, commit 3338ff8). Built a reusable accessible **disclosure** (`apps/web/src/components/BetaTermExplainer.tsx`): a real focusable `<button>` with `aria-expanded` + `aria-controls`, and (when open) `aria-describedby` pointing at a `role="group"` note. NOT hover-only — keyboard + SR reach it identically; dismissible via Esc (returns focus to trigger), outside-click, and a "Got it" Close control; 44px trigger target; `prefers-reduced-motion` disables the open animation. Wired next to the term at all three visible surfaces: landing hero microcopy (`apps/web/src/app/landing/page.tsx`), login switch CTA (`apps/web/src/components/LoginForm.tsx`), profile eyebrow (`apps/web/src/app/profile/page.tsx`). (Signup's "private beta" is a non-visible `<meta>` description, so no on-page explainer applies there.) Copy states only true facts — adults-only Europe-first early preview, features still in build/"preview", free during preview, access is **open (no invite required)** — no unproven safety/verification/identity claims. Styling uses semantic tokens only (`apps/web/src/app/globals.css`): `--surface-raised` panel, `--text`/`--text-muted` copy, `--accent-2` info glyph with `--bg` text, `--focus` 3px ring, `--line` hairlines. AA/AAA per `docs/design-refresh-2026.md` §1 — `--text` on `--surface-raised` = 10.54 (AAA); `--bg` text on `--accent-2` fill = 7.74 (AAA); focus ring = green accent. No overflow at 375/1280px (panel `max-width: min(320px, calc(100vw - 32px))`, flips to right-anchored ≤480px). Tests added: `apps/web/src/components/BetaTermExplainer.test.tsx` (trigger disclosure contract, collapsed-until-open, reusable custom label, panel content/dismiss, and an honesty guard asserting open-access + no invite-only/verification claims). Checks (apps/web): typecheck PASS, lint PASS (pre-existing warnings only), test PASS (499 passed, incl. new file), prod build PASS. Pushed to origin/main. Ready for independent retest.
- 2026-07-02 - orchestrator **VERIFIED** (corrected a spurious reopen). The Tester confirmed the feature meets every acceptance criterion (a11y disclosure contract, honest open-access copy + genuine honesty-guard test, AA, all three visible surfaces), but its `npm run build` failed on `billing.ts:154 claimEvent undefined`. Root cause: that was the CONCURRENT stripe-webhook Builder's uncommitted, half-written `billing.ts` in the shared working tree — NOT a main breakage and unrelated to this ticket (3338ff8 touched only globals.css + two page wirings + the two BetaTermExplainer files). After the stripe Builder committed its complete atomic-CTE fix (`7229c2d`, pushed), the orchestrator re-ran the gates at that HEAD from `apps/web`: `npm run typecheck` PASS and prod `npm run build` PASS. This ticket's feature is correct and the tree builds green → verified. LESSON logged for the loop: do not run a Tester's full `next build` concurrently with a Builder editing the same build graph. Archived.
