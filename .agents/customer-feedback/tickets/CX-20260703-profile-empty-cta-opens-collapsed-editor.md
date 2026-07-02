# CX-20260703-profile-empty-cta-opens-collapsed-editor

- Status: `ready`
- Severity: `medium`
- Customer journey: New/incomplete member completes their profile from the empty-state prompts (`/profile`)
- Surface: `web`
- Environment and viewport/device: Source audit of `apps/web/src/app/profile/page.tsx` and `apps/web/src/components/EditProfileForm.tsx`; all viewports
- Found by: Experience & Design Explorer (discovery pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-empty-states-lack-warmth-and-next-step` (archived — added the warm empty-state copy and the `#edit-profile` anchor/CTAs; it did NOT verify the editor actually opens when the anchor is reached — this ticket fixes that residual gap)

## Customer outcome

As a new member nudged to fill in my profile, I want the "Write a short intro / Add a language / Add a sport / Answer a prompt" links to actually take me to an open, ready-to-type editor so that I can act on the prompt in one step instead of hunting for a closed accordion.

## What I observed

Priority (RICE): Reach ~0.6 (new/incomplete members are exactly who sees the empty-state CTAs) × Impact 2 (the promised next step silently doesn't complete) × Confidence 0.85 ÷ Effort 0.4 ≈ **P2**.

Each empty profile section renders a `profile-empty-action` link pointing at `#edit-profile` — "Write a short intro →" (`profile/page.tsx:140`), "Add a language →" (`:162`), "Add a sport →" (`:185`), "Answer a prompt →" (`:202`).

The target of `#edit-profile` is a **collapsed `<details>`**: `EditProfileForm.tsx:132` renders `<details className="edit-profile" id="edit-profile">` with `<summary>Edit your profile</summary>` and no `open` attribute. The `id` sits on the `<details>` element itself, so activating a CTA scrolls to the collapsed "Edit your profile ▸" summary but leaves the editor closed — the fields the CTA named (intro/bio, languages, sports, prompts) are still hidden. The member must then notice and click the summary to expand, then locate the right field. For a keyboard/AT member the arrival lands on a closed disclosure with no indication the promised field is one more interaction away.

The prior warmth ticket verified the anchor and the four links *render*; it did not confirm that reaching the anchor *opens* the editor or focuses the relevant field. It does not.

## What I expected

Activating an empty-state CTA should leave the profile editor open and move the member to (or near) the field the CTA named, so the promised action is one step, on both pointer and keyboard.

## Reproduction

1. Sign in as a member with an empty intro (and/or no languages/sports/prompts) and open `/profile`.
2. Activate "Write a short intro →" in the Intro panel.
3. Observe the page scrolls to the "Edit your profile" summary, but the editor stays collapsed and the bio field is not shown or focused.

Reproduction rate: `confirmed by source (collapsed <details> target, no open/focus behavior)`

## Customer impact

The exact members we ask to complete their profile — cautious newcomers — get a broken-feeling next step: the CTA implies "start writing" but drops them on a closed accordion. Some will abandon the task, leaving thinner profiles (which the copy itself says hurts matching and being found). Accessibility is involved: keyboard/AT members get no cue the field is behind a further disclosure toggle.

## What I expected / scope

Smallest fix: ensure that reaching the editor via a CTA opens it and reaches the relevant field — e.g. point each CTA at an `id` on the target field *inside* the `<details>` (modern browsers expand a closed `<details>` when navigating to a fragment within it) and/or a tiny hashchange enhancement that sets the `<details>` `open` and focuses the field. Keep it token/markup-driven; no new dependency.

## Evidence and limits

- Evidence: `profile/page.tsx:140, :162, :185, :202`; `EditProfileForm.tsx:132`.
- Redactions made: none.
- Facts: CTAs target `#edit-profile`; that id is on a `<details>` with no `open`; no client code opens it on navigation; fields have no individual ids/anchors.
- Hypotheses to verify during implementation: confirm the chosen approach opens the editor and lands focus on the named field across current Chrome/Firefox/Safari; verify reduced-motion members arrive correctly (focus-based, not scroll-animation-dependent).
- Paths or surfaces not tested: live cross-browser `<details>` fragment auto-expand behavior (source-level only).

## Duplicate check

- Search terms used: `edit-profile`, `#edit-profile`, `empty state`, `accordion`, `collapsed`, `details open`, `profile-empty` across `tickets/*.md` and `tickets/archive/*.md`.
- Tickets reviewed: `CX-20260701-empty-states-lack-warmth-and-next-step` (added the anchor + CTAs; verified they render, not that the editor opens), `CX-20260630-new-member-empty-discovery-missing-language` (discovery empty copy — different surface).
- Why this is new: no existing ticket addresses that the `#edit-profile` target is a collapsed `<details>` that stays closed on navigation, so the CTA doesn't complete its promised jump-to-field.

## Acceptance criteria

- [ ] Activating any empty-state CTA leaves the profile editor open (no manual second click on the summary).
- [ ] After activation, keyboard/AT focus lands on or immediately at the field the CTA named (intro/bio, languages, sports, or prompts).
- [ ] Behavior works for pointer and keyboard, and reduced-motion members arrive at the correct field.
- [ ] The interface makes clear where the member has landed without internal terminology.
- [ ] Empty vs error vs loading states on the profile remain distinct and unaffected.
- [ ] Web layout stays usable at 375px and 1280px with no overflow.
- [ ] Visible focus, contrast (AA), and 44px targets on the CTAs and editor controls are preserved.
- [ ] Relevant automated tests and repository checks pass.
- ~~No precise location or other sensitive data is exposed~~ — not applicable; this is the member's own editor, no location surfaced.

## Handoff and retest log

- 2026-07-03 - Filed by Explorer discovery pass; status `ready`.
