# On-demand tutorials and free-date discovery

## Owner direction

Make how-it-works optional, remove repetitive fake/demo language, explain hosting and participation using the real interfaces with sketch-style bubbles and arrows. Treat available free time as a starting point for organizing and finding activities.

## Design

The landing page offers a compact See how it works button. A native modal dialog opens two choices, Host an event and Join an event. Tutorials mount only after an explicit click; Escape and Close return focus to the opener. One short practice disclosure explains that nothing is published or sent.

Tutorials reuse CreateEventForm, JoinRequestControls and AddressAutocomplete. Small optional tutorial adapters substitute local example data and outcomes, suppress metrics and network effects, and announce stage changes to the coach. The normal components and server authorization remain the source of truth. The tutorial does not simulate automatic host acceptance. Address practice uses a local example suggestion and omits remote map tiles.

The old standalone demo state machine is removed. Stage-specific notes explain the live controls rather than inventing a second product interface. Bubbles and arrows animate on changes and respect reduced motion. Draft content exists only in component memory and is discarded on closing.

## Free time

Discovery offers a specific calendar-date choice in addition to rolling time shortcuts. The chosen date matches the calendar date at the event's published timezone, consistent with event cards. It selects future events starting on that date, independently of the former 30-day horizon. Other filters and eligibility still apply. No personal availability calendar is stored or shared.

## Verification

1,260 web tests and 229 domain tests passed; 14 opt-in tests skipped. All workspace typechecks and production build passed. Lint has no errors and 11 existing warnings. A login test timed out under concurrent CPU load, passed alone, then passed with the full suite limited to four workers.

Synthetic browser fixtures prove tutorial completion, cancellation and address lookup do not call live APIs or analytics. Mobile/desktop normal/reduced-motion checks cover close/Escape focus, stage bubbles, actual form validation, draft retention and real-form failure/retry. This exposed a pre-commit host error-focus race, now corrected with post-commit focus.

Date tests cover valid/invalid calendar days, preservation and clearing, both API paths and filtering before the result limit. Fourteen PostgreSQL synthetic VALUES checks verify local midnight, spring and autumn DST, other timezones, far-future dates and rolling fallback. No application rows were accessed or mutated. Visual screenshots of tutorials and the date picker were reviewed.
