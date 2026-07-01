# CX-20260630-landing-how-it-works-steps-misleading-color-hierarchy

- Status: `ready`
- Severity: `low`
- Priority: `P3 polish` — Reach 4 (every landing visitor reaches the "How it works" section) × Impact 2 (mild comprehension friction + minor "is step 2 special / clickable?" trust wobble; not blocking) × Confidence 4 (directly observed at 1024px, grounded in `globals.css` + the design-system rule that lime = positive action / active selection) / Effort 1 (a few CSS lines). Math: (4×2×4)/1 = 32. Not safety/privacy/auth/accessibility-gated, so it stays in the polish bucket; raise to P2 only if comprehension of the core pitch is judged higher-stakes. Components: `apps/web/src/app/globals.css` (`.step-card:nth-child(2)`, `:nth-child(3)`), `apps/web/src/app/landing/page.tsx` (`steps`/`.steps-grid`).
- Customer journey: First impression — a cautious first-time visitor reads the landing page "How it works" three-step explainer to understand what the product actually does before signing up.
- Surface: `web`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), Chromium headless, observed at 1440 / 1024 / 390 widths. Observed 2026-06-30.
- Found by: Experience & Design Explorer (landing × visual hierarchy & layout)
- Implementation owner: `unassigned`
- Related tickets: `none found` (searched the queue; closest are sport-card / research-page styling tickets, all distinct surfaces and outcomes)

## Customer outcome

As a cautious first-time visitor trying to understand "how does Sport Date work?", I want the three numbered steps (STEP 01 → 02 → 03) to read as an equal, ordered sequence so that I follow them in order and am not misled into thinking the middle step is special, selected, or something I should click.

## What I observed

In the landing "How it works" section, the three step cards are styled with three *different* fills:

- STEP 01 "Build your profile" — white card (default).
- STEP 02 "Discover activities nearby" — **solid lime (`--lime`) fill**, no border.
- STEP 03 "Request a place & meet" — **solid ink (dark) fill**, light text.

The cards are a numbered, equal-weight 1→2→3 sequence (each is one stage of the same flow; none is interactive). But because the middle card is filled with the brightest color on the page — lime, which the design system reserves for "positive actions and active selections" — the eye lands on **step 2 first** instead of step 1, and the reading order fights the numbering. The lime fill also reads like a *selected / active / clickable* state, even though the card does nothing. The ink-filled step 3 then reads as a third, separate visual weight. So a sequence that should scan as "1, then 2, then 3, equal" instead scans as "2 (loud) … 3 (dark) … 1 (quiet)."

Confirmed in CSS: `.step-card:nth-child(2) { background: var(--lime); }` and `.step-card:nth-child(3) { background: var(--ink); color: #fff; }` (`apps/web/src/app/globals.css`). The three fills are purely decorative — they do not encode any difference in importance, state, or interactivity.

## What I expected

The three steps should carry **equal visual weight** so they read in numeric order as a calm, ordered sequence, consistent with the page's "no infinite feed, no auditioning" tone. The strongest accent color (lime) should be spent on a real action or active selection (e.g. the CTAs), not as a decorative fill on a non-interactive middle card. A restrained, consistent card treatment (e.g. all three on the same surface, with the *number* and a small accent doing the ordering work) would let the eye travel 1 → 2 → 3 naturally and would stop step 2 from looking selected or clickable.

## Reproduction

1. Open `http://localhost:3000/landing`.
2. Scroll to the "How it works — Three steps from sign-up to a real meeting" section.
3. Observe that the middle card (STEP 02) is filled solid lime and visually dominates, while STEP 01 (white) and STEP 03 (dark) carry different weights; note that nothing about the content makes step 2 more important or interactive.

Reproduction rate: `3/3 widths` (1440 / 1024 / 390).

## Customer impact

Cosmetic + comprehension/trust. No authorization, privacy, precise-location, safety, accessibility-blocking, or data-loss dimension. The practical cost: a first-time visitor's eye is pulled to the middle step rather than the first, briefly muddling the "what happens, in order" story that this exact section exists to tell; and the lime fill can momentarily imply step 2 is a selected/clickable element, a small "wait, do I tap that?" hesitation on a page whose whole job is to feel calm and deliberate. It also dilutes the design system's strongest semantic color by using it decoratively.

- Authorization / privacy / precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- Accessibility: not blocking. Note for implementation: do **not** rely on color alone to convey ordering — the step numbers already do that, which is good; keep them. Verify the chosen treatment keeps text contrast at WCAG AA on every card (the current lime card uses dark text, which passes; preserve that if any fill remains).

## Evidence and limits

- Evidence: full-page landing screenshot at 1024px showing the three differently-filled step cards (`scratchpad/shots/landing-1024.png`, gitignored, no PII — public marketing copy only); fold screenshots at 1440 and 390.
- Redactions made: none needed (public marketing page, no member data).
- Facts:
  - The three `.step-card`s use three different backgrounds via `:nth-child(2)` (lime) and `:nth-child(3)` (ink) in `globals.css`.
  - The cards are non-interactive (`<article>` elements, no link/button), and represent an ordered 1→2→3 sequence labelled STEP 01/02/03.
  - Lime is documented as "positive actions and active selections" in `docs/design-system.md`; here it is a decorative fill on a non-action element.
- Hypotheses to verify during implementation:
  - Unifying the three cards to one surface (or a much more restrained accent) preserves scannability and removes the "step 2 looks selected/clickable" read. The exact visual treatment is an implementer/design choice; the acceptance criterion is the *equal-weight, in-order* reading, not a specific palette.
- Paths or surfaces not tested: did not A/B the alternative treatments; did not evaluate with a screen reader (this is a visual-weight finding, and the numbers already provide non-color ordering).

## Duplicate check

- Search terms used: "step", "how it works", "steps-grid", "hierarchy", "lime fill", "step card", "sequence" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-signup-sport-cards-letter-monograms.md` (sign-up sport picker, different surface/outcome), `CX-20260630-native-date-inputs-unstyled-mismatch.md` (form inputs), `CX-20260630-new-member-empty-discovery-missing-language.md` (discovery onboarding), the two `research-bucharest-*` styling tickets (different page), `discover-filter-input-placeholders-truncated.md` (discover filters). None touch the landing "How it works" steps or their color hierarchy.
- Why this is new: first landing-page visual-hierarchy finding; no existing ticket covers the step cards.

## Acceptance criteria

- [ ] On `/landing`, the three "How it works" step cards read as an **equal-weight, ordered 1 → 2 → 3 sequence**: no single card visually dominates or pulls the eye out of numeric order.
- [ ] No non-interactive step card looks selected, active, or clickable; the strongest accent color (lime) is not used as a decorative fill on a non-action element here.
- [ ] The step *numbers* (STEP 01/02/03) still provide ordering without relying on color alone.
- [ ] Text on every step card meets WCAG AA contrast at desktop and mobile.
- [ ] The section remains usable and well-spaced at 1440 / 1024 / 390 widths (no overflow, no cramped wrap).
- [ ] No precise location or other sensitive data is involved (n/a — public page).
- [ ] Relevant repository checks pass (`npm run typecheck`, lint, `npm test`).

## Handoff and retest log

- `2026-06-30 22:55 EEST` - Filed by Experience & Design Explorer (landing × visual hierarchy & layout); status `ready`. Reproduced 3/3 widths. Cosmetic/comprehension finding; no safety/privacy/auth/accessibility blocker.
