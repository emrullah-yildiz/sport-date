# CX-20260701-peer-star-rating-recipient-visible-safe

- Status: `implemented`
- Severity: `high`
- Priority: `P1` — (Reach 4 × Impact 5 × Confidence 3) / Effort 4 = 15. Held at P1: this delivers the visible half of owner criterion 7 ("feedback to profiles, like Uber") that the owner explicitly decided, but it is safety-sensitive and must ship exactly to the safety-bounded design below.
- Customer journey: activity → reflection → trust (after a shared event)
- Surface: `web` (mobile parity)
- Environment and viewport/device: dev server localhost:3000, all widths
- Found by: Owner decision (2026-07-01) on `CX-20260701-owner-decision-peer-rating-visibility-and-dimensions`
- Implementation owner: `experience-build-agent`
- Related tickets: `CX-20260701-owner-decision-peer-rating-visibility-and-dimensions` (verified — the decision + safety-bounded design this implements), `CX-20260701-post-attendance-peer-signal-safe-minimum` (verified — the existing peer-feedback feature this extends: migration `022_peer_feedback.sql`, `packages/domain/src/peer-feedback.ts`, `apps/web/src/lib/peer-feedback.ts`, `apps/web/src/components/PeerFeedbackPanel.tsx`), `CX-20260701-member-profile-not-viewable-by-others`, `CX-20260701-repeated-cancellation-no-fair-reliability-rule`

## Customer outcome

As a member who attended an event with someone, I want to leave a 1-5 star rating about **how the shared meetup experience went** — reliability, respect, how the activity went — and to be able to see the **average** of the ratings I have received once enough people have rated me, so that honest, earned trust builds over time — **without** it ever becoming an attractiveness score, a public popularity metric, or a tool for retaliation.

## What I observed

The safe-minimum peer-feedback slice (verified) captures private yes/no reliability & respect confirmations but deliberately has **no star rating and no recipient-visible signal** — visibility was escalated to the owner. The owner has now decided (2026-07-01): show a **1-5 star overall** rating, **visible to the recipient** as an aggregate average, implemented per a specific safety-bounded design. This ticket extends the existing feature to deliver that decision. Showing ratings to **other members / on public profiles** is explicitly **out of scope** and needs a separate owner sign-off.

## What I expected (safety-bounded design — implement exactly)

Extend the existing peer-feedback feature (migration `022`, `peer-feedback.ts` domain + lib, `PeerFeedbackPanel`) with:

1. **A 1-5 star OVERALL rating dimension anchored to the MEETUP EXPERIENCE** — reliability, respect, and how the shared activity went — **explicitly NOT attractiveness / desirability / looks / "would date again"**. Copy must frame the stars as being about the experience of meeting up, not about the person's appeal. This dimension is added alongside (not replacing) the existing private reliability/respect confirmations.
2. **Same eligibility gates as the safe minimum:** co-attendance-gated (ended event + both were participants/host of that event), **one per (event, from, to)**, mutual, block-aware, self-guarded. Reuse the existing gates in `lib/peer-feedback.ts`; do not invent a parallel path.
3. **DOUBLE-BLIND reveal.** A member does **not** see the rating they received for a given event until they have **submitted their own rating for that event OR a reveal window has passed** — to blunt retaliation and quid-pro-quo. Enforced server-side.
4. **Recipient sees their OWN received ratings as an AGGREGATE AVERAGE only, and only once there are ≥3 ratings.** Below 3, show a calm "not enough ratings yet" state (never a partial number that could out a single rater). **Never** show who gave which rating, and never show individual received stars.
5. **Report an unfair/abusive rating.** A clear path to report a rating as unfair/abusive, routing to the existing moderation queue. Ratings **never** gate the ability to stay safe, leave, block, or report — those paths are always available regardless of any rating.
6. **No other-member / public exposure in this slice.** The aggregate average, individual ratings, and any count are **never** shown to other members, on discovery, on a member-to-member profile, or on any public profile. That expansion is out of scope and owner-gated separately.

This honours the experience principles: it is an experience-quality trust signal, recipient-scoped and abuse-resistant, explicitly **not** an attractiveness/desirability score or public popularity metric.

## Reproduction

1. Attend (or pass the end time of) an event with another member.
2. Note there is currently no star rating and no way to see an average of ratings you have received — only the private yes/no confirmations exist.

Reproduction rate: `confirmed via source 2026-07-01 (no star rating exists; visibility just decided)`

## Customer impact

