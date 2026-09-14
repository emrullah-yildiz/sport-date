# Discovery direction: choose your next plan

The owner's latest direction is an outcome brief: discovery should feel exciting, contemporary and easy, with less explanatory text. Swipe, double-tap and numbered shortcuts are hypotheses, not requirements. Success is understanding a real activity and confidently requesting a place, followed by attendance and return. Novelty alone is not success.

## Reference observations

- [Partiful Explore](https://partiful.com/explore) pairs event images and distinctive titles with compact time/city context and community descriptions. Its [official Explore explanation](https://help.partiful.com/en-us/articles/15525568-what-is-the-partiful-explore-page) frames discovery around local events and communities. Borrow the invitation-first hierarchy, not public popularity pressure or copied artwork.
- [Luma Discover](https://luma.com/discover) offers categories including Running and Fitness as useful starting points. Its [app guide](https://help.lu.ma/p/luma-ios-app) distinguishes discovering, registering and the event-day ticket. Borrow progressive detail and a clear next action, not a long configuration form before seeing plans.
- [DICE's event experience](https://dice.fm/event/mxrgmr-the-whine-up-club-27th-sep-xanadu-new-york-city-tickets?lng=en-US) describes discovery, saving and ticket access as distinct activities. The general home page was unavailable to the research fetch, so no homepage interaction or conversion result is claimed. Borrow the distinction between exploring interest and making a commitment.

These are observed product patterns, not evidence that adopting them will increase our conversion. No assets, participant data or popularity counts are imported.

## Chosen direction

Build an activity-first discovery stage with bold sport graphics, strong type, one focused invitation and concise logistics: sport, start time, approximate area, availability and host context. Give the member an alternative grid for comparison. Keep the current search scope visible; move detailed filters into a compact disclosure without silently changing their values or eligibility rules.

Browsing should feel tactile through card movement and visual rhythm, while explicit controls remain understandable by touch, keyboard and assistive technology. Next/Previous lets a person pass a plan and return; it does not reject a member, notify a host or train an undisclosed preference model. A finite result set has a visible ending. A double-tap must not silently create a commitment.

The primary action opens the existing event plan and request flow. The member can inspect time, fit and host information before an explicit request. Pending is not accepted; exact meeting details remain protected. Empty discovery stays honestly empty with useful scope adjustment or hosting actions, not fabricated nearby events.

## Verification and next tests

First verify the real integrated page: server eligibility and entitlement filters unchanged, no extra personal or exact-location serialization, correct pending/accepted links, keyboard navigation, mobile viewport, reduced motion, one/many/zero results and long titles. Use synthetic data only in isolated QA.

Then extend the same visual language into event detail and request confirmation, retaining visible safety controls through progressive disclosure. Evaluate whether unfamiliar adults can explain the activity, time, approximate area and next step without coaching. Treat five-second comprehension and completed request flow as hypotheses to measure with real participants once recruitment is authorized. Do not claim user comprehension or commercial gains from developer inspection alone.
# Implementation evidence

The actual discovery page now implements the direction below. Mobile review caught excessive distance to the event action: the coordinator reduced hero size, shortened introductory copy and reduced mobile artwork height to 128px while retaining the full desktop poster. Filters use a concise native disclosure. This is a tested design hypothesis, not demonstrated user preference or conversion uplift.

Verified 1,201 web tests (14 skipped), typecheck, lint (zero errors/11 existing warnings) and production build. The actual page runs in `apps/web/qa/discovery-design.mjs` with synthetic read-only dependency replacements, actual shared navigation/components/styles, and all network traffic blocked. Mobile 390px in normal/reduced motion and desktop 1280px cover finite keyboard browsing, grid, zero/one/multiple invitations, long titles, preserved everywhere filter, and overflow. Screenshots are in ignored runtime/discovery-qa. Deployment and live authenticated end-to-end verification remain separate.
