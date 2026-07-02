# CX-20260702-room-safety-options-summary-no-focus-ring-or-hover

- Status: `verified`
- Severity: `high`
- Priority: `P1` — (Reach 3 × Impact 4 × Confidence 5) / Effort 1 = 60 → P1. Per policy, an accessibility regression is never below P1, and this is on a **safety** control (the Report/Block disclosure inside the meeting room), so it stays P1 rather than being bucketed down like the non-safety discover-filter focus gap. One-line CSS fix, very high confidence. Components: `apps/web/src/app/globals.css` (`.safety-controls summary`), used by `apps/web/src/components/ReportSafetyControls.tsx`.
- Customer journey: coordinate & arrive (accepted-participant meeting room) → report/block a member
- Surface: `web` — shared `apps/web/src/app/globals.css`; control rendered by `ReportSafetyControls.tsx` on the event room and public event-detail pages
- Environment and viewport/device: all widths; keyboard / non-pointer users; observed live at 1280 on the running dev server
- Found by: User-simulator experience loop (2026-07-02), accepted-participant meeting-room + chat pass, logged in as a pooled accepted member (seeker-B) with a real accepted place on a host-A event, real Chromium `reducedMotion: reduce`
- Implementation owner: `unassigned`
- Related tickets: `CX-20260702-discover-filter-submit-no-focus-visible-ring` (implemented — same *class* of gap, a classless/bare interactive element falling through to the UA-default near-black 1px outline, but on a different, non-safety discovery control; that fix was scoped to `.discover-filters button` only), `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified — systemic hover-glow pass; it did not add a `:hover` affordance or a `:focus-visible` ring to the `.safety-controls summary` disclosure), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring` (verified — same category on a different control)

## Customer outcome

As an accepted participant in an event room who may need to report or block another member, when I Tab to the "Safety options for {member}" disclosure I want a clearly visible focus indicator (the neon focus ring the rest of Rally uses) and a hover affordance, so I can confidently find and open the report/block controls under stress — instead of the control appearing to receive no focus at all.

## What I observed

On the accepted-participant event room (`/events/{id}/room`), the entry point to the safety controls is a `<summary>Safety options for {name}</summary>` inside `<details class="safety-controls">` (`ReportSafetyControls.tsx:43-44`). This summary is the disclosure that reveals the **Block** quick-action and the full **Report** form (category select + details textarea + "also block" checkbox).

