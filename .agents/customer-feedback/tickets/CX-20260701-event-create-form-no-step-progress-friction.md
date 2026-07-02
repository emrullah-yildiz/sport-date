# CX-20260701-event-create-form-no-step-progress-friction

- Status: `implemented`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 3) / Effort 3 = 16. Every host meets this; moderate friction; the entry point and publish success are already solved, so this is the remaining "creation is easy" gap. P2 medium.
- Customer journey: intent → commitment (hosting / event creation)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths; especially 375px
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criteria 1 and 6
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-event-creation-entry-point-not-discoverable` (verified — entry point + publish success), `CX-20260630-native-date-inputs-unstyled-mismatch` (verified — the datetime field styling)

## Customer outcome

As a first-time host, I want event creation broken into a few clearly ordered, self-explanatory steps with a sense of progress, so that I understand what is being asked and never face a wall of ~18 fields at once.

## What I observed

`apps/web/src/app/events/new/page.tsx` renders `CreateEventForm` as a **single long form** presenting all fields at once: sport, title, description, start time, duration, capacity, language, experience-level checkboxes, min/max age, and a full public + private location block (city, country code, area, venue, address, instructions). The form is well grouped into three labelled `<section>`s ("The invitation", "The rhythm", public/private location) and the copy is warm, but there is:

- no step indicator or progress affordance ("Step 2 of 3");
- no way to move through it a chunk at a time;
- no per-step focal point — a first-time host meets roughly eighteen inputs on one screen with a single "Publish the invitation" button at the very bottom.

This contrasts with signup, which is a genuine stepped flow with an indicator (and already has its own clarity tickets). The create-event journey has no equivalent "where am I / what remains" support.

## What I expected

Event creation presented as a small number of clearly ordered steps (e.g. 1 Invitation → 2 Rhythm & who it's for → 3 Where you'll meet → review & publish), or at minimum a clear progress/section indicator with the existing sections, so the host always knows how many steps remain and what each covers. Sensible defaults are preserved (duration 90, capacity 4, levels beginner+intermediate, ages 24–38). Inline help stays. Publishing still lands on the existing verified "It's live" success state. The private-meeting-point separation and copy must be unchanged.

## Reproduction

1. Sign in, open "Host an event" (`/events/new`).
2. Note the entire form appears at once with no step indicator or progress, ~18 inputs before the publish button.
3. At 375px, note the length of the single scroll and the absence of a "where am I" cue.

Reproduction rate: `confirmed via source + surface review 2026-07-01`

## Customer impact

A long undifferentiated form raises perceived effort and abandonment for first-time hosts — directly working against owner criteria "the steps are easy to understand" (1) and "event creation is easy" (6). Host supply is the scarce side of a local marketplace, so friction here suppresses event liquidity. No auth/privacy regression, provided the public/private location separation is preserved.

## Evidence and limits

- Evidence: `CreateEventForm.tsx` (single `<form>`, three sections, ~18 inputs, one submit); `events/new/page.tsx` wrapper.
- Redactions made: none needed.
- Facts: no step indicator/progress on create-event; signup by contrast is stepped.
- Hypotheses to verify during implementation: whether a true multi-step wizard or a lighter progress/section indicator best reduces friction without adding clicks; validation timing per step; that defaults and the datetime/timezone capture behaviour are preserved.
- Paths or surfaces not tested: the mobile app's create flow (verify parity separately).

## Duplicate check

- Search terms used: "create event", "host", "step", "wizard", "progress", "form".
- Tickets reviewed: full queue. The entry-point ticket is verified and about *finding* create + post-publish success, not the form's internal step clarity; the native-date ticket is about one field's styling.
- Why this is new: no ticket addresses the create-event form's step/progress clarity and length.

## Acceptance criteria

- [ ] Event creation communicates clear ordered steps or sections with a visible sense of progress and what remains, so a first-time host is never faced with the whole form as one undifferentiated wall.
- [ ] Existing sensible defaults, inline help, timezone capture, and the datetime field behaviour are preserved; no field becomes newly required.
- [ ] The public (discovery) vs. private (accepted-only) location separation is unchanged; the precise meeting point is never exposed to discovery.
- [ ] Validation errors are surfaced at the relevant step/section and a member can recover without losing entered data.
- [ ] Publishing still lands on the existing "It's live" success state with view/manage/share.
- [ ] Mobile (375px) and web layouts remain usable; keyboard order, focus visibility, screen-reader naming, contrast, 44px targets, and reduced-motion covered.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criteria 1 and 6); status `ready`.
- 2026-07-02 - Implemented by Experience Build Agent; status `implemented`. Kept the single form with one Publish at the end (no wizard, no clicks added, no data loss) and added a calm sense of structure/progress: (1) a top progress rail (`nav`, `aria-label="Event details progress"`) naming and linking the three ordered sections — The invitation / The rhythm / Where you'll meet — so the host sees the shape before scrolling; (2) a quiet "Section N of 3" indicator plus an `aria-labelledby` heading landmark on each `<section>` for keyboard/SR orientation; (3) on a blocked submit the rail quietly flags which sections need attention (informative, never a blocker) beside the existing field-tied summary, so recovery is oriented and entered data is preserved. Defaults, inline help, timezone capture, datetime behaviour, and the public/private location separation are unchanged; no field became newly required; no gamification/motion. Section metadata is the single source of truth in `event-create-recovery.ts`. Anthracite+neon tokens only in globals.css; mobile 375px stacks the rail to one column; 44px targets; visible focus via global fallback. Files: `apps/web/src/components/CreateEventForm.tsx`, `apps/web/src/lib/event-create-recovery.ts`, `apps/web/src/lib/event-create-recovery.test.ts`, `apps/web/src/app/globals.css`. Test: added `form sections (structure + progress orientation)` suite in `event-create-recovery.test.ts` (partition-of-EVENT_FIELD_ORDER, public-before-private order, "Section N of M" label, field→section mapping, attention-flagging in section order). Checks: typecheck / lint (0 errors) / test (661 passed) / production build — all pass. Commit `8e0335e`, pushed to origin/main. Ready for independent Explorer retest.
