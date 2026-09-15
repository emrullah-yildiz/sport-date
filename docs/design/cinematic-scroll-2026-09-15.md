# Cinematic landing scroll

## Direction

Owner asked for Apple-like scroll animation after finding entrance fades too weak. Reference: https://www.apple.com/iphone/ for large visual presentation and product storytelling. This implementation uses original sport artwork and KeepItUp identity.

## Behavior

A native sticky scene between the hero and tutorials tells three short chapters: free time, activity, company. Over a bounded 240svh section, scrolling rotates/scales the court, moves the ball, lifts away the calendar and introduces the group. Typography hands off without superimposed readable headlines. Scrolling backward reverses the same sequence. The hero uses separate depth rates for its artwork, court lines, players, ball and copy.

The scene never captures wheel/touch input, changes scrolling speed or requires watching before proceeding. Its direct anchor skips to the optional tutorials. Existing real forms/date filtering remain unchanged. Artwork is illustrative, not a claim of live event supply.

## Accessibility and performance

Content remains readable before JavaScript. Reduced motion and viewports below 620px high get a static, naturally sized story showing every chapter. Runtime preference changes remove the sticky runway and listeners; keyboard focus pauses hero movement. Decorative artwork is hidden from assistive technology and all text remains in document order.

Passive scroll listeners schedule at most one animation frame per event batch. Transform and opacity drive animation without per-frame React state, external assets, network calls or telemetry. No smooth-scroll library or persistent frame loop is introduced.

## Verification

1,261 web tests pass (14 opt-in skipped); production build/type validation pass. Actual-component browser QA verifies reversible keyframes, pinned stage geometry, mobile/desktop viewport widths, runtime reduced-motion switching, keyboard tutorial access, and no requests/errors/overflow. Keyframes were visually reviewed. A recorded desktop walkthrough is stored in ignored runtime artifacts for owner review. No production deployment or measured conversion improvement claimed.
