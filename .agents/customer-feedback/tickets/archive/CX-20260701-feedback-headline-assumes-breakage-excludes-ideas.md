# CX-20260701-feedback-headline-assumes-breakage-excludes-ideas

- Status: `implemented`
- Severity: `low`
- Priority: `P3 polish` — (Reach 3 × Impact 2 × Confidence 4) / Effort 1 = 24. Cheap copy fix; broadens who feels invited to share.
- Customer journey: reflection / feedback
- Surface: `web`
- Environment and viewport/device: all widths (`/feedback`, observed 1280 + 375)
- Found by: Experience & Design Explorer (feedback × copy pass, 2026-07-01)
- Implementation owner: `Experience Build Agent`
- Related tickets: `CX-20260701-feedback-success-flat-dead-end-no-forward-path` (same surface, same pass)

## Customer outcome

As a member who wants to suggest an idea or point out something missing — not only to report a bug — I want the feedback page to feel like it is asking for that too, so that I don't feel out of place sharing something positive or forward-looking.

## What I observed

On `/feedback` the page headline is **"Tell us where the rhythm broke."** and the subhead is **"Share what you were trying to do and what happened instead. Your feedback is private to the team and helps us make the next visit clearer."** Both frame feedback as reporting a *failure*.

But the form's own "What kind of feedback is this?" dropdown explicitly offers **"Something is missing," "An idea for improvement," and "A suggestion"** categories alongside the bug/usability ones. So the headline copy is narrower than the form's declared scope: a member arriving to share an idea is greeted by a headline assuming something broke. The lower-form microcopy is well-judged ("Plain language is perfect. A short, specific example is more useful than a polished report."), which makes the top-of-page mismatch stand out more.

Observed 2026-07-01, dev localhost:3000, signed-in pooled synthetic adult, real Chromium at 1280 and 375. No overflow; headings are a clean h1 → h2 → h2 order.

## What I expected

A headline and subhead that welcome the full range the form accepts — problems *and* ideas/suggestions — in the warm host voice, without abandoning the brand's "rhythm/movement" language. The framing should not quietly signal that only breakage is wanted.

## What I expected to avoid (guardrails)

No dark patterns involved. Keep it honest: don't over-promise that every idea will be built. Preserve the calm, plain-language tone; don't turn it into marketing.

## Reproduction

1. Sign in and open `/feedback`.
2. Read the headline "Tell us where the rhythm broke." and subhead.
3. Open the "What kind of feedback is this?" dropdown; note it includes "Something is missing," "An idea for improvement," and "A suggestion."
4. Observe the headline assumes a failure while the form invites ideas.

Reproduction rate: `confirmed; copy is static`

## Customer impact

Members with positive or forward-looking feedback may feel the page "isn't for them," reducing the range and volume of useful signal. Purely a copy/tone gap — no authorization, privacy, safety, accessibility, or data-loss dimension.

## Evidence and limits

- Evidence: live-observed headline/subhead vs the category dropdown options on the same form (screenshot captured to scratch, redacted — no member data on screen).
- Redactions made: none needed (no personal data shown; synthetic account).
- Facts: headline "Tell us where the rhythm broke."; subhead references "what happened instead"; dropdown includes missing_feature / suggestion / "An idea for improvement".
- Hypotheses to verify during implementation: none — this is a static-copy contradiction.
- Paths or surfaces not tested: mobile app feedback entry (web only this pass).

## Duplicate check

- Search terms used: `feedback`, `rhythm broke`, `headline`, `copy` across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: no existing feedback-surface ticket; landing/signup headline tickets are different surfaces.
- Why this is new: first ticket on the `/feedback` surface; distinct from the success-confirmation ticket filed the same pass.

## Acceptance criteria

- [ ] The `/feedback` headline and subhead welcome both problems and ideas/suggestions, matching the categories the form actually accepts.
- [ ] The brand's warm, plain-language voice is preserved; no over-promising that every idea ships.
- [ ] Copy remains calm and non-marketing; heading order (single h1) and contrast unchanged.
- [ ] Mobile and desktop layouts remain usable; no overflow introduced at 375 or 1280.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (feedback × copy pass); status `ready`.
- 2026-07-02 - Experience Build Agent picked up; status `in-progress`. Reframing `/feedback` headline + subhead to welcome ideas, kind words, and problems.
- 2026-07-02 - Experience Build Agent implemented; status `implemented`. Reframed copy so the surface welcomes ideas, praise, AND problems in the brand's rhythm voice: headline "Tell us how the rhythm feels."; subhead "Share an idea, a kind word, or something that didn't work. Anything that shapes the experience belongs here. Your note is private to the team and helps us make the next visit clearer."; form heading "What happened?" → "What's on your mind?"; summary placeholder → "An idea, a kind word, or what didn't work"; details label "What were you trying to do?" → "Tell us more" with an inclusive placeholder. Copy-only (no globals.css), single h1 + heading order preserved, no overflow 375/1280, safety-route note + warm confirmation + focus-move + forward path untouched. Files: `apps/web/src/app/feedback/page.tsx`, `apps/web/src/components/FeedbackWorkspace.tsx`. Test: added `apps/web/src/app/feedback/page.test.tsx` (source-tripwire: headline no longer assumes breakage; invites idea/kind word/problem; keeps rhythm voice; single h1). Checks (apps/web): typecheck pass, lint pass (0 errors, 2 pre-existing unrelated warnings), test 655 pass, build pass. Commit `388a9a5`, pushed to origin/main.
