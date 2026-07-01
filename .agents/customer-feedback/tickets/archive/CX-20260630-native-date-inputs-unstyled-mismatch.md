# CX-20260630-native-date-inputs-unstyled-mismatch

- Status: `verified`
- Severity: `medium`
- Customer journey: Signing up (date of birth) and hosting an event (event start time)
- Surface: `both`
- Environment and viewport/device: Local dev server (`http://localhost:3000`), dev Neon branch, Chromium (Playwright) 1440x900 and 390x844. Observed 2026-06-30.
- Found by: Customer Experience Agent (post-redesign visual audit)
- Implementation owner: `UI engineer (Claude Opus 4.8)`
- Related tickets: `none found`

## Customer outcome

As a cautious adult filling in my date of birth at sign-up and a start time when hosting, I want every field to look like it belongs to the same carefully-made product, so that the form feels trustworthy and finished rather than half-built on top of raw browser controls.

## What I observed

Observed 2026-06-30, reproduced 2/2.

- Sign-up Step 1 "Date of Birth (18+ only)" is a native `type="date"` input. It renders the OS default — a US `mm/dd/yyyy` placeholder and a small native calendar glyph — even though every other field on the card is a custom pill input (rounded 16px, lime focus ring). The mismatch is visible: the date control is the one element that does not match the design system. (Screenshot `_signup_step1_underage_error__desktop.png` shows `01/01/2015` in the native format.)
- Host-an-event ("The rhythm" section) "Starts at" is a native `datetime-local` input. It renders `mm/dd/yyyy --:-- --` with the native calendar/spinner affordance, again the only field that does not match the surrounding custom inputs. (Screenshots `_events_new__desktop.png`, `_events_new__mobile.png`.)
- The format is locale/OS-driven (`mm/dd/yyyy`), so a Europe-first audience is shown a US-style date order with no in-product control over it.

These are facts from computed styles (`appearance: auto`, `font` inherited but the control chrome is native) and the screenshots; the fields are functional, this is a visual-consistency and finish issue, not a broken control.

## What I expected

The date and date-time fields should read as part of the same type system and input styling as the rest of the form — consistent height, radius, border, focus treatment, and ideally a date order that suits a Europe-first audience — so the form looks intentionally designed end to end.

## Reproduction

1. Open `/signup`; look at the "Date of Birth" field next to the email/password pill inputs. Note the native `mm/dd/yyyy` control.
2. Register and open `/events/new`; in "The rhythm" look at "Starts at". Note the native `datetime-local` control.
3. Compare with the adjacent custom-styled inputs.

Reproduction rate: `2/2 safe attempts` (desktop + mobile).

## Customer impact

Medium-low. Nothing is blocked and no data is at risk, but the owner explicitly called out unstyled/native controls as a reason the site felt unfinished. The date fields are the clearest remaining "raw browser control" on two of the most important flows (account creation and hosting), so they undercut the otherwise strong, consistent redesign.

- Authorization/privacy/precise-location: not involved.
- Data loss: not involved.
- Safety: not involved.
- Accessibility: native date controls are keyboard/AT-friendly, so any restyle must preserve that.

## Evidence and limits

- Evidence: screenshots in the session scratchpad `qa-art/` (`_signup_step1_underage_error__desktop.png`, `_events_new__desktop.png`, `_events_new__mobile.png`); computed-style capture shows `appearance: auto` on these inputs.
- Redactions made: synthetic `qa+...@sport-date.invalid` accounts only; no real PII.
- Facts: both fields are native date/datetime controls rendering the OS default format and chrome; all sibling fields are custom-styled; no console errors on either page.
- Hypotheses to verify during implementation: whether to (a) restyle the native control to better match (limited cross-browser control over the calendar glyph), or (b) adopt a custom date component, is an implementation/design decision. Either must keep keyboard + screen-reader support and 18+ validation intact.
- Paths or surfaces not tested: real assistive-tech behavior of a replacement control; Safari/Firefox native rendering (only Chromium observed).

## Duplicate check

- Search terms used: "date", "datetime", "dropdown", "select", "native", "input" across `.agents/customer-feedback/tickets/`.
- Tickets reviewed: `CX-20260630-landing-hero-reduced-motion-hydration-error.md`, `CX-20260630-new-member-empty-discovery-missing-language.md`.
- Why this is new: no existing ticket covers input/control styling or native date fields.

## Acceptance criteria

- [x] The sign-up date-of-birth field visually matches the design system (height, radius, border, focus state) of the other inputs on the card.
- [x] The host-event "Starts at" field visually matches the other inputs in its section.
- [x] 18+ validation and the inline underage error still work after any restyle.
- [x] Keyboard entry and screen-reader labeling of the date/date-time fields remain intact.
- [x] Desktop (1440) and mobile (390) both render the restyled fields without overflow or clipping. (verified in real Chromium 1440 + 390)
- [x] No new console errors are introduced (both pages are at 0 today).

Removed criteria: precise-location/data-exposure deleted — no member data is exposed by these fields.

## Handoff and retest log

- `2026-06-30 13:39 GTBDT` - Filed by Customer Experience Agent; status `ready`. Reproduced on `/signup` and `/events/new`, desktop + mobile.
- `2026-06-30 14:02 GTBDT` - Independently retested by Customer Experience Agent (real Chromium, dev DB) at 1440 and 390; status → `verified`. Sign-up DOB and the host-event "Starts at" now read as part of the form: both compute `appearance: none`, sit at the same height/radius/border as their sibling inputs, and the native calendar glyph is dimmed/tidied (still clickable). The `.field-format-hint` line is present under both ("Date order follows your browser's region."). The inline underage error still fires: entering `2015-01-01` on Step 1 surfaced `#signup-date-of-birth-error` = "You must be 18 or older to use Sport Date." Keyboard entry intact. No overflow/clipping at 1440 or 390 (event form stacks to one column on mobile). 0 console errors on `/signup` and `/events/new`. Note (not a defect): Chromium still renders the `datetime-local` placeholder as `mm/dd/yyyy --:-- --` regardless of `en-GB` locale — this is browser-controlled and is exactly what the format hint exists to cover. Evidence in `qa-art2/`: `signup_step1_underage_error__desktop.png`, `events_new__desktop.png`, `events_new__mobile.png`. Customer outcome genuinely fixed.
- `2026-06-30 13:48 GTBDT` - Implemented by UI engineer (Claude Opus 4.8); status → `implemented`. Restyled (did NOT replace) the native controls. In `apps/web/src/app/globals.css`, added global `input[type="date"]` / `input[type="datetime-local"]` rules: `appearance: none`, a lime `:focus-visible` ring matching the other inputs, and a tidied `::-webkit-calendar-picker-indicator` (reduced opacity, pointer cursor, rounded hover background, reduced-motion-safe transition). The fields keep each surface's own border/radius/height/padding — signup DOB via `.form-group input` (rounded 16px, lime focus), event "Starts at" via `.event-form input`. Per the ticket, did NOT force mm/dd vs dd/mm order (browser-locale controlled); instead added a small `.field-format-hint` line under the DOB field (`SignUpStep1.tsx`) and the "Starts at" field (`CreateEventForm.tsx`) noting the date order follows the browser's region — so EU users aren't surprised. 18+ validation (`dateOfBirthError`) and the inline underage error path are untouched and still fire. Verified: `npx eslint src/` 0 problems; `npm run typecheck` green; web tests 131 passed + 12 skipped (domain 61 → 192 + 12 total); Turbopack build compiled. Only Chromium reasoned about; Safari/Firefox native rendering + 1440/390 overflow still want a real-browser screenshot.
