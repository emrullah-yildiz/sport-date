# CX-20260701-profile-action-strip-flat-no-hierarchy

- Status: `in-progress`
- Severity: `low`
- Priority: `P2 medium` — (Reach 5 × Impact 3 × Confidence 4) / Effort 2 = 30. Every signed-in member meets this strip immediately after the hero; it is the profile's main wayfinding and currently offers no focal point.
- Customer journey: navigation / wayfinding (post-signup, every visit)
- Surface: `web`
- Environment and viewport/device: dev server localhost:3000, observed at 1280px and 390px
- Found by: Experience & Design Explorer (profile × visual-hierarchy pass, 2026-07-01)
- Implementation owner: `Experience Build Agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-event-creation-entry-point-not-discoverable` (host CTA prominence — overlapping strip, different outcome), `CX-20260701-profile-lacks-rich-browsable-detail` (profile content richness), `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing` (hero spacing)

## Customer outcome

As a member landing on my profile, I want the actions grouped so that primary things I actually do (find a game, host, see my events) stand out from occasional preview/legal/utility links, and my eye lands on the main path immediately.

## What I observed

Directly under the hero, `/profile` renders a single flat row (`.profile-primary-action`) of **seven pills of near-equal weight**: "Discover events", "Your events", "Host a new event", "Safety center", "Trust preview", "Privacy Notice preview", "Share feedback". Only the first pill is lime; the other six are identical ink pills, so:

- Frequent, high-intent member actions (Discover, Your events, Host) are visually indistinguishable from low-frequency preview/legal/utility destinations (Trust **preview**, Privacy Notice **preview**, Share feedback).
- There is no grouping, label, or tier — the row is one undivided wall, so the eye has nowhere obvious to land and must read all seven labels linearly.
- On mobile (390px) the same seven pills stack into a tall ladder, pushing the actual profile content ("About", "Connection", "Your movement") far below the fold behind a column of undifferentiated buttons.
- Two of the seven are explicitly labelled "preview" (pre-launch legal/trust pages), giving them the same prominence as core actions and slightly cluttering the primary decision.

This is a visual-hierarchy / information-architecture gap: the strip works functionally (all links resolve), but it presents no priority. It is distinct from the host-CTA-discoverability ticket (which asks for a prominent Host affordance across surfaces) — here the outcome is *grouping and tiering the whole strip so any single primary action is findable*, independent of whether Host also gets its own CTA elsewhere.

## What I expected

A tiered, grouped set of actions: a small number of primary member actions given visual priority (e.g. Discover / Your events / Host), with secondary or preview/legal/utility links (Trust preview, Privacy Notice preview, Share feedback, Safety center) grouped and de-emphasised (smaller, quieter, or under a labelled subgroup). One clear focal point; less visual competition from pre-launch preview links.

## What I expected to avoid (guardrails)

No dark patterns: do not hide safety or privacy access to declutter — Safety center and the Privacy/Trust previews must remain reachable and clearly labelled, just visually tiered below the primary actions. No manufactured urgency or engagement bait. Only real, implemented destinations; keep "preview" labelling honest for pre-launch pages.

## Reproduction

1. Sign in as any member and open `/profile`.
2. Observe the row directly below the hero: seven pills, six visually identical, only the first coloured.
3. Try to locate the single most important action at a glance; note that all seven read at the same weight.
4. Repeat at 390px and note the tall undifferentiated stack pushing content below the fold.

Reproduction rate: `2/2 safe attempts (1280px + 390px), same build`

## Customer impact

Weak wayfinding on the member's home surface: the eye cannot settle, and preview/legal links compete with the core loop (discover → host → manage). Emotionally it reads as an admin index rather than a warm home base. No authorization, privacy, safety, or data-loss dimension — Safety/Privacy links remain reachable; this is scannability and perceived quality only.

## Evidence and limits

- Evidence: live DOM/computed-style probe — `.profile-primary-action` contains 7 `<a>`; backgrounds measured `rgb(201,244,88)` (lime) for the first and `rgb(23,36,29)` (ink) for the other six; widths 186–281px, all in one wrapping flex row. Full-page screenshots at 1280px and 390px captured to scratchpad (not committed).
- Redactions made: synthetic member email/initials excluded from the ticket; screenshots kept out of Git.
- Facts: markup in `apps/web/src/app/profile/page.tsx:40`; styling `.profile-primary-action` in `apps/web/src/app/globals.css:500`.
- Hypotheses to verify during implementation: the right split between primary and secondary/preview links; whether a labelled subgroup or a "more" grouping is cleaner than a single flat row; interaction with the separate host-CTA ticket so the two don't fight over the same row.
- Paths or surfaces not tested: keyboard-only tab order and screen-reader grouping semantics of the strip (should be checked during implementation).

## Duplicate check

- Search terms used: primary-action, nav, pill, Discover events, Trust preview, Privacy Notice, grouping, action wall.
- Tickets reviewed: full queue, especially `event-creation-entry-point-not-discoverable`, `profile-lacks-rich-browsable-detail`, `heading-subheading-vertical-rhythm-insufficient-spacing`, `no-web-surface-to-manage-hosted-events`.
- Why this is new: the host-CTA ticket asks to make *hosting* prominent across surfaces; the rich-profile ticket is about profile *content*; the spacing ticket is about heading→sub-text rhythm. None addresses tiering/grouping the seven-pill action strip so a primary action is findable and preview/legal links are de-emphasised. Linked the related tickets above.

## Acceptance criteria

- [ ] The profile action area presents a clear visual tier: a small set of primary member actions is given priority, with secondary/preview/legal/utility links grouped and visually de-emphasised.
- [ ] A member can identify the primary action(s) at a glance without reading all seven labels linearly.
- [ ] Safety center and the Privacy/Trust preview links remain reachable and clearly labelled (not hidden); "preview" labelling stays accurate for pre-launch pages.
- [ ] Layout remains on-brand (Ink/Cream/Lime/Coral/Sage), with lime reserved for the positive/primary action, not applied decoratively to competing links.
- [ ] At 390px the primary action(s) are reachable without a long scroll past a wall of equal-weight pills; profile content is not pushed unreasonably below the fold.
- [ ] Keyboard tab order is logical, focus is visible, links are screen-reader-named, and touch targets stay ≥44px; reduced-motion parity preserved.
- [ ] Repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed from profile × visual-hierarchy exploration; status `ready`.
- 2026-07-01 - Experience Build Agent picked up; status `in-progress`. Plan: tier the strip into a primary member-action group (Host lime / Discover / Your events) and a labelled, de-emphasised secondary group (Safety center, Trust preview, Privacy Notice preview, Share feedback) — all links reachable, aria-named, ≥44px, reduced-motion safe, no overflow at 1280/375px.
