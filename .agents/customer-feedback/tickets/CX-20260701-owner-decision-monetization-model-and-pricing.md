# CX-20260701-owner-decision-monetization-model-and-pricing

- Status: `verified`
- Severity: `high`
- Priority: `P1` — foundational business decision that gates all monetizable work; not member-buildable until decided. DECIDED 2026-07-01 (owner approved the recommended ethical-freemium model + Plus price band).
- Customer journey: (business/strategy — no member surface until decided)
- Surface: `both` (eventual)
- Environment and viewport/device: n/a
- Found by: Product/growth strategist review (2026-07-01), analysis in `docs/marketing/monetization-and-pricing-analysis.md`
- Implementation owner: `owner`
- Related tickets: `CX-20260701-owner-decision-payments-processor-and-billing-gate`, `CX-20260701-profile-photo-series-up-to-six`, `CX-20260701-membership-tier-scaffolding-non-billing` (non-billing foundation that implements this decision)

## Decision needed

Choose the monetization model and the EUR price points for Sport Date. Per
`references/escalation-policy.md`, business model and final pricing are **owner decisions**. No
prices are set in code and no billing exists; this ticket records the recommendation and requests
the decision.

## Recommendation

**Ethical freemium** with two sequenced paid surfaces, keeping all safety and all core
participation free forever:

1. **Sport Date Plus** (personal membership — convenience/richness only, never safety, never paid
   access to people). Recommended EUR band: **€6.99-8.99/mo**, **€49-69/yr** ("~2 months free"),
   optional **€2.99-3.99 short pass**. Anchored to the enthusiast-utility band (Strava ~€8/mo,
   Komoot ~€60/yr), deliberately **below** dating-app premium (€30-50/mo) because we do not sell
   attention.
2. **Host tools** (later phase, only once hosting volume justifies it): prefer a **free host
   baseline** plus an optional **€9-15/mo** recurring-series/organizer tier (anchored to Meetup
   organizer ~$15-20/mo); optional transparent venue-cost pass-through with minimal/zero platform
   cut.

Full rationale, competitor scan, free-vs-paid matrix, risks, and phased rollout are in
`docs/marketing/monetization-and-pricing-analysis.md`.

## Two meaningful alternatives

- **A) Paid-only / higher price (dating-app-style).** Rejected in the analysis: depends on
  attention-scarcity mechanics the vision forbids and would starve marketplace liquidity.
- **B) Free forever + ads/data monetisation.** Rejected: incompatible with the privacy posture and
  the sensitivity of the data; erodes trust.

## Non-negotiable guardrails (regardless of choice)

- Safety (report, block, leave, emergency guidance, approximate-location privacy, Safety Center,
  moderation, appeals) is **never** paywalled or degraded.
- No paid access to people, paid likes, paid visibility boosts, or paid waitlist priority.
- No dark patterns; cancel as easy as subscribe; VAT-inclusive EUR; no dynamic/personalised pricing
  (EU Digital Fairness Act / UCPD exposure). Counsel review before any billing goes live.

## Consequence of delay

Monetizable feature work (Plus filters/photos tiering, host tools) stays unsequenced. This does not
block the free core loop, which should proceed regardless.

## Exact action requested

1. Confirm the model (freemium as recommended, or A/B).
2. Approve or amend the EUR price bands for Plus (and the host-tier direction).
3. Confirm the guardrails above as binding.

## Acceptance criteria

- [x] Owner records the chosen model and EUR price points (or amendments). (Ethical freemium approved; Plus €6.99-8.99/mo, ~€49-69/yr — see 2026-07-01 log.)
- [x] Guardrails confirmed as binding product constraints. (Safety + core participation free forever; no paid access to people; no dark patterns.)
- [x] Decision recorded on this ticket and referenced from the non-billing scaffolding ticket; this ticket updated to reflect it.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist with recommendation; status `blocked-owner` (awaiting owner decision).
- 2026-07-01 - **Owner decision — APPROVED.** Model = **ethical freemium** exactly as recommended in `docs/marketing/monetization-and-pricing-analysis.md`: **safety and core participation are free forever** (report, block, leave, emergency guidance, approximate-location privacy, Safety Center, moderation, appeals; browse/request/attend/host baseline; basic profile + reflection). The paid tier is **"Sport Date Plus"** — **convenience/richness/expression only, never safety and never paid access to people** — at **€6.99-8.99/mo** (annual ~**€49-69/yr**, "~2 months free"), anchored to the enthusiast-utility band and deliberately below dating-app premium. Host tooling stays a later phase with a free host baseline. All guardrails from the analysis confirmed binding (no paid likes/visibility/waitlist priority, no dark patterns, cancel-as-easy-as-subscribe, VAT-inclusive EUR, no dynamic/personalised pricing). Payment go-live remains separately owner-gated (`CX-20260701-owner-decision-payments-processor-and-billing-gate`). The **non-billing foundation** is filed as a `ready` ticket `CX-20260701-membership-tier-scaffolding-non-billing`. Status `blocked-owner` → `verified` (decision made and recorded).
