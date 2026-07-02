# CX-20260703-profile-event-form-sub-44-touch-targets

- Status: `verified`
- Severity: `low`
- Customer journey: Host edits experience levels while creating an event (`/events/new`); member edits sports/prompts on their profile (`/profile`)
- Surface: `web` (most acute on touch/mobile)
- Environment and viewport/device: Source audit of `apps/web/src/app/globals.css`; measured against the 44px touch-target rule in `docs/design-system.md`
- Found by: Experience & Design Explorer (discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `none found` (prior touch-target tickets covered discover cards, safety microcopy, and signup — not these controls)

## Customer outcome

As a member tapping controls on a phone, I want every interactive control to be at least 44px tall so that I can hit it reliably without mis-taps — the size the design system guarantees.

## What I observed

Priority (RICE): Reach ~0.5 (every host touches the experience-level pills; every profile editor touches add/remove) × Impact 1 (mis-tap friction, and a stated non-negotiable rule violated) × Confidence 0.95 ÷ Effort 0.2 ≈ **P2**.

`docs/design-system.md` states touch targets must be "at least 44 pixels". Two in-scope control groups fall short:

1. **Experience-level pills** (event-create): `.choice-pill { padding: 10px 13px }` with a 17px checkbox and 12px label (`globals.css:774`). Rendered height is roughly 37–40px — under 44px. These are the tappable "Beginner / Intermediate / Advanced" toggles in `CreateEventForm.tsx:260`.
2. **Add/remove buttons** (profile-edit): `.add-sport, .remove-sport { min-height: 42px }` (`globals.css:753`) — the "Add another sport", "Remove", "Add a prompt", "Remove" buttons in `EditProfileForm.tsx:140, :164, :167`. 42px is 2px under the floor.

For comparison, the same file already holds sibling controls to 44px+ (feedback buttons 48px `globals.css:1136`, severity labels 46px `:1134`, progress-rail steps 46px `:777`, event inputs 48px `:774`), so these two are the outliers, not the norm.

## What I expected

Every tappable control on these surfaces meets or exceeds the 44px minimum height the design system mandates, consistent with the already-compliant controls around them.

## Reproduction

1. Open `/events/new`; inspect the experience-level pills — computed height under 44px.
2. Open `/profile`, expand "Edit your profile"; inspect "Add another sport" / "Remove" / "Add a prompt" — `min-height: 42px`.

Reproduction rate: `confirmed by source/CSS measurement`

## Customer impact

Small controls raise mis-tap rate on phones, most affecting members with limited dexterity or larger fingers — the accessibility population the 44px rule exists to protect. Low severity individually, but it is a direct violation of a stated non-negotiable rule, on two commonly-used control groups, and the fix is trivial and systemic.

## Evidence and limits

- Evidence: `globals.css:774` (`.choice-pill`), `globals.css:753` (`.add-sport, .remove-sport`); design-system rule in `docs/design-system.md`; compliant siblings at `globals.css:777, :1134, :1136`.
- Redactions made: none.
- Facts: `.add-sport/.remove-sport` are explicitly `min-height: 42px`; `.choice-pill` has no min-height and computes ~38px from padding + content.
- Hypotheses to verify during implementation: bumping `.choice-pill` to `min-height: 44px` (with `align-items: center`) and `.add-sport/.remove-sport` to `44px` does not introduce overflow or layout shift at 375/1280; prefer a shared value so these can't drift again.
- Paths or surfaces not tested: live computed heights in a browser (measured from CSS source only).

## Duplicate check

- Search terms used: `touch target`, `44px`, `44 pixel`, `min-height`, `choice-pill`, `add-sport` across `tickets/*.md` and `tickets/archive/*.md`.
- Tickets reviewed: `CX-20260630-signup-step1-disabled-back-above-primary-action` (signup buttons, 52px), discover/safety touch-related tickets — none touch these two control groups.
- Why this is new: no existing ticket covers the experience-level pills or the profile add/remove buttons being under 44px.

## Acceptance criteria

- [ ] The experience-level pills on `/events/new` are at least 44px tall.
- [ ] The add/remove sport and add/remove prompt buttons on `/profile` are at least 44px tall.
- [ ] The change introduces no horizontal overflow or layout shift at 375px and 1280px.
- [ ] Visible focus rings and AA contrast on these controls are preserved.
- [ ] Prefer a shared token/value so these targets can't silently drift below 44px again.
- [ ] Relevant automated tests and repository checks pass.
- ~~The interface explains what happened and what can be done next~~ — not applicable; this is a sizing-only fix with no state/flow change.
- ~~Loading, empty, failure, and retry behavior~~ — not applicable; no such states involved.
- ~~No precise location or other sensitive data is exposed~~ — not applicable; presentational CSS only.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
- 2026-07-03 - Directly fixed + verified by orchestrator (trivial systemic CSS): bumped the two sub-44px control groups to the 44px minimum — `.choice-pill` (event-create experience-level pills; was ~37px from `padding:10px 13px` + 17px input) now has `min-height:44px` (already `display:flex; align-items:center`, so content stays centered), and `.add-sport,.remove-sport` (profile-edit add/remove sport & prompt buttons) `min-height:42px → 44px`. No other rule changed; sibling controls in the same file already met 44–48px. Production build passes (CSS-only, no unit-test surface). Status `verified`.
