# Cinematic landing scroll

## Direction

Owner asked for Apple-like scroll animation after finding entrance fades too weak. Reference: https://www.apple.com/iphone/ for large visual presentation and product storytelling. This implementation uses original sport artwork and KeepItUp identity.

## Behavior

The latest owner refinement asks for a story whose pieces come together. A native sticky scene now follows four connected moments: a free afternoon, a plan worth joining, acceptance into the group, and a first rally/hello. Over a bounded 300svh section, the same free-day card docks in the scene, court lines draw into place, three other people arrive separately, and a connecting line completes the group. A persistent keepsake collects day + game + company; previous pieces remain as the story advances. The ball leaves all participants visible.

Typography hands off without superimposed readable headlines. The acceptance chapter explicitly waits for the host's decision before meeting details open; this story is illustrative, not an automatic booking promise. Scrolling backward reverses assembly. The hero retains its layered depth. The handoff into the optional tutorials now reads Now make it your afternoon.

The scene never captures wheel/touch input, changes scrolling speed or requires watching before proceeding. Its direct anchor skips to the optional tutorials. Existing real forms/date filtering remain unchanged. Artwork is illustrative, not a claim of live event supply.

## Accessibility and performance

Content remains readable before JavaScript. Reduced motion and viewports below 620px high get a static, naturally sized story showing every chapter. Runtime preference changes remove the sticky runway and listeners; keyboard focus pauses hero movement. Decorative artwork is hidden from assistive technology and all text remains in document order.

Passive scroll listeners schedule at most one animation frame per event batch. Transform and opacity drive animation without per-frame React state, external assets, network calls or telemetry. No smooth-scroll library or persistent frame loop is introduced.

## Verification

1,261 web tests pass (14 opt-in skipped); production build/type validation pass. Actual-component browser QA verifies reversible keyframes, pinned stage geometry, mobile/desktop viewport widths, runtime reduced-motion switching, keyboard tutorial access, and no requests/errors/overflow. Keyframes were visually reviewed at mobile and desktop sizes. Browser assertions cover persistent pieces, separately arriving guests, final connections, non-overlapping participants and captions, and exact reverse restoration. A recorded desktop walkthrough is stored in ignored runtime artifacts for owner review. No production deployment or measured conversion improvement claimed.
