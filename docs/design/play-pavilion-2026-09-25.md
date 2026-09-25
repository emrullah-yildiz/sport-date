# Play Pavilion: bright, interactive landing

The owner selected a bright sculpture and sport-driven transformation after reviewing Apple, ZHA and interactive 3D website references. This milestone refines the development-only `/preview` website. KeepItUp remains the working identity; real enrollment, billing and deployment are outside this change.

## Experience and visual decisions

The opening reads “Good company. Starts with a game.” A pearl ribbon rises around a mint court, with a coral rally ball, small players and a running loop. Tennis opens the ribbon; Running lowers it into a track and reveals moving companions; Padel raises translucent side panels; All sports combines court and track. Original procedural geometry and a corresponding SVG illustration avoid external models or runtime asset services. Existing fictional Mara photography is retained as a compact human detail, with initials when unavailable and no portrait after blocking.

Apple's AirPods page informed the spacious hero and clear action (https://www.apple.com/airpods-pro/). ZHA's London Aquatics Centre informed continuous flowing geometry (https://www.zha.com/projects/architecture/london-aquatics-centre). Lusion and Bruno Simon informed dimensional interaction (https://lusion.co/, https://bruno-simon.com/). These are references, not copied assets or affiliation claims.

Pavilion colours: background `#F4F5F7`, ink `#182530`, muted copy `#5C6873`, teal `#087D84`, coral `#EF765B`; regular headings and 16px body copy. The light shell applies only to the landing. Existing Play Map discovery and functional screens keep their established presentation. On mobile, the message, sport and city controls, and primary Find a game action precede the compact sculpture. Matching invitations have independent detail and + Join controls. Full, requested, joined and hosted states are explicit.

## Data and access

Landing and discovery share `MapDiscoveryState`. Sport and city changes preserve date, level, language, availability, cost and time preferences while resetting pagination. Changing the city clears its area restriction. The landing uses `filterMapGames` and shows the first three results; it discloses when additional filters apply, displays actual fixture dates and labels destination-local times. It never substitutes unrelated games for an empty result.

The shell supplies permitted games, including locally created games, and removes blocked fixtures. Request/acceptance separation, exact-event authentication return, adult eligibility, explicit demo consent and private meeting-point access continue through the existing preview actions. No new API, database, analytics, browser storage or external requests are introduced. The preview remains noindex and returns not-found outside development.

## Rendering and motion

Three.js is dynamically imported after hydration and motion-preference detection. Text, selectors and game actions remain HTML and usable before the renderer arrives. The SSR-safe motion subscription uses a static initial presentation. Reduced motion does not load the renderer; loading, unavailable WebGL and context loss retain the matching SVG. Tiny Next development async-loader stubs are distinguished from actual renderer downloads in QA.

Sport transitions take 600ms. Pointer depth is limited to fine-pointer devices. The visible pause control freezes the scene; selecting a sport while paused snaps to its new composition. Rendering stops outside the viewport and in hidden tabs. Resolution is capped by device size; observers, animation frames, GPU resources and event listeners are released on unmount. Step illustrations enter once with short motion; reduced motion displays them immediately.

## Verification and review

Passed: 25 focused tests, all workspace typechecks, scoped lint and the production build. The dedicated `qa/pavilion.mjs` suite passed 11 distinct cases across its main run and focused missing-photo/fallback rerun; the complete website suite passed five cases and existing scale/travel suite passed three. Final runs had zero page errors, prohibited requests or browser storage. Screenshots and results are local ignored QA artifacts; the pavilion result file reflects the latest focused rerun.

Checks cover layout at 1440/768/390/320px, all sport/city controls, keyboard use, filter continuity, request/full/block states, actual pause/offscreen/resume, WebGL context loss/unavailability, reduced motion without downloading the renderer, delayed renderer loading with usable HTML controls, missing photos before hydration, long titles and empty results. Final visual review included all four sport compositions and narrow mobile layouts. Review fixes included decorative-scene overflow, SSR-safe motion detection, accessible muted text, softer contact shadows and early image-failure detection.

Local production-server smoke verified `/preview` returns HTTP 404 with noindex and no preview surface. The temporary production-mode server was stopped; the development preview remains available at http://127.0.0.1:3015/preview. No production release occurred.

Human evaluation remains pending. Ask five consenting adults to choose an activity, switch sport/city, request a place, and explain whether the host has accepted. Record independent completion, perceived fun, effort and clarity. Target four of five completing the activity-selection/request journey without assistance. Automated QA and fictional games do not establish this result, attendance, conversion or commercial demand.
