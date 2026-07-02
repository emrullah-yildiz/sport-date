# CX-20260630-signup-redundant-double-headline-weak-focal-point

- Status: `verified`
- Severity: `low`
- Priority: `P3 polish` — Reach 5 (every new member sees this on all 5 signup steps) × Impact 2 (mild "where do I look / what is this screen" friction and a slightly unfinished feel at the highest-stakes commitment moment; not blocking) × Confidence 4 (directly observed at 1440 / 1024 / 375 and confirmed in `SignUpForm.tsx` + `globals.css`) / Effort 2 (header markup + a few CSS rules; copy decision on whether to keep both lines). Math: (5×2×4)/2 = 20. Not safety/privacy/auth/accessibility-gated, so it stays in the polish bucket. Components: `apps/web/src/components/SignUpForm.tsx` (`.signup-header` h1 + `.step-indicator` + progress bar), each `apps/web/src/components/steps/SignUpStep*.tsx` (the per-step `<h2>`), `apps/web/src/app/globals.css` (`.signup-header`, `.signup-step h2`, `.signup-container` centering).
- Customer journey: Signing up — a cautious first-time member moves through the 5-step wizard (Step 1 "Let's get started" through Step 5 review) deciding whether this product feels real and worth a profile.
- Surface: `both`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), Chromium headless, observed at 1440 / 1024 / 375 widths. Observed 2026-06-30.
- Found by: Experience & Design Explorer (signup × visual hierarchy & layout)
- Related tickets: `none found` (distinct from the sport-card emoji and native-date-input tickets, which are different elements on the same surface)

## Customer outcome

As a cautious first-time member, I want each signup step to have one clear focal point that tells me what this step is asking, so that I always know where to look first and the form feels finished and considered rather than stacking two titles at me.

## What I observed

On every signup step the card header stacks **two near-equal headings** with the step indicator and progress bar wedged between them:

- A persistent page title `h1` "Join the movement" (`clamp(28px, 6vw, 36px)`, bold ink).
- Then "STEP n OF 5" + the lime→ink progress bar.
- Then a per-step `h2` ("Let's get started" / "Your profile" / "What sports do you play?" / "Tell us about yourself" / "Let's review your profile") at 24px.

At 1440 the h1 (36px) and the step h2 (24px) are close enough in size and weight that the eye lands on two competing titles rather than one; the h1 carries no per-step information yet sits at the top of every screen, so the *actual* question for the step (the h2) is demoted to third position behind a decorative banner line and the progress bar. On mobile (375) the gap narrows further — h1 is 28px and h2 is 24px — so the two headlines read as nearly the same level, and together they consume the entire top of the card before any field appears.

Separately, `.signup-container` / the card are vertically centered in the viewport, so at 1440 the card floats with a large empty band above it and the first field starts ~190px down — the top third of the screen is dead space while the primary heading sits mid-page.

Confirmed in source: `SignUpForm.tsx` renders the fixed `<h1>Join the movement</h1>` inside `.signup-header`, and each `SignUpStep*.tsx` renders its own `<h2>`. `globals.css`: `.signup-header h1 { font-size: clamp(28px,6vw,36px) }`, `.signup-step h2 { font-size: 24px }`.

## What I expected

Each step should present **one dominant focal point** — ideally the step's own question ("What sports do you play?") — with any persistent brand/title line clearly subordinate (smaller, lighter, or merged into the step indicator), so the member's eye goes straight to "what is this step asking me?" The header should not spend the strongest type weight on a line that never changes, and the card should not leave the top third of the viewport empty while the heading floats mid-screen.

## Reproduction

1. Open `http://localhost:3000/signup`.
2. Observe the header: "Join the movement" (large), then "STEP 1 OF 5" + progress bar, then "Let's get started" (also large).
3. Advance through steps 2–5; on each step the same fixed h1 sits above a near-equal-size per-step h2.
4. At 375px width, note the two headings are nearly the same size and fill the top of the card before any input.

Reproduction rate: `3/3 widths` (1440 / 1024 / 375), all 5 steps.

## Customer impact

Cosmetic + comprehension. A hesitant new member has no single obvious focal point per step; the redundant title adds a beat of "wait, which line is the actual question?" and the stacked-titles + empty-top layout reads as slightly unfinished at exactly the moment the product is asking for trust and a profile. No authorization, privacy, precise-location, safety, or data-loss dimension.