Earned, experience-based trust is the product's honest alternative to profile-performance dating. Delivered per this design it reinforces reliability and respect and gives a member a calm sense of how their meetups land, while the double-blind reveal, ≥3 threshold, recipient-only scope, and report path prevent the well-known harms (retaliation, revenge ratings, "hot-or-not", public shaming). Done wrong it would be actively unsafe; hence the strict bounds. Safety-relevant.

## Duplicate check

- Search terms used: "star", "rating", "aggregate", "average", "double-blind", "reveal", "recipient", "peer", "visibility".
- Tickets reviewed: full queue. The safe-minimum slice (verified) is private-only with no stars; the visibility decision ticket (now verified) authorises this. No existing ticket implements the star dimension, double-blind reveal, or recipient-visible aggregate.
- Why this is new: it implements the specific owner-decided recipient-visible star design as an extension of the existing feature; distinct from the private capture slice and from the (still owner-gated) other-member exposure.

## Acceptance criteria

- [ ] The rating is a **1-5 star OVERALL meetup-experience** dimension (reliability/respect/how the activity went); copy makes clear it is **not** attractiveness/desirability/looks; no attractiveness/desirability/"would date again" dimension exists anywhere.
- [ ] Eligibility reuses the existing gates: co-attendance + ended event, one per (event, from, to), mutual, block-aware, self-guarded; a non-co-attendee cannot rate.
- [ ] **Double-blind enforced server-side:** a member cannot see a rating received for an event until they have submitted theirs for that event OR the reveal window has passed.
- [ ] **≥3 threshold before any aggregate shows:** below 3 ratings the recipient sees a calm "not enough ratings yet" state; at ≥3 they see an **aggregate average** of their own received ratings; individual ratings and who-gave-what are never shown.
- [ ] **Recipient-visible only:** the aggregate/average/count is shown only to the recipient — never to other members, on discovery, on member-to-member profiles, or on any public profile in this slice.
- [ ] A **report unfair/abusive rating** path is present and routes to moderation; ratings never gate safety/leave/block/report.
- [ ] Accessibility: the star input is **keyboard-operable, labelled, and not color-only** (e.g. accessible names for each star value, focus states, a non-color indication of the selected value); reduced-motion safe; 44px targets; on-brand calm copy.
- [ ] Privacy: the aggregate is not exported in a way that reveals raters; a giver's **given** ratings are exportable; **received** ratings are handled per the anti-retaliation posture (do not export received in a way that could identify raters); account deletion cascades these records.
- [ ] Abuse-resistance: rate-limited, one-per-pair-per-event, edit-window-then-lock consistent with the existing slice; a single revenge rating cannot define someone (guaranteed by the ≥3 threshold + double-blind).
- [ ] Tests cover: the co-attendance gate, the ≥3 aggregate threshold, the double-blind reveal rule, and the no-public/other-member exposure invariant; repository checks pass.

## Handoff and retest log

- 2026-07-01 - `experience-build-agent` took ownership; status `ready` → `in-progress` to implement the recipient-visible star extension.
- 2026-07-01 - `experience-build-agent` implemented (commit `55ffbac`, status `in-progress` → `implemented`). Added an optional 1-5 star meetup-EXPERIENCE dimension (reliability/respect/how it went — explicitly not looks/desirability; domain now accepts the single `experienceStars` key and still rejects attractiveness/desirability/popularity/bare rating keys). Migration 023 adds a nullable CHECK-bounded `experience_stars` column, preserving all 022 invariants. Double-blind reveal enforced server-side (`getReceivedRatingAggregate`: a received star counts only after the recipient rated back for that event or a 14-day window passes). Recipient sees only an aggregate AVERAGE on their own /profile, gated at ≥3 (calm "not enough ratings yet" below), never who-gave-what, never to other members/discovery/public. Report-unfair-rating routes to existing Report/Block moderation; ratings never gate safety/leave/block/report. Accessible star input (native radiogroup, labelled, 44px, non-colour-only, focus-visible, reduced-motion safe, on brand). Given ratings exportable; received/aggregate not exported. Checks: typecheck pass, lint clean (only pre-existing warning in untracked qa/full-flows.mjs), web tests 229 pass/12 skipped, domain tests 105 pass, migration applied + idempotent. Sanity-checked recipient aggregate + export with one pooled login (two-attendee double-blind sequence is rate-limited — covered by unit tests + source). Ready for independent retest.
- 2026-07-01 - Filed to implement the owner decision (`CX-20260701-owner-decision-peer-rating-visibility-and-dimensions`, verified): recipient-visible 1-5 star meetup-experience rating with double-blind reveal, ≥3-threshold aggregate average, report-abuse path, and no other-member/public exposure. Extends the verified safe-minimum peer-feedback feature. Status `ready`.
