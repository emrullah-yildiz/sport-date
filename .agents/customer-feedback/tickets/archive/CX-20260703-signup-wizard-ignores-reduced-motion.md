# CX-20260703-signup-wizard-ignores-reduced-motion

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — RICE (4 × 2 × 0.9) / 0.6 = 12. Reach 4 (members who keep "reduce motion" on — a minority, but the exact audience the design system's parity rule protects — multiplied across all 5 signup steps), Impact 2 (a stated non-negotiable a11y rule is violated: the whole step content slides horizontally on every Next/Back, and the card fades/rises on entry, for people who asked the OS to stop that), Confidence 0.9 (confirmed no `useReducedMotion` in the signup tree while three sibling components use it), Effort 0.6 (adopt the existing `useReducedMotion` pattern). Not safety/privacy/auth-gated.
- Customer journey: Signing up — a member with `prefers-reduced-motion: reduce` moves through the 5-step signup wizard.
- Surface: `web` (all viewports, reduced-motion users)
- Environment and viewport/device: Source audit of `apps/web/src/components/SignUpForm.tsx` vs. the established `useReducedMotion` pattern in `JoinRequestControls.tsx`, `MomentGlow.tsx`, `HostRequestDecision.tsx`. Observed 2026-07-03.
- Found by: Experience & Design Explorer (signup × motion accessibility)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260630-landing-hero-reduced-motion-hydration-error` (same class of issue on landing, resolved by removing framer-motion there — signup was not touched)

## Customer outcome

As an adult who keeps "reduce motion" turned on (for vestibular or comfort reasons), I want the signup wizard to appear without sliding/fading animations so that creating my first profile feels calm and doesn't trigger discomfort — the same parity every other motion surface in the app already honors.

## What I observed

`SignUpForm` drives framer-motion animations unconditionally, with no reduced-motion branch:

- `apps/web/src/components/SignUpForm.tsx:96` — `<motion.div className="signup-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>` (card fades in and rises 20px on mount).
- `apps/web/src/components/SignUpForm.tsx:103-107` — `<AnimatePresence mode="wait"><motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>…</motion.div></AnimatePresence>` — the entire step content slides horizontally in and out on **every** Next/Back across the 5-step flow.

The component never imports or consults `useReducedMotion`. framer-motion does not honor `prefers-reduced-motion` on its own, so these transforms play in full for reduced-motion members. The design system marks reduced-motion parity non-negotiable (`docs/design-system.md`), and the codebase already has the correct pattern elsewhere:

- `apps/web/src/components/JoinRequestControls.tsx:4,48`, `apps/web/src/components/MomentGlow.tsx:3,28`, `apps/web/src/components/HostRequestDecision.tsx:3,21` all `import { … useReducedMotion } from "framer-motion"` and gate their motion on it.

Related CSS motion in this flow is also unguarded: `.strength-fill` `transition: width 300ms ease` (`globals.css:483`) and `.form-group input … transition: all 200ms ease` (`globals.css:471`) have no `prefers-reduced-motion` override (tracked primarily under the strength-fill ticket; noted here for completeness).

## What I expected

Under `prefers-reduced-motion: reduce`, the signup card and step transitions should present no slide/rise animation (an instant swap, or at most a short opacity crossfade), so the step content simply appears in its final position — reusing the same `useReducedMotion` gate the rest of the app uses, and without introducing a hydration mismatch (the landing-hero fix demonstrated the safe approach).

## Reproduction

1. Enable `prefers-reduced-motion: reduce` (OS or devtools rendering emulation).
2. Open `/signup`; note the card fades in and rises.
3. Click Next / Back between steps; note the whole step content slides horizontally each time.

Reproduction rate: `n/a (static source audit)` — deterministic from the unconditional `initial`/`animate`/`exit` props with no reduced-motion gate.

## Customer impact

Accessibility: a member who explicitly requested reduced motion still gets repeated sliding animations at a first-impression, trust-sensitive moment (creating an account). Not blocking — the form is fully usable — but it violates the product's own parity rule and can cause real discomfort for the affected audience. No authorization, privacy, precise-location, or data-loss dimension.

## Evidence and limits

- Evidence: `SignUpForm.tsx:96` (card entrance), `SignUpForm.tsx:103-107` (per-step slide); absence of `useReducedMotion` in the signup tree; sibling usage at `JoinRequestControls.tsx:4,48`, `MomentGlow.tsx:3,28`, `HostRequestDecision.tsx:3,21`; the parity mandate in `docs/design-system.md`.
- Redactions made: none (component source only).
- Facts:
  - The card and step transitions animate `y`/`x`/`opacity` unconditionally.
  - `useReducedMotion` is the established gate elsewhere in the same codebase (there is even a guardrails test asserting its use).
- Hypotheses to verify during implementation: reuse the `useReducedMotion()` gate (and the `useMounted` idiom the landing fix used) so SSR and first client paint stay byte-identical and no hydration mismatch is introduced. Under reduced motion, prefer an instant swap or a plain opacity crossfade with zero translate.
- Paths or surfaces not tested: real screen-reader/AT behavior; whether AnimatePresence `mode="wait"` needs adjustment when transitions are neutralized.

## Duplicate check

- Search terms used: "reduced-motion", "reduced motion", "signup", "sign-up", "framer", "motion", "hydration" across `.agents/customer-feedback/tickets/*.md` and `…/archive/*.md`.
- Tickets reviewed: `CX-20260630-landing-hero-reduced-motion-hydration-error.md` (landing hero — verified/closed by removing framer-motion there; signup was never touched), `CX-20260702-join-controls-reduced-motion-hydration-mismatch.md` and `CX-20260702-join-controls-hydration-test-is-tautology-strengthen.md` (join controls, different component).
- Why this is new: no existing or archived ticket covers the signup wizard's card/step transitions ignoring reduced motion; the closed landing ticket fixed only `/landing`.

## Acceptance criteria

- [ ] Under `prefers-reduced-motion: reduce`, the signup card entrance presents no translate/rise animation (instant, or an opacity-only crossfade), and content appears in its final position.
- [ ] Under reduced motion, advancing/returning between steps presents no horizontal slide (`x`) of the step content.
- [ ] With reduced motion OFF, the current card and step animations are unchanged.
- [ ] The change introduces no React hydration-mismatch warning in either motion mode on `/signup` (reuse the app's `useReducedMotion` / `useMounted` pattern).
- [ ] The 5-step flow, validation, and submission behavior are otherwise unchanged.
- [ ] The interface explains what happened without internal terminology. — n/a (no error state changed).
- [ ] Loading, empty, failure, retry behavior. — n/a.
- [ ] No precise location or other sensitive data is exposed. — n/a.
- [ ] Relevant automated tests and repository checks pass (consider a tripwire asserting the signup tree consults `useReducedMotion`, matching the existing guardrails test).

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Implemented by Build agent; gated SignUpForm's framer-motion card entrance (line ~97) and per-step slide (line ~105) on `useReducedMotion()`, mirroring the MomentGlow sibling: `initial` kept unconditional (hydration-safe SSR/first-paint parity), `transition={reducedMotion ? { duration: 0 } : undefined}` so reduced-motion members get an instant snap (no rise, no horizontal slide) while step content still switches; motion unchanged when off. Added a source-scan tripwire to SignUpForm.test.tsx (asserts the gate + gated transition on every motion element). Checks: typecheck clean, lint clean (only pre-existing qa/full-flows.mjs + member-profile.test.ts warnings), test 757 passed/12 skipped, production build compiled successfully. status `implemented`.
- 2026-07-03 - Independently verified by orchestrator (source + repo checks): `SignUpForm` now imports `useReducedMotion` (line 4), derives `snapTransition = reducedMotion ? {duration:0} : undefined` (line 50), and applies it to BOTH the card-entrance motion.div (line 107) and the per-step slide motion.div (line 115). `initial` is kept UNCONDITIONAL (no SSR/first-paint branch) so there's no hydration mismatch — under reduced motion framer snaps initial→animate in 0s (no card rise, no horizontal step slide); with the preference off, transition=undefined = today's behavior exactly. Mirrors the MomentGlow sibling pattern deliberately (avoids the extra mounted-guard JoinRequestControls needs when branching `initial`). AnimatePresence mode="wait" still switches step content instantly with motion off. typecheck/lint/757 tests/prod build pass (commit 66c06df). Status `verified`.
