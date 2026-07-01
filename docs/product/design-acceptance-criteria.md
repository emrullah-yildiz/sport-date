# Design acceptance criteria (owner standing bar)

Recorded 2026-07-01 from the owner's design-acceptance spec. These seven statements
are the owner's **standing acceptance bar** for the member experience. They are not a
one-off checklist: the experience loop (`.agents/experience-design-explorer.md`) should
keep measuring the live product against them each pass and file `ready` tickets for any
regression or unmet gap, deduping against
`.agents/customer-feedback/tickets/`. They sit alongside — and never override — the
experience principles and the anti-dark-pattern guardrails
(`.agents/skills/run-product-studio/references/experience-principles.md`), the design
system, and the escalation policy.

The owner said "decide details by yourself," so the concrete, member-checkable details
below are this team's interpretation, chosen to honour those principles.

## The seven criteria

1. **The website is easy to use and the steps are easy to understand.** Every core
   journey (sign up, find an event, request a place, host, coordinate, reflect) reads as
   a small number of clearly ordered, self-explanatory steps. Multi-step forms show where
   the member is and what remains. Plain, host-like language throughout; no database or
   internal terminology surfaced to members.
2. **Rare or unexplained terms are explained in place.** Anything a first-time member
   would not immediately understand — most notably the "private beta account / profile"
   label used on the landing, signup, and login surfaces — carries a short, calm
   explanation or tooltip at the point of use, so no one has to guess what they are
   opting into.
3. **Members can search events only after logging in.** Discovery/search is
   authentication-gated; an unauthenticated visitor is redirected to log in rather than
   shown other members' events or locations. (Protects members from scraping and
   pre-acceptance location exposure.)
4. **Members can create, edit, and cancel events after logging in.** Creation, editing,
   and early cancellation are all reachable from an obvious, always-available surface, and
   cancelling safely closes accepted places, room access, and open requests.
5. **Joining and unjoining follow fair, transparent rules — including a proportionate
   response to repeated cancellations.** Members can request a place and cancel at any
   time. Repeated last-minute cancellations or no-shows carry a **fair, transparent,
   private, and recoverable** consequence (e.g. a clear warning before any threshold, a
   proportionate temporary cool-down on *new* joins, and a path to restore standing).
   Counts stay private; there is no public shaming, and the ability to leave to stay safe
   is never penalised. Severity is an owner-tunable.
6. **Event creation is easy.** A host can publish a real, safe event with the least
   friction consistent with clarity: sensibly grouped/stepped fields, good defaults,
   inline help, and a warm confirmation. The private meeting point stays separate from
   discovery by design.
7. **Profiles are detailed, and members can leave post-attendance feedback about people
   they actually met — like Uber drivers.** A profile gives a genuine, humane sense of a
   person (intro, sports with skill/frequency, languages, seeking intent, optional
   prompts, and — pending owner storage decision — photos). After two members have
   attended the **same** event, each may leave a **mutual, private-by-default, abuse-
   resistant reliability & respect signal** about the other. This must **never** be an
   attractiveness/desirability score or a public popularity metric — those violate the
   experience principles and are unsafe in a dating context.

## Current state assessment (2026-07-01)

Evidence is redacted and source-/spot-check-based. "Live" checks used one pooled
synthetic account (logged in once, session reused) against the dev server.

