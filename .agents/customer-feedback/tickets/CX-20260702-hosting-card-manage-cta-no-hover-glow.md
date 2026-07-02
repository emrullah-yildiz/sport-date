# CX-20260702-hosting-card-manage-cta-no-hover-glow

- Status: `in-progress`
- Severity: `low`
- Priority: `P2` — a primary green CTA on the hosting hub (present on every hosted-event card, N cards for an active host) breaks the owner-mandated "neon glow on every button, always" standard. Visual-consistency polish, not a functional block, so P2; but it is the main action a host clicks to manage each event, so it is seen constantly.
- Customer journey: Host — manage hosted events
- Surface: `web` — `apps/web/src/app/hosting/page.tsx` (footer `<Link>`), styled by `.hosting-card footer a` in `apps/web/src/app/globals.css`
- Environment and viewport/device: all widths, pointer devices (observed 1280 and 375)
- Found by: user-sim (experience loop), 2026-07-02
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260702-button-hover-inconsistent-no-neon-glow` (archived/verified — the systematic glow-token pass; this selector was a coverage gap missed by it, same pattern as its noted `.discovery-empty a` follow-up)

## Customer outcome

As a host managing my events, when I hover the "Manage, edit or cancel →" button on any event card on /hosting, I want the same neon-green glow that every other primary CTA in Rally shows, so the interface feels coherent and the button clearly reads as the interactive action.

## What I observed

On /hosting each event card ends with a green pill link labelled "Manage, edit or cancel →" (or "Review this event" for past events). It is styled as a button (green `--lime` background, 44px min-height, rounded, bold) but hovering it produces **no change at all**: measured `box-shadow` stays `none`, no transform, no border change (rest === hover). The element carries `transition: all` in its computed style — signalling an intended hover effect — yet no `:hover` rule exists for it. Every other primary CTA (e.g. the "Cancel this event" destructive button on the host event page, which correctly glows red `rgba(255,110,104,0.55)` on hover) has a glow. Reproduced on both 1280 and 375; the card link has an empty className and is targeted only by the descendant rule `.hosting-card footer a`. Observed 2026-07-02.

## What I expected

The pill glows neon green (`--glow-accent`) on hover like every other primary/positive CTA, per the owner directive that button hover always shows a neon-light effect. The past-event variant ("Review this event", transparent with border) should also gain a hover glow (green, or a subtler treatment consistent with its lower-emphasis role).

## Reproduction

1. Log in as a host with at least one hosted event.
2. Open /hosting.
3. Hover the "Manage, edit or cancel →" pill on any event card with a mouse.
4. Observe: no glow / no visible hover affordance.

Reproduction rate: `2/2 safe attempts` (1280 and 375)

## Customer impact

Cosmetic/consistency: the hub's primary action feels slightly dead and off-system compared with the rest of Rally's anthracite+neon language. No functional, safety, privacy, or data impact. Accessibility is unaffected (focus-visible ring is present and correct — measured `outline: rgb(59,234,126) solid 3px` on focus), so this is purely the missing hover glow.

## Evidence and limits

- Evidence: live computed-style probe — `.hosting-card footer a` box-shadow `none` at rest and on hover (no change); CSS rule at globals.css line ~774 has no `:hover`; contrast/focus ring intact.
- Redactions made: none needed (no PII; event titles are synthetic QA data).
- Facts: element is `<Link href="/events/{id}">` in hosting/page.tsx footer, className empty, styled by `.hosting-card footer a`; `transition: all` present but no hover rule.
- Hypotheses to verify during implementation: adding `.hosting-card footer a:hover { box-shadow: var(--glow-accent); }` (and a suitable hover for `.hosting-card.past footer a`) resolves it; check reduced-motion keeps the glow and drops only any lift; confirm no 375/1280 overflow introduced (box-shadow only).
- Paths or surfaces not tested: the past-event ("Review this event") variant hover was not directly measured (only the upcoming variant), but it shares the same base rule with no `:hover`.

## Duplicate check

- Search terms used: "glow", "hover", "hosting", "manage" across active + archive tickets; grep for "Manage, edit or cancel" in source.
- Tickets reviewed: active CX-2026070x set; archive `CX-20260702-button-hover-inconsistent-no-neon-glow` (its enumerated selector list does NOT include `.hosting-card footer a`), `CX-20260702-join-request-cancel-buttons-no-hover-glow`, `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring`.
- Why this is new: the global glow-token pass explicitly enumerated ~29 selectors and noted a later follow-up for a missed `.discovery-empty a` gap; `.hosting-card footer a` is another such gap it did not cover, so this is a distinct, un-filed coverage miss rather than a refile of the resolved global ticket.

## Acceptance criteria

- [ ] Hovering the "Manage, edit or cancel →" CTA on a /hosting event card shows the neon-green glow (`--glow-accent`), matching other primary CTAs.
- [ ] The past-event "Review this event" variant also shows an appropriate hover glow consistent with its role.
- [ ] Glow uses existing tokens (no new hardcoded hex); no layout shift or 375/1280 overflow (box-shadow only).
- [ ] Glow persists under `prefers-reduced-motion` (only any lift/translate is dropped); disabled/skeleton states show no glow.
- [ ] Existing `:focus-visible` ring on the card link is unchanged; AA unaffected.
- [ ] Relevant automated tests and repository checks pass incl. production build.

## Handoff and retest log

- 2026-07-02 - Filed by user-sim (experience loop); status `ready`.
- 2026-07-02 - Picked up by experience-build-agent; status `in-progress`.
