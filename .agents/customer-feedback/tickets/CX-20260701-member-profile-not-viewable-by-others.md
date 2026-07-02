# CX-20260701-member-profile-not-viewable-by-others

- Status: `in-progress`
- Implementation owner: `experience-build-agent`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 3) / Effort 3 = 16. The rich profile already exists but is self-view only; making it viewable to the right people (safely) is the enabler for both the trust check and peer feedback. P2 medium.
- Customer journey: trust check (deciding whether to meet someone)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 7
- Related tickets: `CX-20260701-profile-lacks-rich-browsable-detail` (verified — the rich profile itself, self-view), `CX-20260701-profile-photo-series-up-to-six` (blocked-owner), `CX-20260701-post-attendance-peer-signal-safe-minimum` (peer feedback needs a profile to attach to)

## Customer outcome

As a member deciding whether to request or accept a place with someone, I want to view the other person's detailed profile within safe boundaries, so that I can do a real trust check before committing to meet — and so any post-event feedback has a profile to attach to.

## What I observed

The rich, humane profile shipped by `CX-20260701-profile-lacks-rich-browsable-detail` is **self-view only**. `/profile` renders the *current* user (`getCurrentUser()` → their own record). There is **no member-to-member profile route** (no `/members/[id]` or equivalent; grep for a public/other-member profile view returns nothing). The only place a member's details appear to someone else is **inline to the host** on the host event page: a requester's first name, age, skill, languages, and bio show inside the join-request card (`events/[eventId]/page.tsx`), and a requester never sees the host's full profile at all. So the detailed profile the product invested in cannot actually be browsed by the person doing the trust check.

## What I expected

A member can open a fellow member's profile within appropriate boundaries — at minimum where a legitimate relationship already exists (a host viewing a requester who applied to their event; an accepted participant viewing co-participants and the host of an event they are in). The view reuses the existing humane profile presentation (intro, sports with skill/frequency, languages, seeking, prompts, and — when unblocked — photos). It must honour every existing privacy rule: approximate location only, no contact details, no precise meeting point, blocks respected in both directions, and no exposure to unauthenticated or unrelated members that would enable scraping/stalking. Exactly *who* may view *whom* is a privacy boundary to confirm with care (see the blocked-owner visibility decision ticket, which this should align with).

## Reproduction

1. As a member, try to open the full profile of a host whose event you're considering, or of a co-participant.
2. Note there is no route or link to view another member's detailed profile; only the host sees requester fields inline.

Reproduction rate: `confirmed via source 2026-07-01 (no member-to-member profile route)`

## Customer impact

The trust check is the safety heart of the product ("who am I about to meet?"). A detailed profile that no one but its owner can see cannot support that check, and blocks the "give feedback to profiles" half of owner criterion 7. Privacy-sensitive: exposing profiles too broadly is itself a safety risk, so the fix is about *bounded* visibility, not a public directory.

## Duplicate check

- Search terms used: "member profile", "view profile", "/members/", "public profile", "other user".
- Tickets reviewed: full queue. The verified profile ticket is about profile *content* (self-view); no ticket makes profiles viewable by others.
- Why this is new: distinct enabler — bounded member-to-member profile visibility, separate from profile content and from the peer-feedback mechanic.

## Acceptance criteria

- [ ] A member can view another member's detailed profile only where a legitimate, defined relationship exists (e.g. host↔requester of the same event; co-participants/host of a shared event); no public or unauthenticated access.
- [ ] The view reuses the existing humane presentation and shows only privacy-safe fields; no contact details, no precise/meeting location, approximate location stays approximate.
- [ ] Blocks are respected in both directions (a blocked member cannot view or be viewed); the viewable set aligns with the visibility decision in the blocked-owner peer-rating ticket.
- [ ] No scraping-friendly enumeration (no guessable public profile index); rate/relationship-gated.
- [ ] Clear empty/partial states for unfilled sections; on-brand at mobile and desktop.
- [ ] Accessibility: focus, screen-reader naming, contrast, 44px targets covered; reduced-motion safe.
- [ ] No attractiveness/score/popularity mechanic introduced by the view.
- [ ] Relevant automated tests (authorization boundaries, block enforcement) and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 7); status `ready`.
- 2026-07-02 - experience-build-agent took ownership; status `in-progress`. Implementing a conservative, relationship-gated member-to-member profile view: a server helper `getViewableMemberProfile(viewerId, targetId)` that returns the privacy-safe profile only when a qualifying relationship exists (host↔requester of one of the host's events; accepted-participant↔host/accepted co-participant of a shared event) AND no block exists in either direction — otherwise null → 404 (never 403, never unauthenticated, no public index). Route `/discover/members/[memberId]` reuses the verified humane presentation (extracted into a shared component) showing only privacy-safe fields (intro, sports, languages, seeking, prompts, block-gated photos) — no contact, no location. Links added from the host join-request cards and the event room people panel.
