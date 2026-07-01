# CX-20260701-membership-tier-scaffolding-non-billing

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 3 × Impact 3 × Confidence 4) / Effort 3 = 12. Non-urgent foundation that makes the owner-approved freemium model *possible and honest* later; free-loop work stays ahead of it. No member-visible charging.
- Customer journey: (foundation — spans profile, discovery, and future Plus surfaces; no charging surface)
- Surface: `web` (mobile parity where surfaced)
- Environment and viewport/device: all widths
- Found by: Follow-up to owner monetization decision (2026-07-01)
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-owner-decision-monetization-model-and-pricing` (verified — the approved model this implements), `CX-20260701-owner-decision-payments-processor-and-billing-gate` (blocked-owner — billing go-live; this ticket must NOT integrate a live processor), `CX-20260701-profile-photo-series-up-to-six` (extended photo series is a candidate Plus capability)

## Customer outcome

As a free member, I want everything I need to find, request, attend safely, and reflect on an event to work fully and forever without paying, so that I never feel that safety or basic participation is held behind a wall — while the product honestly prepares an optional "Sport Date Plus" for convenience/richness later, without ever charging me or pretending I am subscribed when I am not.

## What I observed

There is no concept of a membership tier anywhere in the product. The owner has approved (2026-07-01) an **ethical-freemium** model with a future **Sport Date Plus** tier (convenience/richness only) — but no data model represents "free vs Plus", there is no server-side capability check to gate Plus-only conveniences, and there is nowhere honest to show a "Plus" affordance. Building any Plus feature (e.g. extended photo series, advanced discovery filters) without this foundation would either scatter ad-hoc checks or, worse, imply charging exists.

## What I expected (scope — NON-BILLING FOUNDATION ONLY)

Build **only** the non-billing foundation that lets Plus exist honestly later:

1. **Tier concept in the data model.** A simple membership-tier representation (e.g. `free` | `plus`) attached to a member, defaulting every existing and new member to **`free`**. No billing tables, no payment data, no subscription/renewal records, no price stored as a charge. If a `plus` value is ever set in this slice it is for internal/dev/testing wiring only and never as the result of a real payment.
2. **A server-side feature-gating helper.** A single capability-check helper (e.g. `canUse(member, capability)` / `hasPlus(member)`) that all Plus-gated conveniences call **on the server**. It must **fail closed** (default to free/least-privilege) and be the one place tier logic lives, so no feature re-implements gating.
3. **Honest "Plus" affordance placeholders.** Where a Plus-only convenience would live, show a calm, honest placeholder that describes the *convenience* on offer and that it is a future Plus feature — **without** displaying a final price, without a "subscribe"/"buy"/"upgrade & pay" action, and without implying the member is or could right now become a paying subscriber. Copy must not claim a member is subscribed.
4. **Safety and core participation are NEVER gated.** The gating helper must not be wired to any safety capability (report, block, leave, emergency guidance, approximate-location privacy, Safety Center, moderation, appeals) or to core participation (browse/discover, request a place, cancel, attend, host baseline, basic profile, reflection). These are free forever; a regression guard should assert they are never behind the Plus gate.

Explicitly **out of scope:** any payment/billing, any charge, any stored or displayed final price, any processor integration, any secret/credential, any renewal/cancellation billing flow, and any exposure that reads as "you are subscribed". Those live behind `CX-20260701-owner-decision-payments-processor-and-billing-gate` (still `blocked-owner`).

## Reproduction

1. Look for any representation of a membership tier or a Plus capability check in the data model / server code. There is none.

Reproduction rate: `confirmed; feature absent (2026-07-01)`

## Customer impact

Without an honest foundation, later Plus work risks either sprawling ad-hoc gates or accidentally implying paid access exists. Built right, free members keep a fully usable, fully safe product and the future Plus tier is a clean, honest addition — no dark patterns, no paywalled safety.

## Duplicate check

- Search terms used: "tier", "plus", "membership", "subscription", "billing", "premium", "gate", "capability", "canUse".
- Tickets reviewed: full `CX-20260701-*` queue. The monetization decision and payments-gate tickets are owner *decisions*, not build tickets; no existing ticket builds a tier data model or a gating helper. This is new and non-duplicative.
- Why this is new: it is the first build ticket implementing the non-billing half of the approved freemium model.

## Acceptance criteria

- [ ] The free tier is **fully usable**, including **all** safety features and all core participation; nothing a free member needs is gated.
- [ ] A membership-tier concept exists in the data model, defaulting all members to `free`; no billing/subscription/payment tables or data are introduced.
- [ ] A single server-side feature-gating helper exists, fails closed (defaults to free/least-privilege), and is the one place Plus capability checks live.
- [ ] The gating helper is covered by tests (free denied Plus-only conveniences; Plus allowed; safety/core capabilities never routed through the gate; fail-closed on unknown/missing tier).
- [ ] "Plus" affordance placeholders are honest: they describe the convenience and that it is a future Plus feature, show **no** final price and **no** charge/subscribe action, and **nothing claims a member is subscribed**.
- [ ] No billing, no payment integration, no processor, no secret/credential, and no charge is added anywhere.
- [ ] Safety features are **never** gated; a regression guard asserts safety + core-participation capabilities are not behind the Plus gate.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed as the non-billing foundation for the owner-approved ethical-freemium model (`CX-20260701-owner-decision-monetization-model-and-pricing`, verified). Cross-linked to the payments gate (`blocked-owner`) which this ticket must not touch. Status `ready`.
