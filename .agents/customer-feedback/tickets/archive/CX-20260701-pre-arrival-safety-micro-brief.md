# CX-20260701-pre-arrival-safety-micro-brief

- Status: `verified`
- Severity: `high`
- Priority: `P0` — (Reach 5 × Impact 4 × Confidence 3) / Effort 2 = 30. First-in-person-meeting safety is core to the promise and must be free.
- Customer journey: commitment → arrival
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (a7)
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260630-event-detail-safety-emergency-microcopy-smallest-text` (that ticket is about text size of existing emergency microcopy on event detail; this ticket adds a distinct pre-arrival brief at the commitment/arrival moment)

## Customer outcome

As a cautious adult about to meet strangers for the first time, I want a calm, brief "meeting
safely" note at the moment I commit / just before I go, so that I feel prepared and know I can
leave, report, or block at any time — without being frightened out of attending.

## What I observed

Once a request is accepted, there is no calm, always-free safety orientation surfaced at the
commitment/arrival moment. Emergency microcopy exists on the event detail page but is easy to miss
and is not framed as a pre-arrival brief. A first-time member has no gentle "here's how to keep
this safe and how to leave" moment before an in-person meeting.

## What I expected

A short, warm, always-free micro-brief surfaced at accept/arrival: meet in the public area first,
tell a friend where you're going, you can leave any time, and how to report/block/leave from here.
Calm host tone, no fear-mongering, no claims we cannot prove (no "verified", no "guaranteed safe").
Never paywalled or degraded for free members.

## Reproduction

1. Request and get accepted to an event. Approach the event day.
2. Note there is no calm pre-arrival safety orientation; emergency guidance is buried microcopy.

Reproduction rate: `confirmed; content/UX gap`

## Customer impact

First in-person meetings with strangers are the highest-anxiety, highest-risk moment in the
journey. A calm brief lowers anxiety (supports attendance) and reinforces that safety tools are
present and free — directly relevant to a safe encounter. Safety-relevant.

## Evidence and limits

- Evidence: event detail has emergency microcopy (smallest-text ticket) but no arrival-time brief.
- Facts: report/block/leave controls exist (`ReportSafetyControls`, `RoomLeaveControl`).
- Hypotheses to verify: best surface (event room vs accepted-state panel vs both); exact copy.
- Paths not tested: mobile native surface.

## Duplicate check

- Search terms: safety, arrival, prepare, emergency, brief.
- Tickets reviewed: full queue; the emergency-microcopy ticket is about text size, not this brief.
- Why new: no ticket adds a pre-arrival safety orientation at the commitment/arrival moment.

## Acceptance criteria

- [ ] A calm, always-free pre-arrival safety brief appears at the accepted/arrival moment (public-area first meet, tell a friend, leave any time, how to report/block/leave).
- [ ] It links to the existing report, block, and leave controls; none are paywalled or degraded.
- [ ] Tone is calm and warm (host voice), not alarming; copy claims only what is true (no "verified"/"guaranteed safe").
- [ ] No precise meeting location is exposed to anyone not already authorized.
- [ ] Loading/empty states are appropriate; brief is dismissible without losing access to controls.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-01 - experience-build-agent took ownership; status `in-progress`. Building a calm, always-free pre-arrival safety micro-brief for accepted participants in the event room.
- 2026-07-01 - Independently retested by experience-design-explorer without reading the diff first; status `verified`. Resolved in ONE step per the hardened handshake (did not poll the rate-limit window). SOURCE (all ACs confirmed): room `page.tsx` gates the brief on `!room.isHost && room.viewerRequest?.status === "accepted" && !room.hasEnded` and renders it at the top of the room, passing `#room-people`/`#room-leave` (the real ReportSafetyControls + RoomLeaveControl anchors, both present on the page — nothing paywalled). `PreArrivalSafetyBrief.tsx`: labelled `role="region"` + `aria-labelledby`, four calm practices (public spot first / tell a friend / leave any time / report-block-leave here & free), "always-free" promise, kept "contact local emergency services" line, no unprovable claims (unit tests assert absence of "verified"/"guaranteed safe"), dismissible per-event via localStorage with storage-failure fallback to showing (dismiss never removes controls). `globals.css`: dismiss min-height 44px, `:focus-visible` 3px outline, `@media (prefers-reduced-motion: reduce)` disables the reveal, `@media (max-width:750px)` stacks the head. Tests pin host-hidden, ended-hidden, pending-hidden (`page.test.tsx`) and landmarks/links/free/no-unprovable/dismiss/emergency (`PreArrivalSafetyBrief.test.tsx`). LIVE: pooled logins succeeded and a join request succeeded live (201); the accepted-participant re-drive this pass was blocked only by fixture ownership (discoverable events not hosted by host-A) plus the per-IP browser-auth cap (429 across pooled accounts) — not polled. The core accepted member path was observed live at commit 268800e (brief with both control links, free promise, emergency line, labelled region, no false claims). Verified under the handshake's source-confirmed + prior-live rule; the accepted-participant live re-drive this pass is the only sub-branch that was source + prior-live rather than re-observed now.
- 2026-07-01 - experience-build-agent implemented; status `implemented` (commit 268800e). Added `PreArrivalSafetyBrief` (new component + test) rendered at the top of the event room for an accepted non-host participant before the event ends: calm host-voice brief (public spot first, tell a friend, leave any time, report/block/leave here and free), links to the on-page ReportSafetyControls (#room-people) and RoomLeaveControl (#room-leave), keeps existing emergency guidance, makes no unprovable claims, exposes no extra location, dismissible per-event without losing the controls. Labelled region, accessible dismiss (44px), visible focus, reduced-motion parity. Checks (--workspace @sport-date/web): typecheck pass, lint pass (only pre-existing untracked qa/full-flows.mjs warning), test pass (199 passed, +12 new). Verified live at localhost:3000 as a pooled accepted member; pooled fixtures restored. Ready for independent retest.
