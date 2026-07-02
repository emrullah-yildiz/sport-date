# CX-20260701-graceful-exit-no-show-non-punitive-handling

- Status: `verified`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 4 × Confidence 3) / Effort 3 = 16. Important dignity/safety path, but less frequent than the core-loop P0s; sequence after them.
- Customer journey: graceful exit / no-show / recovery
- Surface: `web` (mobile follow-up)
- Environment and viewport/device: all widths
- Found by: Product/growth strategist review (2026-07-01), member-journey analysis for `docs/marketing/feature-roadmap-proposal.md` (a8)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-warm-post-event-positive-vibe-moment`, `CX-20260701-event-room-stays-future-tense-after-event-ends`

## Customer outcome

As a member who had to leave early, felt unsafe, or couldn't attend, I want to exit or record a
no-show without humiliation or punishment, so that I stay in control and the experience never
punishes me for protecting myself.

## What I observed

There is no first-class, non-punitive path for "I left early" or "I didn't attend." Leaving is
supported (`RoomLeaveControl`), but the experience after a graceful exit or a no-show isn't
designed for dignity: no calm acknowledgement, no clear (private) way to note why if the member
chooses, and no reassurance that leaving to stay safe is always acceptable.

## What I expected

A calm, private, non-punitive handling of graceful exit and no-show: the member can leave any time
without a penalty framing; an optional, private reason (never shown to others, never a public
score); a reminder that leaving to stay safe is always fine; and, where safety was the reason, an
easy path to report/block. No public no-show shaming, no punitive counters exposed to others.

## What I expected to avoid (guardrails)

Per experience-principles: rejection/exit must be private and non-punitive; no exposing skip/no-show
counts to others; no attractiveness or reliability score shown publicly. Any host-facing reliability
signal must stay aggregate/private and out of scope here.

## Reproduction

1. As an accepted member, leave an event early (or pass the time without attending).
2. Note the absence of a dignified, non-punitive acknowledgement and optional private reason path.

Reproduction rate: `confirmed; journey gap`

## Customer impact

The safest choice a member can make is sometimes to leave. If leaving feels punitive or shameful,
members will hesitate to protect themselves — a direct safety and dignity harm. Safety-relevant.

## Duplicate check

- Search terms: leave, no-show, graceful exit, cancel, punitive, reliability.
- Tickets reviewed: full queue; leave control exists but no dignified graceful-exit/no-show
  experience is ticketed.
- Why new: designs the post-exit / no-show experience for dignity, distinct from the leave control.

## Acceptance criteria

- [ ] A member can leave early or be a no-show without any punitive framing; leaving to stay safe is explicitly acceptable.
- [ ] An optional, private reason may be recorded; it is never shown to other members and never becomes a public score.
- [ ] Where safety was the reason, report/block/leave are one clear step away and never paywalled.
- [ ] No public no-show/skip counts or reliability scores are exposed to other members.
- [ ] Loading/empty/failure and recovery states are appropriate; the member always has a calm next step.
- [ ] Mobile and web layouts usable; keyboard, screen-reader naming, focus, contrast, 44px covered.
- [ ] No precise location or private safety content is exposed to an unauthorized person.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist (journey analysis); status `ready`.
- 2026-07-02 - Implemented (Builder). Reworked `RoomLeaveControl` from a bare `window.confirm` into a calm,
  non-punitive in-page exit flow: explicit reassurance that leaving any time (including to stay safe) is fine;
  an OPTIONAL, PRIVATE reason + short note that is never shown to the host/peers and never a public score/count
  ("prefer not to say" / no-explanation are first-class defaults); a prominent always-free one-step path to the
  in-room report/block controls when the reason is "I didn't feel safe" (that exit is also marked safety-path so
  it can never count toward reliability); a calm success acknowledgement with a real next step (find another event
  / back to profile) — no dead end; and error/recovery states that keep the member's place intact. No public
  no-show/skip counts or reliability scores exposed. A11y: 44px targets, visible focus, focus moves to confirm
  panel and to the `role=status` acknowledgement, keyboard + SR naming, hover-glow only (reduced-motion safe),
  no overflow at 375/1280. Files: `apps/web/src/components/RoomLeaveControl.tsx`,
  `apps/web/src/app/events/[eventId]/room/page.tsx`, `apps/web/src/app/globals.css` (tokens only; removed a stray
  hardcoded hex; danger/accent hover glows), `apps/web/src/app/api/events/[eventId]/requests/[requestId]/route.ts`
  (+`route.test.ts`), `apps/web/src/lib/join-requests.ts`, `packages/domain/src/graceful-exit.ts` (+test) and
  `index.ts`, migration `apps/web/db/029_join_request_exit_reasons.sql` (additive, nullable `exit_reason`/`exit_note`).
  Tests: new domain graceful-exit suite + route reason-passthrough/malformed-body cases. Checks (apps/web):
  typecheck PASS, lint PASS (0 errors), test PASS (532 web + 170 domain), **production build PASS**. WCAG AA per
  design-refresh-2026 §1 (danger `--danger` on `--bg`, accent-info links). Commit `d922397` (LOCAL ONLY — new
  migration; not pushed). MIGRATION ADDED: `029_join_request_exit_reasons.sql` (deploy-ordering hazard: apply to
  production before/with this code; columns are write-only on the member's own cancel path, never read by a
  broadly-rendered path).
- 2026-07-02 - VERIFIED (Tester, independent, worktree-isolated at clean HEAD incl. d922397; migration 029 applied to prod). All 7 properties hold: (1) leaving always allowed + non-punitive, calm reassurance incl. "leaving to look after yourself is always the right call"; (2) reason+note OPTIONAL & PRIVATE — `normalizeGracefulExit` never rejects (unknown→default, non-string/over-long note→dropped/truncated 280; concrete-value tests), route parses body best-effort in try/catch so malformed JSON still leaves 200 (test asserts); (3) `felt_unsafe` → always-free one-step link to `#room-people` (anchor confirmed) and `viaSafetyPath` short-circuits reliability to false — dedicated test "never counts a safety exit even if late+accepted"; existing reliability rule untouched; (4) `exit_reason`/`exit_note` written ONLY in cancelEventJoinRequest, selected NOWHERE (grep), not in getCurrentUser/layout/landing/middleware — migration 029 additive+nullable+CHECK; no public no-show/skip/score exposed; (5) calm role=status success with two real next steps (find another event / back to profile), error role=alert "your place is still yours" + retry; (6) focus moves to confirm panel + acknowledgement, aria-labelledby/fieldset/legend, 44px, visible focus, role-coloured glow (danger for leave/safety, accent for stay) static box-shadow → reduced-motion safe, no hardcoded hex; (7) tests non-tautological. Checks the Tester ran itself: typecheck PASS, lint PASS, web tests 532 passed/12 skipped, domain 170 passed, prod build PASS. Orchestrator applied `verified` in main tree and archived.
