# Event steps and motion - September 15, 2026

## Outcome

Owner requested less crowded event hosting and participation, plus more interactive page motion. Hosting now has Activity, Time, Group, Place and Review stages. Participation has an optional note followed by review and explicit Send request. Back preserves drafts during the current visit; no browser storage of sensitive form content was added.

## Interaction and privacy decisions

- Host sections remain mounted but hidden outside the active step, preserving native field values and the selected address. Continue validates the current step; publishing validates the whole form. Server errors reopen the appropriate step and focus the field, section heading or error summary.
- Only the final publish/send action performs the mutation. Pending submissions lock editing; failure preserves the draft. Existing server authorization, adult eligibility, location visibility, request cancellation and reliability gates remain authoritative.
- Precise meeting data appears only in the host's review and the existing authorized accepted-member destinations. Discovery retains its approximate-area boundary.
- Landing sections, discovery grid cards and the event detail area panel animate once as they enter view. Content remains readable without JavaScript or IntersectionObserver. No scrolling is intercepted. Reduced-motion and keyboard-focus paths cancel movement.
- Metrics remain the existing anonymous publish/request counters. No drafts, exact locations or new behavioral telemetry are recorded.

## Verification

- Full suite: 1,226 web tests and 229 domain tests passed; 14 opt-in web tests skipped.
- All workspace typechecks passed. Web production build passed. Lint: no errors, 11 existing warnings.
- Isolated actual-component browser checks cover host and join steps, mobile/desktop, reduced motion, draft retention, current-step validation, review without submission, request payloads, failure/retry, field focus and viewport width. Address lookup and mutations use synthetic responses; no live events or requests are created.
- Updated discovery replay covers the integrated detail-to-review-to-pending flow. Scroll behavior has unit coverage for fallback, one-time entry, reduced motion, focus and cleanup, plus isolated browser checks.
- Host and join mobile screenshots inspected. No production UI deployment or measured conversion improvement is claimed.

## Next evidence

Prepare the exact reviewed release; observe first-time host and participant completion under approved testing scope; use existing funnel data to assess completion rather than time spent.
