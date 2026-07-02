# CX-20260702-profile-photo-upload-input-overflows-mobile-375

- Status: `ready`
- Severity: `low`
- Priority: `P3 polish` — (Reach 4 × Impact 2 × Confidence 5) / Effort 1 = 40 → P3. Reach 4: every member who opens `/profile` on a phone-width screen (a core account surface, visited by most members) — the photo-upload control is always rendered. Impact 2: the page scrolls sideways and content shifts, which feels unpolished and slightly broken on a trust-critical account page, but no journey is blocked and nothing is hidden or unusable. Confidence 5: measured live and reproduced; the offending element and its intrinsic width are pinned. Effort 1: constrain one control's width in CSS. Not a safety/privacy/auth/a11y floor, so P3.
- Customer journey: account & trust — managing my profile (photos) on a phone
- Surface: `web` (responsive; observed at the 375px mobile viewport)
- Environment and viewport/device: `/profile`, dev server localhost:3000, Chromium at viewport width 375. Signed in as a pooled synthetic adult (seeker-D). Observed 2026-07-02.
- Found by: user-simulator (account & trust journey pass)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-profile-photo-series-up-to-six` (archived — the photo feature itself / storage; this ticket is only the mobile *layout* of its upload control), `CX-20260701-profile-action-strip-flat-no-hierarchy` (verified — a different profile region), `CX-20260630-research-bucharest-hero-visual-overflows-container` (a different page's overflow). No existing ticket covers the profile photo-upload control overflowing at 375.

## Customer outcome

As a cautious adult member setting up my profile on my phone, I want the "Add a photo" upload control to fit within the screen, so that my profile page does not scroll sideways and feel broken on the exact surface where I decide how much of myself to share.

## What I observed

On `/profile` at a 375px-wide viewport the whole document is horizontally scrollable: `document.documentElement.scrollWidth` measured **438px against a 375px client width** — 63px of sideways overflow. Tracing the widest element on the page, the offender is the profile photo-upload control:

- `label.profile-photos-upload-label` — left 39px, width **399px**, right edge **438px** (63px past the viewport).
- its child `input[type="file"]` ("Add a photo") — same 399px width / 438px right edge.

The native file input is sized to its own intrinsic content (the "Choose file / No file chosen" text + button), and because the label is `display: inline-flex; flex-direction: column` with no `max-width`, the label grows to that intrinsic width and pushes the page wider than the phone screen. Everything else on the page fits (the `/safety` and `/discover` pages at 375 measured `scrollWidth == clientWidth`, no overflow), so this control is the sole cause.

Not observed as broken (correct, keep): at 1280px `/profile` does not overflow (`scrollWidth == clientWidth`); the session-management panel, action strip, and hero all fit; the file input has a visible focus outline (`outline: 3px solid` on `:focus-visible`).

## What I expected

The photo-upload control should fit inside the phone viewport like every other element, so `/profile` never scrolls horizontally at 375px. A member should be able to swipe down their profile without the page drifting sideways.

## Reproduction

1. Sign in as any member and open `/profile`.
2. Set the browser/emulated viewport to 375px wide (a common phone width).
3. Observe the page can be scrolled horizontally; content is 438px wide against a 375px screen.
4. Inspect: the `.profile-photos-upload-label` / `input[type="file"]` ("Add a photo") is ~399px wide and extends ~63px past the right edge.

Reproduction rate: `2/2 safe attempts` (measured twice in headless Chromium at 375px).

## Customer impact

Practical: on a phone the profile page drifts sideways, so tapping/scrolling feels imprecise and the layout looks broken on a page that is supposed to convey care and trustworthiness. Emotional: the profile is where a cautious member weighs how much to reveal (including photos); a page that visibly overflows undercuts confidence at that moment. No authorization, privacy, precise-location, or data-loss dimension — this is purely responsive layout. Accessibility: sideways overflow can make content harder to reach for some members, but the control remains operable; not a hard a11y floor, so kept at low severity.

## Evidence and limits

- Evidence: live measurement at 375px — `documentElement.scrollWidth = 438`, `clientWidth = 375`; widest overflowing elements are `label.profile-photos-upload-label` and its `input[type="file"]` at width 399 / right 438. Source: `apps/web/src/app/globals.css` — `.profile-photos-upload-label { display: inline-flex; flex-direction: column; gap: 8px; ... }` (no `max-width`) and `.profile-photos-upload-label input[type="file"] { min-height: 44px; padding: 10px; ... }` (no `width`/`max-width`), so the label sizes to the native file input's intrinsic content width.
- Redactions made: none needed (no member data, no precise location).
- Facts: `/profile` overflows at 375; `/safety` and `/discover` do not; `/profile` does not overflow at 1280.
- Hypotheses to verify during implementation: whether the cleanest fix is `width: 100%` + `max-width: 100%` (and `box-sizing: border-box`) on the file input, or `max-width: 100%` on the label, or a styled file-picker button that wraps the native input; confirm the fix holds with a long localized "No file chosen" string and after a file is selected (the chosen filename can also widen a native file input).
- Paths or surfaces not tested: the control's width *after* a file is selected (filename may re-widen it); other viewport widths between 320 and 375; real mobile Safari (native file-input rendering differs by browser).

## Duplicate check

- Search terms used: overflow, 375, mobile, upload, input[type=file], "Add a photo", profile, horizontal, photo.
- Tickets reviewed: full active queue + archive photo/profile/overflow tickets (`profile-photo-series-up-to-six`, `photo-reorder-500-check-constraint`, `profile-action-strip-flat-no-hierarchy`, `profile-lacks-rich-browsable-detail`, `profile-hero-off-scale-headline`, `research-bucharest-hero-visual-overflows-container`).
- Why this is new: no ticket addresses the profile photo-upload control's mobile overflow. The photo-series ticket delivered the feature and storage; this is a follow-up responsive-layout defect on its upload control, independently fixable in `globals.css`.

## Acceptance criteria

- [ ] At 375px, `/profile` no longer scrolls horizontally: `document.documentElement.scrollWidth <= clientWidth` (no element extends past the viewport).
- [ ] The "Add a photo" file input and its label fit within the profile-photos panel at 375px and stay within it after a file is selected (a long chosen filename does not re-introduce overflow).
- [ ] The file input keeps its ≥44px touch target and its visible `:focus-visible` outline.
- [ ] No regression at 1280px (still no overflow; control still legible and on the anthracite+neon token system).
- [ ] Relevant repository checks pass.

## Handoff and retest log

- 2026-07-02 - Filed by user-simulator (account & trust journey pass); status `ready`. Overflow measured live in Chromium at 375px (scrollWidth 438 vs client 375); offender pinned to `.profile-photos-upload-label` / `input[type="file"]` (width 399). Self-contained for an implementer in `globals.css`; live re-check of 375 overflow == 0 owed after fix.
