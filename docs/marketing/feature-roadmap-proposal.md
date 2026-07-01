# Feature roadmap proposal

Status: **proposal**. Prepared 2026-07-01. Companion to
`monetization-and-pricing-analysis.md`.

A prioritized, RICE-scored backlog of new features, ease-of-use improvements, and "positive-vibe"
touches, reasoned from the member journey (discovery → intent → trust check → commitment →
coordination → arrival → activity → graceful exit → reflection; plus rejection, no-show,
cancellation, report, block, emergency, recovery — per `experience-principles.md`).

Split into three tracks:
- **(a) Trust/safety & core-loop** — must be excellent and free.
- **(b) Delight & positive-vibe / ease-of-use** — warmth and clarity.
- **(c) Monetizable premium / host** — richness and leverage (never safety/access).

## Scoring

**RICE = (Reach × Impact × Confidence) / Effort**, matching the ticket convention already used in
`.agents/customer-feedback/tickets/`.
- Reach 1-5 (share of members touched in the launch loop).
- Impact 1-5 (effect on a safe, worthwhile encounter — our north-star, not engagement).
- Confidence 1-5 (evidence strength).
- Effort 1-5 (build cost; higher = more).
- Priority mapping: **P0 ≥ 30, P1 20-29, P2 10-19, P3 < 10** (consistent with existing tickets).

Ordering within a track is by RICE. The highest-value **buildable** items are also filed as `ready`
tickets; the largest owner-gated ones are noted as such.

---

## (a) Trust/safety & core-loop

| # | Feature | R | I | C | E | RICE | Prio | Journey |
|---|---|---|---|---|---|---|---|---|
| a1 | **Join-request confirmation + status clarity** — after requesting a place, a calm confirmation and a live "requested / accepted / declined" status without a hard reload. | 5 | 5 | 4 | 2 | 50 | P0 | commitment |
| a2 | **Meeting-point spatial cue (approximate, safe)** — a visibly-approximate area cue (labelled radius / neighbourhood) so members can judge travel before requesting, without exposing the precise point. | 5 | 4 | 4 | 2 | 40 | P0 | trust check → arrival |
| a3 | **Reset/verify recovery path** — a direct, self-serve recovery when a verify/reset link is dead or expired, so a member is never stranded outside their account. | 4 | 5 | 4 | 2 | 40 | P0 | recovery |
| a4 | **Rate-limited-login recovery guidance** — when auth is throttled, explain what happened and exactly what to do next (wait time, reset option), never a dead end. | 4 | 4 | 4 | 2 | 32 | P0 | recovery |
| a5 | **Host-side pending-request visibility** — hosts reliably see and act on pending join requests from the hosting hub (no missed requests → no dead events). | 4 | 5 | 4 | 3 | 27 | P1 | coordination |
| a6 | **Event-room lifecycle correctness** — room stops reading future-tense after the event ends; graceful transition to reflection; loading state instead of blank during fetch. | 4 | 4 | 4 | 2 | 32 | P0 | activity → reflection |
| a7 | **Pre-arrival safety micro-brief** — a calm, always-free "meeting a stranger safely" note surfaced at commitment/arrival (tell a friend, public first meet, leave anytime), no fear-mongering. | 5 | 4 | 3 | 2 | 30 | P0 | arrival |
| a8 | **No-show / graceful-exit reflection paths** — first-class, non-punitive handling when someone leaves early or doesn't arrive, feeding honest reflection without public shaming. | 4 | 4 | 3 | 3 | 16 | P2 | graceful exit |

Rationale: this track *is* the free core loop the whole monetization plan depends on. a1-a4 and a6
map to already-observed member breakages in the ticket queue; they earn the right to charge later
by making the free product trustworthy.

---

## (b) Delight & positive-vibe / ease-of-use

