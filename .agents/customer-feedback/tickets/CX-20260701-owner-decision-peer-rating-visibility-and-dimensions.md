# CX-20260701-owner-decision-peer-rating-visibility-and-dimensions

- Status: `blocked-owner`
- Severity: `high`
- Priority: `P1` — safety-sensitive product decision that gates how far the peer-feedback feature can go. Blocks only the *visibility* expansion; the safe-minimum private slice can proceed independently.
- Customer journey: trust check / reflection (peer feedback exposure)
- Surface: `web` (and mobile)
- Environment and viewport/device: n/a — product/safety decision
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 7
- Related tickets: `CX-20260701-post-attendance-peer-signal-safe-minimum` (the safe-minimum private slice this decision would later expand), `CX-20260701-member-profile-not-viewable-by-others`, `CX-20260701-repeated-cancellation-no-fair-reliability-rule`

## Decision needed

The owner asked for post-attendance peer feedback on profiles "like Uber drivers" (criterion 7). Uber-style implies **visible ratings**. In a dating/meeting context, *how visible* a peer rating is, and *which dimensions* it measures, is a safety- and dignity-critical decision that the experience principles constrain. This ticket asks the owner to decide the visibility model and dimensions **before** any rating is exposed. The private, safe-minimum capture can ship first (separate ticket) regardless of this decision.

Specifically, decide:

1. **Visibility model** — should any peer signal ever be shown, and if so to whom?
2. **Dimensions** — which reliability/respect dimensions are captured and (if any) shown; confirm the exclusion of attractiveness/desirability/popularity.

## Recommendation

**Recommended: private-by-default, aggregate-only, reliability-framed — never a public per-person score.**

- Keep individual peer feedback **private** (feeds trust/safety internally; corroborates reports; informs moderation). Do **not** show raw per-person ratings to anyone.
- If any signal is surfaced, surface only a **coarse, aggregate, reliability-oriented** cue derived from enough events to be non-identifying (e.g. a private, host-facing "reliable attendee" hint after N completed events), never a star average, never a number on a public profile, never visible to a member deciding whether to date someone.
- **Dimensions limited to reliability & respect** — "showed up", "felt respected", "felt safe". **Exclude entirely** any attractiveness, desirability, "would date again", or popularity dimension. These violate the vision non-goals ("Ranking people by attractiveness or public popularity") and the experience principles, and are unsafe in a dating context (enabling harassment, coercion, and score-chasing).
- Preserve "make rejection private and non-punitive" and "do not expose skip counts": a low signal must never be shown to the person it describes in a way that shames them.

This keeps the honest-trust benefit the owner wants while refusing the harmful "hot-or-not" reading of "like Uber."

## Two meaningful alternatives

- **A — Public reliability badge (opt-in, aggregate).** After N attended events, a member may display a neutral, aggregate "reliable" badge (never a number, never negative, never attractiveness). More visible trust; risk of pressure to perform and of implying a guarantee the product cannot make. Would also need clear copy that it is not a safety certification.
- **B — No peer feedback surfaced at all; capture stays purely internal.** Maximum safety and simplicity; the "feedback to profiles" visible outcome the owner described is not delivered, only its private trust plumbing.

## Consequence of delay

The safe-minimum private slice can proceed and deliver value without this decision. Delay only defers whether/how any signal becomes visible. Building visible ratings *without* this decision risks shipping a mechanic that violates the vision non-goals and is unsafe — so the visibility expansion is intentionally blocked until the owner chooses.

## Exact action requested

Owner: choose the visibility model (recommended private/aggregate-only, or alternative A, or B) and confirm the captured/shown dimensions are limited to reliability & respect with attractiveness/popularity excluded. Record the choice here; the build agent then either expands the safe-minimum slice per the chosen model or leaves it private.

## Duplicate check

- Search terms used: "rating", "peer", "visibility", "score", "popularity", "attractiveness", "Uber".
- Tickets reviewed: full queue. No existing ticket raises the peer-rating visibility/dimensions decision; the reflection tickets forbid public scores but do not decide the exposure question.
- Why this is new: it is the owner-decision escalation for a safety-sensitive exposure choice, distinct from the private capture slice.

## Acceptance criteria (for closing the decision)

- [ ] Owner records a visibility model and the permitted dimensions, with attractiveness/desirability/popularity explicitly excluded.
- [ ] The decision preserves private-by-default individual feedback and the "no public skip/no-show/reliability score shown to the person" principle.
- [ ] Any surfaced signal (if chosen) is defined as aggregate/non-identifying and copy makes clear it is not a safety certification.
- [ ] The safe-minimum private slice ticket is unblocked or explicitly expanded per the chosen model.

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 7) as an owner decision under the escalation policy; status `blocked-owner`.
