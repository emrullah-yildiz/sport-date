# CX-20260701-safety-center-report-tracker-only-no-proactive-guidance-link

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 4) / Effort 2 = 32. Trust surface, but the guidance content already exists and no safety path is broken, so not P1. Never below P1 would apply if a safety action were unreachable — it is not (report/block/leave remain reachable from events/rooms).
- Customer journey: trust check → arrival (before a first meeting) → reflection (after a concern)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths; signed-in member
- Found by: Experience & Design Explorer — safety/trust surface × information & copy
- Implementation owner: `Experience Build Agent (Claude Opus 4.8)`
- Related tickets: `CX-20260701-profile-action-strip-flat-no-hierarchy` (verified — added the profile "Safety, legal & support" strip that links to /safety, /trust, /privacy; that strip does NOT surface /safety-guidelines), `CX-20260701-pre-arrival-safety-micro-brief` (verified — puts a per-event safety brief in the accepted event room; this ticket is the standing, always-available guidance surface, complementary not duplicate), `CX-20260701-in-app-page-headers-off-scale-headline-systemic` (uses /safety only as a typography example, unrelated content)

## Customer outcome

As a cautious adult who opens the in-app **Safety center** — often *before* a first in-person meeting, when I am most anxious and want to know how to keep myself safe — I want the page that is literally called "Safety center" to point me to the product's own "how to meet safely" guidance, so that the safety promise is something I can *act on*, not just a place to file and track complaints after something already went wrong.

## What I observed

The signed-in **Safety center** at `/safety` is a **report tracker only**. Observed live (logged in as a pooled member, 2026-07-01):

- The only links on `/safety` are `href="/discover"` and `href="/profile"` (the nav). There is **no link to `/safety-guidelines`**, `/trust`, or any proactive "how to stay safe" content.
- Its empty state reads: **"No submitted reports — Reporting remains available from an event, request, or authorized event room."** For a member who came here to *learn how to be safe* (not to file a report), this is a dead-end: it tells them where to report, but nothing about how to meet safely.
- The page's only other safety content is the emergency disclaimer card ("This service is not an emergency responder…").

Meanwhile a genuinely good proactive-guidance page **already exists** at `/safety-guidelines` ("Meet through sport, not pressure" — Before the event / During the event / If something feels wrong / What the product does not promise). But in-app it is reachable only from pre-login/legal surfaces (landing, signup step 1, and inside the Privacy controls consent block on /profile) — **not** from the Safety center, and **not** from the profile "Safety, legal & support" strip (that strip lists Safety center, Trust preview, Privacy Notice preview, Share feedback — no Safety guidelines).

Net: the page named "Safety center" is the natural destination for "I want to be safe," yet it is the one safety surface that does **not** connect to the product's safety guidance. The guidance is one hop away but effectively hidden from the anxious pre-meeting moment.

## What I expected

The Safety center should be a hub for *both* halves of safety: acting safely (guidance) and resolving harm (reports). Concretely:

- A clear, calm link/section on `/safety` to the `/safety-guidelines` content — ideally a short "Meeting someone soon? Here's how to keep it safe" pointer near the top, above or beside the case list, not buried.
- The **empty state** (no reports) should be reframed from a dead-end into a helpful starting point: keep "reporting is available from an event/room," but also offer the how-to-meet-safely guidance and the emergency line, so a member who arrives before any incident leaves with something useful.
- The profile "Safety, legal & support" strip should also surface Safety guidelines (currently only reachable via the Privacy consent block), so the guidance has an honest, findable in-app home.

No change to what safety *actions* are reachable (report/block/leave stay exactly as available); this is purely about connecting the guidance to the surface members intuitively open.

## Reproduction

1. Log in as any member and open `/safety` (the "Safety center", linked from the profile "Safety, legal & support" strip).
2. Observe the page links only to /discover and /profile; with no reports, the empty state is "No submitted reports — Reporting remains available from an event, request, or authorized event room."
3. Note there is no link anywhere on this page to `/safety-guidelines` (the "how to meet safely" content), even though that page exists and is linked from the logged-out landing page.

Reproduction rate: `confirmed via live signed-in session + source 2026-07-01 (1/1)`

## Customer impact

Safety is the product's core promise, and the moment a member most needs *guidance* (not a complaint form) is right before a first meeting with a stranger. Sending that member to a page called "Safety center" that only tracks reports — with no path to the excellent guidance that already exists — wastes the product's own best trust asset and can leave an anxious member feeling the "safety center" is only for after things go wrong. This is a trust-surface and journey-completeness gap. It does **not** involve authorization, privacy, or data loss, and no safety *action* is blocked (report/block/leave remain reachable elsewhere), so it is high-value but not a P0/P1 emergency.

## Evidence and limits

- Evidence: live signed-in fetch of `/safety` shows links only to /discover and /profile and no /safety-guidelines/trust reference; `/safety/page.tsx` confirms the empty state copy and the two nav links; `/safety-guidelines/page.tsx` confirms the proactive guidance content exists; profile "Safety, legal & support" strip (profile/page.tsx) lists Safety center/Trust/Privacy/Share feedback but not Safety guidelines.
- Redactions made: none needed (no member data, no report narratives, no precise location involved).
- Facts: /safety is report-tracking only; /safety-guidelines exists and is good; the two are not linked in-app from the safety surface.
- Hypotheses to verify during implementation: whether a short inline guidance summary on /safety is better than a link-out (prefer a calm pointer + link so the center stays scannable); confirm mobile 375px layout of any added guidance block.
- Paths or surfaces not tested: mobile app parity of the safety center.

