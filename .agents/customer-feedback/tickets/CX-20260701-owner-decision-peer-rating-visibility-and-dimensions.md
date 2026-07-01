# CX-20260701-owner-decision-peer-rating-visibility-and-dimensions

- Status: `verified`
- Severity: `high`
- Priority: `P1` — safety-sensitive product decision that gates how far the peer-feedback feature can go. DECIDED 2026-07-01: owner chose a 1-5 star overall rating, recipient-visible, implemented per the safety-bounded design below. Only the recipient-visible slice is in scope; showing ratings to OTHER members / on public profiles remains out of scope and needs a separate explicit owner sign-off.
- Customer journey: trust check / reflection (peer feedback exposure)
- Surface: `web` (and mobile)
- Environment and viewport/device: n/a — product/safety decision
- Found by: Experience & Design Explorer — owner design-acceptance intake (2026-07-01), criterion 7
- Related tickets: `CX-20260701-post-attendance-peer-signal-safe-minimum` (verified — the safe-minimum private slice this decision expands), `CX-20260701-peer-star-rating-recipient-visible-safe` (ready — implements this decision), `CX-20260701-member-profile-not-viewable-by-others`, `CX-20260701-repeated-cancellation-no-fair-reliability-rule`

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

- [x] Owner records a visibility model and the permitted dimensions, with attractiveness/desirability/popularity explicitly excluded. (1-5 star, meetup-experience only, recipient-visible.)
- [x] The decision preserves the "no per-giver rating shown to the person, no revenge-rating can define someone" principle. (Double-blind reveal; aggregate average only at ≥3; never "who gave what".)
- [x] Any surfaced signal is defined as aggregate/non-identifying and copy makes clear it is not a safety certification. (Recipient sees own aggregate average only; ratings never gate safety.)
- [x] The safe-minimum private slice ticket is explicitly expanded per the chosen model via `CX-20260701-peer-star-rating-recipient-visible-safe`.
- [x] The higher-risk other-member/public-profile exposure is explicitly held out of scope pending a separate owner sign-off.

## Owner decision (2026-07-01) — DECIDED, with safety-bounded design

The owner chose to **show a 1-5 star rating, with the rating visible to the RECIPIENT** (the person receiving it). The owner accepted a **safe version** of this outcome, which is the exact design that is in scope and must be implemented:

1. **Dimension.** A **1-5 star OVERALL** rating anchored to the **MEETUP EXPERIENCE** — reliability, respect, and how the shared activity went — **explicitly NOT attractiveness / desirability / looks / "would date again"**. Copy must frame it as being about the experience, not the person's appeal.
2. **Gating.** Co-attendance-gated, **one per (event, from, to)**, mutual — reuse the existing gates from the safe-minimum slice (ended event + both attended + block-freedom + self-guard).
3. **Double-blind reveal.** A member does **not** see the rating they received for an event until they have **submitted their own** for that event **OR a reveal window passes** — to blunt retaliation and quid-pro-quo.
4. **Recipient sees only an AGGREGATE AVERAGE of their OWN received ratings, and only once there are ≥3 ratings.** Below the threshold, a calm "not enough ratings yet" state. Never show who gave which rating. This prevents a single revenge rating from defining someone.
5. **Safety and reporting.** A "report an unfair/abusive rating" path exists. Ratings **never** gate safety / leave / report. Counts and aggregate are **NEVER** shown to other members or on public profiles in this slice.

**Out of scope / still owner-gated:** showing ratings (aggregate, average, count, or badge) to **OTHER members** or on **public/browsable profiles** is a **higher-risk step that is NOT in scope** here and requires a **separate, explicit owner sign-off** before any such exposure is designed or built. This decision authorises recipient-visible only.

The build ticket is `CX-20260701-peer-star-rating-recipient-visible-safe` (P1, `ready`).

## Handoff and retest log

- 2026-07-01 - Filed by Experience & Design Explorer (owner design-acceptance intake, criterion 7) as an owner decision under the escalation policy; status `blocked-owner`.
- 2026-07-01 - **Owner decision — DECIDED.** Owner chose a **1-5 star overall rating visible to the recipient**, implemented per the safety-bounded design recorded above (meetup-experience dimension only — not attractiveness; double-blind reveal; recipient sees an aggregate average only at ≥3 ratings; report-abuse path; ratings never gate safety; nothing shown to other members or public profiles in this slice). The remaining higher-risk step — showing ratings to OTHER members / on profiles — is explicitly **out of scope and needs a separate owner sign-off**. Build ticket `CX-20260701-peer-star-rating-recipient-visible-safe` (P1) filed `ready`. Status `blocked-owner` → `verified`.