| # | Feature | R | I | C | E | RICE | Prio | Journey |
|---|---|---|---|---|---|---|---|---|
| b1 | **Scannable discover cards** — fix inverted hierarchy so sport, time, area, level, and open seats are instantly scannable; calm, warm, not a feed. | 5 | 4 | 4 | 2 | 40 | P0 | discovery |
| b2 | **Obvious, persistent "Host an event" affordance** *(shipped; keep as reference)* — always-available create entry + post-publish success. | 5 | 4 | 4 | 2 | 40 | P0 | intent |
| b3 | **Warm arrival & post-event "positive vibe" moments** — human, host-toned confirmation and a light, optional "glad you moved together" reflection nudge (never a streak, never pressure). | 5 | 4 | 3 | 2 | 30 | P0 | arrival → reflection |
| b4 | **First-event preparation card** — what to bring, where to meet, what to expect, how to leave — reduces first-timer anxiety (positioning: "having something real to do together"). | 5 | 4 | 3 | 3 | 20 | P1 | commitment → arrival |
| b5 | **Feedback that welcomes ideas, not just bugs** — reframe feedback entry from "something's broken" to invite ideas; give a forward path after submit instead of a dead end. | 3 | 3 | 4 | 1 | 36 | P0 | reflection |
| b6 | **Empty-state warmth across discover/hosting/profile** — calm, specific, encouraging empty states (not error-flavoured) that tell a member what to do next. | 5 | 3 | 4 | 2 | 30 | P0 | discovery |
| b7 | **Vertical rhythm & heading/subheading spacing polish** — consistent, breathable typographic spacing so surfaces feel intentional and trustworthy. | 4 | 2 | 4 | 1 | 32 | P0 | all |
| b8 | **Profile action-strip hierarchy** — clear primary/secondary hierarchy in the profile action row (host/discover primary; safety/legal quiet). | 3 | 3 | 4 | 2 | 18 | P2 | trust check |

Rationale: "positive vibe" for Sport Date is *calm clarity and warmth*, not gamification. Each item
makes the product feel like a thoughtful host (copy test) and reduces first-timer friction, which
directly supports safe completion and repeat participation.

---

## (c) Monetizable premium / host

> Per the monetization analysis, these are **convenience/richness (member)** and **coordination
> leverage (host)** — never safety, never paid access to people. Sequenced *after* the free loop is
> credible; several depend on owner-gated decisions (photos storage, billing).

| # | Feature | R | I | C | E | RICE | Prio | Tier |
|---|---|---|---|---|---|---|---|---|
| c1 | **Richer browsable profile (humane detail)** *(shipped; foundation for photos + Plus)* | 5 | 4 | 3 | 4 | 15 | P2 | Free base |
| c2 | **Profile photo series (up to ~6)** — recognition/trust at the meeting point; base photos free, extended series a Plus candidate. | 5 | 5 | 4 | 4 | 25 | P1 | Free base + Plus *(owner-gated: storage/moderation)* |
| c3 | **Advanced discovery filters** — pace/level bands, time-of-day, "hosts I've safely met before" — relevance convenience. Never a compatibility/attractiveness score. | 4 | 3 | 3 | 3 | 12 | P2 | Plus |
| c4 | **Travel / passport** — browse another city's events before a trip. | 3 | 3 | 3 | 2 | 13 | P2 | Plus |
| c5 | **Recurring-series & multi-event host tools** — templates, co-hosts, a real multi-event dashboard for reliable hosts. | 3 | 4 | 3 | 4 | 9 | P3 | Host |
| c6 | **Aggregate host reliability insight** — no-show/attendance patterns in aggregate to help hosts plan. Never a per-member public score. | 3 | 3 | 3 | 3 | 9 | P3 | Host |
| c7 | **Transparent venue-cost pass-through** — help a host collect a real court/lane fee, shown in full before requesting; minimal/zero platform cut. | 3 | 3 | 2 | 4 | 5 | P3 | Host pass-through *(owner-gated: payments)* |

Rationale: these are the *earned* monetization surfaces. Note c2 (photos) is high-value but
**blocked on an owner storage/moderation decision** (existing ticket
`CX-20260701-profile-photo-series-up-to-six`); the rest wait behind the free-loop and billing gates.

---

## Sequencing summary

1. **First (free, buildable now):** the P0 core-loop and vibe items — a1-a4, a6, a7, b1, b3, b5,
   b6, b7. These are the "earn the right to charge" work.
2. **Next (free, higher effort):** a5, a8, b4, b8.
3. **Then (monetizable, after free loop + owner gates):** c2 (photos, owner-gated), c3, c4, then
   host tools c5-c7.

The highest-value **buildable** items are filed as `ready` tickets (`CX-20260701-*`). Monetization
and pricing **decisions** are filed as `blocked-owner` tickets.
