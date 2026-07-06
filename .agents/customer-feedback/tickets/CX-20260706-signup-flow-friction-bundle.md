# CX-20260706-signup-flow-friction-bundle

- Status: `ready` — finding 3 (success copy) `implemented` 2026-07-06; findings 1, 2, 4 remain open
- Severity: `high`
- Priority: `P1` — the first-session flow asks the most intimate question third, ends on a legalese wall, and greets the new member with copy that sounds broken
- Customer journey: first-time visitor → 10-step signup → account created
- Surface: `web` — signup wizard
- Environment and viewport/device: mobile 390px + desktop
- Found by: Seraph user-sim daily pass (code walk of the signup flow)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260704-interactive-onboarding-gender-orientation` (shipped the current step order this ticket revises — findings here are post-ship user feedback on that design, not a duplicate)

## Findings (user voice)

1. **P1 — Orientation asked too early.** "I'm three questions in — you don't know my birthday yet, but you're already asking my sexual orientation?" Step 3 of 10 is sexual orientation, before birthday/sports/intent (`apps/web/src/lib/sign-up-steps.ts:29-40`, `components/steps/StepOrientation.tsx:34`). Optional or not, the placement reads invasive and hurts completion for cautious adults. Move gender/orientation later (after sports/intent, near photos/visibility choices) where the dating context makes the question feel earned — keeping both optional and consent-gated exactly as shipped.
2. **P1 — Final consent checkbox is a legalese wall.** "The last step is one giant checkbox sentence with four links crammed into it — I stopped reading and just ticked it." (`components/steps/StepCredentials.tsx:30-35`). Split into one calm sentence plus a compact linked list (Terms / Privacy / Safety / Consent) while keeping a single explicit consent action — no pre-ticking, no dark patterns.
3. **P1 — Success copy sounds broken.** "I just signed up and the first thing I read is 'Email verification delivery isn't switched on yet — you'll be able to prepare it from account security as soon as it is.' Is the product broken?" (`components/SignUpForm.tsx:135-138`). Replace with warm, member-facing copy about what they CAN do now; internal delivery-flag status doesn't belong in the welcome moment.
4. **P2 — Review step "Sports:" row misaligned.** The review list mixes `span+div` (tag cluster) with `span+span` rows so the Sports row's label/value alignment breaks the column rhythm (`components/steps/StepReview.tsx:22`). The owner has already caught two misalignment cases; this is a third.

## Acceptance criteria

- [ ] Sensitive steps (gender/orientation) appear only after the member has established basic profile context; both remain optional, skippable, consent-stamped; back-nav retains data.
- [ ] The final consent step reads as one short sentence + scannable links; consent remains a single explicit, unticked action.
- [x] Post-signup success copy contains no internal flag/ops language; states what happens next truthfully. *(done 2026-07-06)*
- [ ] Review rows align consistently at 390px and desktop.
- [ ] Existing signup tests updated; typecheck / lint / tests / prod build green.

## Handoff and retest log

- `2026-07-06` - Filed by Seraph (user-sim daily pass); status `ready`.
- `2026-07-06` - Finding 3 ONLY implemented by Tank (Builder) — deliberately scoped: step reordering (finding 1), consent-wall split (finding 2), and review alignment (finding 4) are a separate change. `SignUpForm.tsx` success copy replaced for BOTH branches: the live branch (production runs Gmail delivery since 2026-07-04; verification links are sent on request from account security, not auto-sent at signup) now reads "You're in — your profile stays private until you choose what to share. One quick step when you're ready: verify your email from account security on your profile, and the link will be in your inbox moments later."; the non-live (dev) branch drops the "delivery isn't switched on yet" ops language. Source tripwire added in `SignUpForm.test.tsx` (no flag language may return; warm copy + `/profile` CTA pinned). Typecheck/lint/full vitest/prod build green. Ticket stays `ready` for the remaining findings.
