# CX-20260701-event-creation-entry-point-not-discoverable

- Status: `verified`
- Severity: `medium`
- Priority: `P2 medium` — (Reach 5 × Impact 4 × Confidence 4) / Effort 2 = 40. The core "create" action works but members can't find it.
- Customer journey: intent / hosting
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Owner (direct feedback 2026-07-01, "I cannot publish an event"); publish flow re-tested live and found functional
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-no-web-surface-to-manage-hosted-events`

## Customer outcome

As a member who wants to organise a game, I want an obvious, always-available way to create an event so that I can host without hunting for the entry point.

## What I observed

The owner reported being unable to publish an event. Live testing shows publishing **works end to end** (`/events/new` → `POST /api/events` → 201 → event page, persisted). The real problem is discoverability: the only link to `/events/new` is one item inside a row of six profile links ("Host a new event"); there is no persistent global navigation and no prominent host call-to-action on `/discover` or the landing experience. There is also no confirmation/share moment after publishing that reinforces success.

## What I expected

A clear, persistent "Host an event" affordance available from primary surfaces (discover, profile, global nav), and after publishing, a calm confirmation that the event is live with a link to view/manage and share it.

## Reproduction

1. As a new member, try to find how to create an event without prior knowledge of `/events/new`.
2. Note how many steps / how much scanning it takes.

Reproduction rate: `owner-reported; entry-point audit confirmed`

## Customer impact

A core product action (hosting) is effectively hidden, so members conclude the feature is missing — exactly what happened here. No safety/privacy/auth dimension.

## Evidence and limits

- Evidence: live test — publish returns 201 and persists; the sole entry is one profile link.
- Facts: `apps/web/src/app/profile/page.tsx` is the only place linking `/events/new`; no shared nav.
- Hypotheses to verify: best placement that doesn't clutter; whether a global nav is in scope or a per-surface CTA is enough.

## Duplicate check

- Search terms: host, create event, new event, publish, nav.
- Tickets reviewed: full queue.
- Why this is new: no ticket addresses event-creation discoverability.

## Acceptance criteria

- [x] A member can start hosting from at least the discover and profile surfaces via an obvious, labelled affordance (≤1 click, visible without scrolling on common widths). *(verified 2026-07-01, both surfaces, 1280 + 375)*
- [x] After publishing, the member sees a clear success state with links to view, manage, and (optionally) share the event. *(verified: aria-live "It's live" block, view/manage/copy-share)*
- [x] Affordance is on-brand, keyboard-reachable, screen-reader-named, 44px target, reduced-motion safe. *(verified: lime #c9f458, 49–59px, aria-label, focus outline, reduced-motion parity)*
- [x] No misleading copy; describes only what hosting actually does. *(verified: precise venue only in host/accepted panel, never in success block or public invitation)*
- [x] Repository checks pass. *(build agent: typecheck/lint/test 156 pass/12 skip)*

## Handoff and retest log

- 2026-07-01 - Filed from owner feedback (publish works but undiscoverable); status `ready`.
- 2026-07-01 - experience-build-agent picked up; status `in-progress`. Plan: promote a labelled "Host an event" primary affordance on /discover and /profile (above the fold, lime primary), and add a post-publish success state on the host event page linking to view / manage (/hosting) / share the public invitation.
- 2026-07-01 - experience-build-agent implemented (commit d99f885); status `implemented`. Added lime "Host an event" CTA to /discover nav and /profile action row (44px, aria-labelled, keyboard-reachable, reduced-motion safe — no animation). Publishing now lands on `/events/{id}?published=1` and shows an aria-live "It's live" success state with view (public invitation) / manage (/hosting) / copy-share actions; share + view links point at `/discover/events/{id}` so the precise meeting point is never exposed. New ShareEventLink (clipboard + graceful fallback) and pure resolveHostEventView helper with unit tests. Checks: typecheck pass, lint pass (only pre-existing warning in untracked qa/full-flows.mjs), test 156 pass / 12 skipped. Ready for independent retest on /discover, /profile, and the publish→success flow.
- 2026-07-01 - Independently retested by experience-design-explorer from the member scenario (fresh synthetic adult, headless Chromium, 36 automated checks, 0 fail) WITHOUT reading the implementer's diff first. Results: (discover@1280 + @375, profile@1280 + @375) the lime #c9f458 "Host an event" CTA is visible above the fold (discover y=19/1280, y=56/375; profile y=395/1280, y=585/812@375), aria-labelled "Host an event — create a new game", ≥44px (49–59px), keyboard-focusable with a visible focus outline; on /profile it is the FIRST action in the primary-action row. Publish flow: publishing lands on /events/{id}?published=1 and renders a role="status" (aria-live) "IT'S LIVE / Your event is published." success block linking to View the public invitation (/discover/events/{id}), Manage your events (/hosting), and a Copy invitation link share action. Privacy: the precise venue/address (redacted test venue) appears only in the host-only "ACCEPTED PEOPLE SEE" panel — it is absent from the success block AND from the public invitation at /discover/events/{id} (approximate area only). Reduced-motion (prefers-reduced-motion: reduce): CTA still visible, no motion required. No horizontal overflow at 375px on either surface; no uncaught page errors. Every acceptance criterion passes on every affected surface → status `verified`. (Temp retest script run from apps/web/qa then removed; untracked full-flows.mjs untouched.)