| # | Requirement | Status | Evidence |
|---|-------------|--------|----------|
| 1 | Easy to use / step clarity | **PARTIAL** | Signup is a real stepped flow with an indicator and several `ready`/`verified` clarity tickets. But the **event-creation form is one long single-page form** (`CreateEventForm.tsx`) with no step/progress affordance, and there is no shared "where am I" pattern across multi-field journeys. |
| 2 | Explain rare terms ("private beta") | **MISSING** | "Private beta" / "Create a private beta profile" appears on landing (`landing/page.tsx`), signup metadata, and the login CTA (`LoginForm.tsx` line ~124) with **no explanation anywhere**. Live: `/login` contains the CTA and no adjacent tooltip/definition. No existing ticket covers it. |
| 3 | Search only after login | **SATISFIED** | Live: `GET /discover` unauthenticated → **307 redirect to `/login`**; authenticated → 200. Every discovery route (`discover/page.tsx`, `discover/events/[eventId]/page.tsx`) calls `getCurrentUser()` and `redirect("/login")` when absent. No new ticket. |
| 4 | Create / edit / cancel events | **SATISFIED** | Create verified (`CX-20260701-event-creation-entry-point-not-discoverable`), hosting hub verified (`CX-20260701-no-web-surface-to-manage-hosted-events`); `HostEditEventForm` + `HostCancelEventControl` render on `events/[eventId]/page.tsx`, reachable from `/hosting`; cancel closes places/room/requests (hosting banner + query flag). No new ticket. |
| 5 | Fair join/unjoin + repeated-cancellation rule | **MISSING** | Member cancel (`cancelEventJoinRequest`) just sets status `cancelled` and frees the seat — **no consecutive-cancellation counter, no cool-down, no consequence**. The existing "skip_count/3" logic is **host-side** (host skipping requesters), not member reliability. `no_show` exists only as a *report reason* (`006_safety_moderation.sql`), not a mechanic. The `graceful-exit-no-show` ticket is deliberately anti-punitive and explicitly out-of-scope for a reliability rule. |
| 6 | Easy event creation | **PARTIAL** | Entry point + post-publish success verified. The form itself is usable and well-copywritten but presents **all fields at once** with no step/section progress; a first-time host meets ~18 inputs on one screen. Friction-reduction gap (shares the fix surface with #1). |
| 7a | Detailed profile | **SATISFIED (self-view)** | `CX-20260701-profile-lacks-rich-browsable-detail` **verified** (intro, sports w/ skill+frequency, languages, seeking-as-equals, optional prompts); photos tracked separately (`CX-20260701-profile-photo-series-up-to-six`, `blocked-owner`). Caveat: profiles are currently **self-view only** — there is no member-to-member profile route; a requester's details appear only inline to the host on the event page. |
| 7b | Post-attendance peer feedback ("like Uber") | **MISSING** | `event_reflections` capture **self-reported** attendance + "would join again" feeding a private progress arc (`reflections.ts`, `progress.ts`) — **not** peer feedback. There is no way for one member to leave a signal about another after attending together. No ticket implements it; the reflection tickets are self-reflection and explicitly forbid public scores. |

## What is already covered by the existing queue (do not refile)

- **#3, #4, #6-entry:** satisfied and largely `verified` — see the table.
- **#1 step clarity (signup):** `CX-20260630-signup-redundant-double-headline-weak-focal-point`,
  `CX-20260630-signup-step1-disabled-back-above-primary-action` (verified),
  `CX-20260630-landing-how-it-works-steps-misleading-color-hierarchy`,
  `CX-20260701-heading-subheading-vertical-rhythm-insufficient-spacing`,
  `CX-20260701-empty-states-lack-warmth-and-next-step`.
- **#5 dignity side:** `CX-20260701-graceful-exit-no-show-non-punitive-handling` (dignity of
  leaving; intentionally not a reliability consequence — the new #5 ticket must coordinate
  with, not duplicate, it).
- **#7 profile detail:** `CX-20260701-profile-lacks-rich-browsable-detail` (verified),
  `CX-20260701-profile-photo-series-up-to-six` (blocked-owner),
  `CX-20260701-profile-hero-*`, `CX-20260701-profile-action-strip-*` (verified).
- **#7 reflection (self, not peer):** `CX-20260701-warm-post-event-positive-vibe-moment`,
  `CX-20260701-event-room-stays-future-tense-after-event-ends`,
  `CX-20260701-hosting-past-events-no-reflection-or-outcome` — all self-reflection, guard-
  railed against public scores; the new peer-feedback tickets are distinct.

## New tickets filed from this intake (2026-07-01)

- `CX-20260701-private-beta-term-unexplained-no-tooltip.md` — #2 (P2).
- `CX-20260701-event-create-form-no-step-progress-friction.md` — #1 + #6 (P2).
- `CX-20260701-repeated-cancellation-no-fair-reliability-rule.md` — #5 (P1; owner-tunable severity).
- `CX-20260701-member-profile-not-viewable-by-others.md` — #7 enabler (P2).
- `CX-20260701-post-attendance-peer-signal-safe-minimum.md` — #7 safe minimum private slice (P1).
- `CX-20260701-owner-decision-peer-rating-visibility-and-dimensions.md` — #7 visibility/dimensions
  decision (`blocked-owner`, with recommendation).
