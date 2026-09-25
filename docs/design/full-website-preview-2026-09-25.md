# Complete Play Map website preview

The owner requested the whole website: landing, sign-up, sign-in, creating a game and very easy joining from a list. `/preview` now presents a coherent local website without the three-theme comparison frame. KeepItUp remains the working identity. Existing production pages and credentials are unchanged.

## Complete journeys

- **Landing:** expressive portrait/court artwork, one dominant Find a game action, three concise steps, featured game cards with separate detail and **+ Join** buttons, and a create-game entry.
- **Public discovery:** the existing destination/travel filters and bounded map clusters, plus a direct **+ Join** action on every result. Details remain available independently. Full games are disabled. Requested, joined and hosted states replace the join label so repeated requests cannot be mistaken for new actions.
- **Sign-in:** one screen, fictional sample credentials available through Use demo details. The chosen game or create-game intent survives sign-in. A join started while signed out returns to that exact game with an explicit Send request action.
- **Sign-up:** four short stages: Account, You, Your game, Ready. Back preserves the draft. The fictional date of birth must establish adulthood, and confirmations are unchecked until explicitly selected. Passwords and dates of birth never pass to the parent shell. Demo notices explicitly do not create a real account or accept actual service terms.
- **Creating:** three stages: The game, Time & place, Ready. Sport/name/level, city/area/date/time/places/private meeting point, then a review. The new local game appears in discovery and My games. A draft's chosen city survives leaving and reopening creation. A published demo game is immutable; cancellation is explicit.
- **Joining:** signed-in users tap **+ Join** once to request a place. The list immediately says Requested and My games shows the plan. Host acceptance remains separate. A small Preview actions control outside the product content simulates acceptance so the owner can inspect confirmation and location access.
- **My games and profiles:** requested, accepted and hosted plans in one list; host photo arrows, keyboard and touch navigation; self-described sport attributes; an account view and sign-out. Withdrawal, leaving and cancellation require a brief explicit confirmation.
- **Navigation:** browser Back restores the correct event. Filters survive opening games and authentication. Stale notifications clear when changing screens. Blocked hosts disappear from both discovery and landing; report/block are compact, explicit demo actions.

## Visual system

Midnight `#161C29`, panel `#1C2634`, cyan `#A4E9DC`, coral `#F3A08F`, chalk `#EEF0E9`. Body 16px/400; regular display headings; 49px primary controls; 7–15px control/panel radii. Photography and court lines carry the playful character. Forms use simple focused cards; auth cards use a light paper surface. Deep guidance is absent from browsing, while short request and location context appears at the decision point.

The comparison at `/concepts` remains available. Its original interactions are preserved; direct join controls are optional additions to the shared discovery component.

## Local data and access boundary

The preview is development-only with noindex metadata and a production not-found guard. It uses fictional fixture games dated October 2–8, 2026 and a fixed September 25 reference date for demo eligibility and creation validation. New games and account/session state live in memory. Refresh or sign-out clears the demo session. No APIs, real accounts, email, billing, analytics or browser storage are used.

Precise meeting points are excluded from discovery records and only rendered to the signed-in host or an accepted participant. Pending or signed-out viewers cannot see them. Host acceptance is never inferred from clicking Join. No actual production authentication, authorization, location or consent rule has been replaced by this prototype.

Before production integration, real authentication, canonical time-zone conversion, server-authoritative capacity and membership, legal notices and account lifecycle must remain enforced by the existing application. The fixed fixtures and sample-credential shortcut are strictly preview behavior.

## Verification

Passed: 22 focused tests, all workspace typechecks, scoped ESLint, production build, five complete website browser cases and three shared map/travel regression cases. Browser runs recorded zero runtime errors, prohibited network requests or browser storage. Desktop and mobile captures were visually reviewed and contrast issues corrected. A local production HTTP smoke returned 404 with noindex for `/preview`, with no preview surface rendered.

Focused model/auth/route tests cover adult/date validation, explicit confirmations, valid demo credentials, capacity, request idempotence, private meeting-point access, creation rules and production isolation. `node apps/web/qa/website-preview.mjs` checks the complete journeys at 1280, 390 and 320px plus reduced motion, and separately checks draft recovery, blocked hosts, browser Back and touch photos. It rejects APIs, remote origins, write requests and browser storage, and checks primary auth contrast at 4.5:1 minimum. Shared map regression remains covered by `qa/play-map-scale.mjs`.

Next owner/tester task: browse without an account, request a game, then create a second plan. The initial usability criterion remains four of five adults completing the selection/request journey without assistance. No such human result is claimed by automated verification.