- Live keyboard focus on the summary measured `outline: rgb(16, 16, 16) auto 1px` with `box-shadow: none`. The `--warn`/coral summary sits on a coral-tinted dark panel (`.safety-controls` background `rgba(255,110,104,.08)`) over the anthracite `--bg`; a 1px near-black UA outline against that dark surface is roughly **1.1:1** — effectively invisible, far below the WCAG 1.4.11 non-text minimum of 3:1.
- The summary also has **no `:hover` affordance** at all (measured `box-shadow: none` at rest and on hover; no color, underline, or glow change) — unlike every other interactive control in the room (the "Leave this event" button shows the coral role glow on hover + a green focus ring; "Back to the event" shows the blue info-nav glow + a green focus ring; the chat "Send message" button shows the green glow + focus ring).
- In `globals.css` the rule `.safety-controls summary { cursor: pointer; color: var(--warn); font-size: 15px; font-weight: 900; min-height: 44px; ... }` (around line 860) has **neither** a `:hover` **nor** a `:focus-visible` companion rule, and no global `summary:focus-visible` / `button:focus-visible` safety-net catches it (the room's `:focus-visible` rules are class-scoped to `.room-leave-*`, `.room-people-empty a`, and `.room-chat` controls).

Observed 2026-07-02; reproduced live at 1280 and confirmed in source. Not a harness artifact — the gap is in the app's own `globals.css`.

## What I expected

Tabbing to "Safety options for {member}" should show the same crisp `3px solid var(--focus)` neon focus ring the rest of Rally uses (clearly visible against the coral-tinted dark panel), and hovering it should give a visible affordance consistent with the app — so a keyboard or switch user can reliably see and reach the report/block controls, which matters most in exactly the moment someone needs them.

## Reproduction

1. Log in as a member with an accepted place in an event and open that event room (`/events/{id}/room`).
2. Using only the keyboard, Tab through the room until focus reaches the "Safety options for {member}" disclosure (rendered near the participant / "who has a place" area).
3. Observe the focus indicator: only a faint ~1px near-black UA outline appears — no neon ring, no glow. On the dark coral-tinted panel it is effectively invisible. Hovering with the mouse also produces no visible change.

Reproduction rate: `confirmed (live + source)` — live keyboard focus measured `{ outline: "rgb(16,16,16) auto 1px", boxShadow: "none" }`; hover `boxShadow: "none"`; `.safety-controls summary` has no `:hover` or `:focus-visible` rule in `globals.css` and no global fallback.

## Customer impact

Accessibility (WCAG 2.4.7 Focus Visible and 1.4.11 Non-text Contrast) on a **safety** control. A keyboard or switch user coordinating an in-person meeting cannot reliably see that the report/block disclosure is focused, so under pressure they may struggle to locate or confidently activate the control that lets them report or block another participant. The controls are reachable (tab order works, `<details>` toggles on Enter/Space) and the journey is not fully blocked, so this is a visible-focus/affordance defect rather than a keyboard trap — but because it gates the room's report/block safety controls, it is held at P1. No authorization, privacy, precise-location, or data-loss dimension (the summary itself reveals no sensitive data until opened).

## Evidence and limits

- Evidence: live keyboard focus on `.safety-controls summary` measured `{ outline: "rgb(16,16,16) auto 1px", boxShadow: "none" }`; rest/hover `boxShadow: "none"`; summary `color: rgb(255,110,104)` (`--warn`) on panel background `rgba(255,110,104,.08)` over `--bg` `rgb(32,38,43)`; source: `globals.css` `.safety-controls summary` styled around line 860 with no `:hover`/`:focus-visible` companion; `ReportSafetyControls.tsx:43-44` renders `<details class="safety-controls"><summary>`. For contrast, sibling room controls in the same pass measured correct role glow + `outline: 3px solid rgb(59,234,126)` focus rings (`.room-leave-open`, `.primary-nav-link` back link, `.room-chat` Send button).
- Redactions made: participant/host display name shown as `{member}`; no report content submitted (disclosure inspected, not used to file a report); no precise location captured.
- Facts: the summary has neither a hover affordance nor a visible focus ring; the UA default outline is near-black on the dark coral-tinted panel.
- Hypotheses to verify during implementation: adding `.safety-controls summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; border-radius: 8px; }` and a restrained `.safety-controls summary:hover { color: <lighter warn or add underline> }` (or a subtle box-shadow) resolves both with no layout shift; consider whether a durable global `summary:focus-visible` / bare-`button`/`a` `:focus-visible` safety-net would prevent future classless controls from regressing (the discover-filter ticket flagged the same durability gap).
- Paths or surfaces not tested: the identical `<details class="safety-controls"><summary>` also appears on the public event-detail page and host request rows — the same focus/hover gap almost certainly applies there (source is shared); not separately keyboard-probed this pass.

## Duplicate check

- Search terms used: `safety-controls`, `summary`, `focus-visible`, `focus ring`, `hover`, `Safety options`, `report`, `block`, `room`, `glow`.
- Tickets reviewed: all active `CX-*` and all archived `CX-*`. Closest are `CX-20260702-discover-filter-submit-no-focus-visible-ring` (a bare `<button>` on `/discover` — different surface, non-safety, its fix scoped only to `.discover-filters button`), `CX-20260702-button-hover-inconsistent-no-neon-glow` (verified systemic hover pass that did not touch `.safety-controls summary`), `CX-20260702-share-invitation-button-no-hover-glow-or-focus-ring` (verified; different control), `CX-20260702-event-room-chat-for-accepted-participants` (archived feature ticket for the chat itself, no focus/hover scope).
- Why this is new: no ticket covers the missing `:hover` affordance **and** `:focus-visible` ring on the `.safety-controls summary` disclosure — the report/block entry point inside the meeting room. It is a distinct control from the discover filter submit button and, unlike that one, gates safety functionality.

## Acceptance criteria

- [ ] Tabbing to "Safety options for {member}" in the event room shows a clearly visible neon focus ring consistent with the rest of Rally (`outline: 3px solid var(--focus)` with an offset), clearly visible against the coral-tinted dark `.safety-controls` panel.
- [ ] The focus indicator meets WCAG 1.4.11 (≥3:1 against the adjacent panel background) and 2.4.7 (focus is visible) for keyboard / `:focus-visible`.
- [ ] Hovering the summary shows a visible, on-brand affordance (e.g. a subtle glow, color lift, or underline) consistent with the app's other interactive controls; the coral/`--warn` safety role colour is preserved and not swapped for the green primary role.
- [ ] The fix is token-based (`var(--focus)`), introduces no layout shift or overflow at 375 and 1280 (outline/offset only), and the `<details>` still opens/closes on Enter/Space and pointer as before.
- [ ] The same fix (or a shared rule) covers the identical `.safety-controls summary` wherever it renders (event room, public event detail, host request rows) so the safety disclosure is consistently focusable everywhere.
- [ ] Reduced-motion behaviour is unaffected (no new motion required to see focus/hover).
- [ ] Relevant automated tests and repository checks pass (typecheck, lint, web tests, production build).

## Handoff and retest log

- 2026-07-02 - Filed by the User-simulator experience loop during the accepted-participant meeting-room + chat pass (accepted member seeker-B on a real host-A event, live + source-confirmed). Status `ready`.
- 2026-07-02 - Implemented (build agent). Selector `.safety-controls summary` in `apps/web/src/app/globals.css`. Added `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` (the standard Rally neon ring, clearly visible on the coral-tinted dark panel, WCAG 2.4.7/1.4.11), plus a calm on-brand hover `:hover { color: #ff8a85; box-shadow: var(--glow-danger) }` matching the room's other --warn/danger-role controls (coral role preserved, not swapped to green); added `border-radius: 8px` to the summary so ring/glow follow rounded corners with no layout shift (outline/offset only, verified at 375 & 1280). `<details>` disclosure behavior unchanged; no new motion so reduced-motion unaffected. Shared global rule covers every render site (event room, public event detail, host request rows). Checks (apps/web): typecheck pass, lint 0 errors (2 pre-existing warnings in unrelated files), 570 unit tests pass, production build pass. Commit `8dcf81c`, pushed to origin/main. Status `implemented` — handed back for independent retest.
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. 8dcf81c). `.safety-controls summary:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` — #3BEA7E ring clearly visible on the coral-tinted dark panel (WCAG 2.4.7/1.4.11 fixed; base had no ring, UA default ~1.1:1); border-radius:8px so ring follows corners. `:hover { color:#ff8a85; box-shadow: var(--glow-danger) }` = calm coral danger affordance matching the room's other --warn controls (not green, not alarming). ReportSafetyControls.tsx markup unchanged (details/summary disclosure intact); outline/offset/radius only → no reflow 375/1280; no new motion. Shared rule covers all 4 render sites (room host + participants, host request rows, discover event detail). Checks the Tester ran: typecheck PASS, lint 0 errors, test 570 passed/12 skipped, prod build PASS. Minor note (non-blocking): the hover text #ff8a85 is a hardcoded lighter-coral tint (vs --warn #FF6E68) — ideally a --warn-family token, but acceptable as a hover-only tint; the systemic global-focus-visible fallback (49c9605) also now backstops this control's focus ring. Orchestrator archived.