- Authorization / privacy / precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- Accessibility: not blocking, but worth fixing thoughtfully — the document currently has both an h1 and a per-step h2, which is a reasonable outline; if the h1 is demoted visually, keep a sensible heading order (do not drop to an h2-only page with no h1, and keep the step's question reachable by screen-reader users).

## Evidence and limits

- Evidence: full-page signup screenshots at 1440 / 1024 / 375 for steps 1–5 (`scratchpad/signup-shots/s{1..5}-{1440,1024,375}.png`, gitignored; synthetic adult only, the only "PII" is a throwaway `@sport-date.invalid` email shown on the review step, redact if shared).
- Redactions made: synthetic test email is `@sport-date.invalid`, not real.
- Facts:
  - A fixed `<h1>Join the movement</h1>` renders on all 5 steps; each step adds its own `<h2>`.
  - h1 is `clamp(28px,6vw,36px)`, step h2 is `24px` — close in scale on desktop, very close on mobile.
  - The card is vertically centered, leaving a large empty band above it at desktop heights.
- Hypotheses to verify during implementation:
  - Demoting the persistent title (smaller/lighter, or folding "Join the movement" into the step-indicator row) and letting the step h2 be the dominant heading restores a single per-step focal point. Exact treatment is an implementer/design choice; the acceptance criterion is "one clear focal point per step," not a specific size.
- Paths or surfaces not tested: did not screen-reader audit the heading order; did not A/B alternative header treatments.

## Duplicate check

- Search terms used: "Join the movement", "signup-header", "step-indicator", "signup-actions", "Let's get started", "headline", "hierarchy" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-signup-sport-cards-letter-monograms.md` (sport-card icons, verified, different element), `CX-20260630-native-date-inputs-unstyled-mismatch.md` and `CX-20260630-native-select-dropdowns-default-chrome.md` (native form controls, different elements), `CX-20260630-landing-how-it-works-steps-misleading-color-hierarchy.md` (landing page, different surface).
- Why this is new: first signup header/hierarchy finding; no existing ticket touches the double-headline or the card's vertical-space use.

## Acceptance criteria

- [ ] Each signup step has **one clear dominant focal point** (the step's own question/heading); any persistent brand/title line is visibly subordinate and does not compete with it for the eye.
- [ ] The header does not stack two near-equal-size headings; on mobile (375) the two lines are not nearly the same size.
- [ ] The step's question is the first thing a sighted member reads on each step.
- [ ] Heading order remains sensible for assistive tech (a coherent h1/h2 outline; the step question is reachable and labelled).
- [ ] The card uses its vertical space reasonably (no large dead band above while the heading floats mid-viewport at common desktop heights), and remains well-spaced at 1440 / 1024 / 375 with no overflow.
- [ ] Text contrast on the header meets WCAG AA at desktop and mobile.
- [ ] No precise location or other sensitive data is involved (n/a).
- [ ] Relevant repository checks pass (`npm run typecheck`, lint, `npm test`).

## Handoff and retest log

- `2026-06-30 23:55 EEST` - Filed by Experience & Design Explorer (signup × visual hierarchy & layout); status `ready`. Reproduced 3/3 widths across all 5 steps; cosmetic/comprehension finding, no safety/privacy/auth/accessibility blocker.
- `2026-07-02` - Implemented by Experience Build Agent; status `implemented` (commit `b4ed7a7`). BEFORE: a fixed `<h1>Join the movement</h1>` (`--fs-h1`, ~30–42px) sat atop the step indicator and progress bar, and the per-step question was a smaller `<h2>` (24px) below them — two near-equal competing titles, worst at 375px. AFTER: the step's own question is the SINGLE dominant `<h1>` (`--fs-h1`, first heading read on each step) and "Join the movement" is demoted to a small subordinate NON-heading brand eyebrow ("Join Rally", `--fs-small`, muted) beside the step indicator. SINGLE FOCAL POINT: the step question (e.g. "What sports do you play?"), now the largest, top-most element inside the card. Card anchored toward the top (`.signup-page-main` `align-items:flex-start` + `clamp(32px,7vh,88px)` top pad) so the heading is immediately in view instead of floating mid-screen with a dead band above. Heading outline coherent: one h1/step; review step's member name bumped h3→h2 as a sub-heading. AA: header muted eyebrow/step-indicator 6.42:1, step h1 12.51:1 on the card surface (#272E34) — both pass AA at desktop and mobile. Scope: headline/focal hierarchy + card vertical placement only — no change to signup flow, fields, validation, or submission. Verified no higher-specificity rule overrides `.signup-step h1` size or the eyebrow color. TESTS: added `apps/web/src/components/SignUpForm.test.tsx` (tripwire — exactly one `<h1>` = the step question, no `Join the movement` heading, brand line present but subordinate). Checks (apps/web): typecheck ✓, lint ✓ (0 errors), test ✓ (699 pass incl. ethical-guardrails 54/54), production build ✓ (`/signup` static). No migration.