## Duplicate check

- Search terms used: "safety-guidelines", "safety center", "safety-case-empty", "No submitted reports", "proactive", "meet safely", "guidelines".
- Tickets reviewed: full queue. `CX-20260701-profile-action-strip-flat-no-hierarchy` (verified) built the strip that links to /safety but not the guidelines; `CX-20260701-pre-arrival-safety-micro-brief` (verified) covers a per-event room brief, not the standing Safety center. No ticket addresses the Safety center's missing link to proactive guidance or its dead-end empty state.
- Why this is new: it targets the content/journey gap on the authenticated `/safety` surface (connect guidance to the safety hub + reframe the empty state), distinct from the profile strip's visual hierarchy and from the per-event arrival brief.

## Acceptance criteria

- [ ] The signed-in Safety center (`/safety`) contains a clear, calm link (and ideally a short summary/pointer) to the `/safety-guidelines` proactive guidance, findable without scrolling past the whole case list.
- [ ] The empty state (no submitted reports) is reframed from a dead-end into a helpful starting point: it still notes reporting is available from an event/request/room, and it also offers the how-to-meet-safely guidance and keeps the emergency line — a member who arrives before any incident leaves with something useful.
- [ ] The profile "Safety, legal & support" strip surfaces Safety guidelines (so the guidance is findable without going through the Privacy consent block); label stays accurate (it is member guidance, not a legal preview page).
- [ ] No safety *action* is added, removed, or gated by this change: report, block, and leave remain exactly as reachable as before, and nothing about reporting is placed behind the guidance.
- [ ] Copy stays honest and calm — no new safety claims, no "verified/guaranteed safe" language; guidance is framed as expectations, not a promise of protection (consistent with the existing /safety-guidelines "what the product does not promise" section).
- [ ] Accessibility: any added link/section is keyboard-reachable with visible focus, has an accessible name, ≥44px touch target, on-brand (Ink/Cream/Lime/Sage), and reduced-motion safe.
- [ ] The affected web and mobile (375px) layouts of `/safety` remain usable with no horizontal overflow.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (safety/trust surface × information & copy). Live-observed on a signed-in session: `/safety` links only to /discover + /profile, empty state is report-only, and the existing `/safety-guidelines` guidance is not linked from the safety hub or the profile safety strip. Status `ready`.
- 2026-07-02 - Picked up by Experience Build Agent (Claude Opus 4.8). Status `in-progress`. Note: the IA consolidation has already moved the proactive guidance onto `/safety#guidelines` (progressive-disclosure section on the same page; `/safety-guidelines` now permanent-redirects there), so the fix is to surface that existing on-page section from the top of the safety hub + reframe the empty state to point to it, and add a "Safety guidelines" link to the profile "Safety & support" strip.
- 2026-07-02 - test - **VERIFIED** (independent retest). Source: `safety/page.tsx` now renders, above the case list, a calm `.safety-guidance-pointer` aside ("Meeting someone soon? Here's how to keep it safe") with a `Read how to meet safely` link to `#guidelines` — findable without scrolling past the cases. The no-reports empty state is reframed from a dead-end: keeps report-availability ("from an event, request, or authorized event room") AND the emergency line AND now links to `#guidelines` ("how to meet safely"). The proactive guidance lives on-page in the `#guidelines` `<section>` (Before/During/If-something-feels-wrong/What-the-product-does-not-promise) — reused, not duplicated. `profile/page.tsx` "Safety & support" strip now includes `Safety guidelines` → `/safety#guidelines` (label accurate as member guidance). No safety action added/removed/gated (report/block/leave unchanged); no new safety claims (no "verified/guaranteed safe"). Accessible: link is keyboard-reachable, aria-labelled. Repo checks pass (typecheck/lint/test 442 pass/build). AC all met. Status `implemented` → `verified`.
- 2026-07-02 - Implemented by Experience Build Agent (Claude Opus 4.8). Commit `57969ae`. Files: `apps/web/src/app/safety/page.tsx` (calm top-of-page guidance pointer linking to `#guidelines`; reframed no-reports empty state into a guidance-forward starting point that keeps report-availability + emergency lines and links to "how to meet safely"), `apps/web/src/app/profile/page.tsx` (added "Safety guidelines" → `/safety#guidelines` to the "Safety & support" strip), `apps/web/src/app/globals.css` (calm pointer surface + blue `--accent-info` link, 44px target, visible focus, 375px/1280px responsive, reduced-motion safe — no animation added). Reused existing guidance (no duplication). No safety action added/removed/gated; no new safety claims. No migration. Checks: typecheck pass, lint pass (only pre-existing untouched qa/full-flows.mjs warning), test 439 pass / 12 skip, production `next build` pass. Verified live on localhost:3000 logged in as pooled seeker-D: `/safety` shows the guidance pointer + reframed empty state with two `#guidelines` links; profile strip shows the new Safety guidelines link. Status `implemented` for independent Explorer retest.
