# CX-20260701-empty-states-lack-warmth-and-next-step

- Status: `implemented`
- Severity: `medium`
- Priority: `P0` — (Reach 5 × Impact 3 × Confidence 4) / Effort 2 = 30. Empty states are the first thing early members see; warmth here shapes trust and retention cheaply.
- Customer journey: discovery (and hosting, profile)
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (b6)
- Implementation owner: `Experience Build Agent (Opus 4.8)`
- Related tickets: `CX-20260630-new-member-empty-discovery-missing-language` (narrow: a specific missing-language string on empty discovery; this ticket is the broader warmth-and-next-step pass across surfaces)

## Customer outcome

As an early member in a low-liquidity launch city, I want empty states across discover, hosting,
and profile to feel calm, warm, and encouraging — telling me clearly what to do next — so that an
empty screen feels like an invitation, not a broken or dead product.

## What I observed

Empty states across the core surfaces read as absence or error rather than a warm, specific "here's
what to do next." In an early launch city, empty discovery is the *common* case, so these screens
disproportionately shape first impressions. (A prior ticket fixed one missing-language string on
empty discovery; the broader tone/next-step pass is not covered.)

## What I expected

Every empty state (no events yet in your area, no hosted events yet, unfilled profile sections)
should be calm, on-brand, and specific: acknowledge the state warmly, explain why it might be empty,
and offer one clear next action (e.g. host the first event, widen filters, complete your profile).
No error styling for a normal empty state; no fake "others are joining" scarcity.

## Reproduction

1. As a brand-new member in a city with no events, open discover, hosting, and profile.
2. Note empty states that feel like absence/error rather than a warm invitation with a next step.

Reproduction rate: `confirmed; UX/tone gap across surfaces`

## Customer impact

Empty states are the first real impression during launch; cold or error-flavoured empties make a
product feel dead and untrustworthy, suppressing the very supply/attendance the loop needs. No
auth/privacy dimension; must not fabricate traction ("people near you", counts) that doesn't exist.

## Duplicate check

- Search terms: empty, no events, next step, encourage, warmth.
- Tickets reviewed: full queue; the existing empty-discovery ticket is a single missing-language
  string, not the cross-surface warmth-and-next-step treatment.
- Why new: broader tone + actionable-next-step pass across discover/hosting/profile empties.

## Acceptance criteria

- [ ] Discover, hosting, and profile empty states are warm, on-brand, and each offer one clear next action.
- [ ] Empty is visually distinct from error; a normal empty state is never styled as a failure.
- [ ] Copy fabricates no traction, counts, or "others near you" claims that are not real.
- [ ] Loading vs empty vs error are correctly distinguished on each surface.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-01 - Picked up by Experience Build Agent (Opus 4.8); status `in-progress`.
- 2026-07-01 - Implemented by Experience Build Agent (Opus 4.8); status `implemented` (commit b631ca0). Awaiting independent retest.
  - Scope: discover and hosting already branch into warm, next-step empties (prior CX tickets); this pass covered the remaining flat surfaces the ticket names — profile sections and feedback.
  - Profile (`apps/web/src/app/profile/page.tsx`): intro, languages, sports, and prompts empty states now each render one clear next action — a lime, 44px, focus-visible `profile-empty-action` link that jumps to the profile editor via a new `id="edit-profile"` anchor on `EditProfileForm` (`apps/web/src/components/EditProfileForm.tsx`) — instead of only saying "Edit your profile below". Copy explains why each helps (matching / being found); no fabricated traction.
  - Feedback history empty (`apps/web/src/components/FeedbackWorkspace.tsx`): warmer, reassuring copy pointing to the form; still distinct from the error state (`role="alert"`). Loading/empty/error remain correctly separated.
  - Received-rating empty (`apps/web/src/components/ReceivedRatingSummary.tsx`): keeps the honest "not enough ratings yet" (no partial number, no fabricated count) and adds a calm "Find a game to play" link to discover.
  - Styling (`apps/web/src/app/globals.css`): `.profile-empty-block`, `.profile-empty-action`, `.received-rating-action` — on-brand Ink/Cream/Lime, 44px targets, `:focus-visible` outlines, no motion (reduced-motion safe), responsive/no new overflow at 1280/375. Empty stays visually distinct from error everywhere.
  - Checks: `npm run typecheck` (web) green; `npm run lint` (web) clean apart from a pre-existing warning in the untouched, uncommitted `qa/full-flows.mjs`; `npm run test` (web) 229 passed / 12 skipped. Changes are copy/markup/CSS only (no new logic), so no new unit tests were needed; no test asserted the old strings. Verified authed against the running dev app as pooled `seeker-D`: profile rendered the `edit-profile` anchor + all four empty-section action links; discover with a no-match filter showed the warm "Clear the filters" empty (distinct from error).
  - Note for retest: the feedback-history empty is client-rendered (fetched), so it is not in the SSR HTML; verify it in-browser on a fresh account with no feedback yet. Mobile (375) visual pass recommended.
