# Cinematic landing scroll

## Direction

Owner asked for Apple-like scroll animation after finding entrance fades too weak. Reference: https://www.apple.com/iphone/ for large visual presentation and product storytelling. This implementation uses original sport artwork and KeepItUp identity.

## Behavior

The latest owner refinement asks for a story whose pieces come together. A native sticky scene now follows four connected moments: a free afternoon, a plan worth joining, acceptance into the group, and a first rally/hello. Over a bounded 500svh section, the same free-day card docks in the scene, court lines draw into place, three other people arrive separately, and a connecting line completes the group. A persistent keepsake collects day + game + company; previous pieces remain as the story advances. The ball leaves all participants visible.

Typography hands off without superimposed readable headlines. The acceptance chapter explicitly waits for the host's decision before meeting details open; this story is illustrative, not an automatic booking promise. Scrolling backward reverses assembly. The hero retains its layered depth. The handoff into the optional tutorials now reads Now make it your afternoon.

The scene never captures wheel/touch input, changes scrolling speed or requires watching before proceeding. Its direct anchor skips to the optional tutorials. Existing real forms/date filtering remain unchanged. Artwork is illustrative, not a claim of live event supply.

## Whole-page narrative revision

The owner found the isolated planning scene too shallow and fast. The full landing now shares one continuous background and five surrounding native-scroll chapters: opening, make the plan yours, room to feel comfortable, next chapter, and epilogue/footer. Each chapter has a drawing line and travelling ball; headings, cards, boundaries, calls to action and closing identity assemble at distinct scroll positions. The existing four-beat plan sequence has a longer 500svh runway. Opening holds for 170svh, other fitted chapters 210svh, and the epilogue 130svh; each has reading time after assembly.

`ScrollChapter` owns reversible local progress without React renders. A ResizeObserver enables sticky presentation only when the complete chapter fits the viewport. Taller mobile content stays in natural document flow and assembles during viewport entry. Reduced-motion and short-screen readers receive compact static content. Focus reveals the whole chapter immediately, retaining direct keyboard access to tutorial, account and legal controls. All walkthroughs continue to reuse actual forms; date filtering and participant privacy are unchanged.

Whole-page QA samples every chapter forward and backward, checks rendered child bounds (not just document overflow), runtime motion switching, focus access and static fallbacks. The review video follows the complete document for 35 seconds, then reverses. These timings describe the recording; the website always follows native user scrolling.

## Accessibility and performance

Content remains readable before JavaScript. Reduced motion and viewports below 620px high get a static, naturally sized story showing every chapter. Runtime preference changes remove the sticky runway and listeners; keyboard focus pauses hero movement. Decorative artwork is hidden from assistive technology and all text remains in document order.

Passive scroll listeners schedule at most one animation frame per event batch. Transform and opacity drive animation without per-frame React state, external assets, network calls or telemetry. No smooth-scroll library or persistent frame loop is introduced.

## Verification

1,262 web tests pass (14 opt-in skipped); production build/type validation pass. Actual-component browser QA verifies reversible keyframes, pinned stage geometry, mobile/desktop viewport widths, runtime reduced-motion switching, keyboard tutorial access, and no requests/errors/overflow. Keyframes were visually reviewed at mobile and desktop sizes. Browser assertions cover persistent pieces, separately arriving guests, final connections, non-overlapping participants and captions, and exact reverse restoration. A recorded desktop walkthrough is stored in ignored runtime artifacts for owner review. No production deployment or measured conversion improvement claimed.
