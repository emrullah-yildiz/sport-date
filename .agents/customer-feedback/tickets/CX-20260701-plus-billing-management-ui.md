# CX-20260701-plus-billing-management-ui

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 4) / Effort 3 = 16. The honest member-facing surface for Plus; depends on the entitlement + Stripe tickets. Not on the critical build path until those land, but required before any go-live.
- Customer journey: intent → commitment (upgrade); coordination (manage / cancel / renewal)
- Surface: `web` (mobile parity later)
- Environment and viewport/device: all widths
- Found by: Owner launch decision (2026-07-01); `docs/marketing/monetization-and-pricing-analysis.md` §0
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-plus-tier-entitlement-model-and-gating` (P1 — reads `isPlus(user)` to decide upgrade-vs-manage), `CX-20260701-stripe-subscription-integration-test-mode` (P1 — starts Checkout / opens the Billing Portal), `CX-20260701-owner-decision-payments-processor-and-billing-gate` (blocked-owner — cancel-easy is a binding EU requirement recorded there), `CX-20260701-plus-perks-advanced-discovery-filters` (P2 — the perks this surface honestly describes)

## Customer outcome

As a member, I want a calm, honest place to understand what Sport Date Plus offers, subscribe if I choose, and — just as easily — manage or cancel it, so that I never feel pressured, tricked, or trapped, and I always know exactly what I am (or am not) paying for.

## What I observed

There is no Plus surface at all. With the launch decision made (Plus €6.99/mo, built now in Stripe test mode behind `BILLING_ENABLED`), members need an honest upgrade + manage/cancel surface — one that is entirely hidden when the flag/keys are absent (dev/CI and pre-go-live prod), so nothing ever implies a member can pay when billing is dormant.

## What I expected (scope — HONEST UI, HIDDEN WHEN DORMANT)

1. **A calm Plus surface** (e.g. a `/plus` page or a profile/settings section) that honestly describes the **allowed** perks — advanced discovery filters (distance/schedule/languages), richer profile customization + a few extra personality prompts, your own meet/reflection history, a supporter badge, early access to non-safety features — and states plainly that **safety and core participation are free forever** and that photos are capped at 6 for everyone. Price shown VAT-inclusive in EUR (€6.99/mo; annual shown honestly, not as a disguised default). Copy follows the experience-principles copy test: thoughtful-host tone, no hype, no "find your perfect match", no manipulative urgency, no fake scarcity, no countdowns.
2. **Upgrade action** → starts the Stripe Checkout Session (from the Stripe ticket). In test mode this uses Stripe test cards only.
3. **Manage / cancel** for a Plus member → opens the **Stripe Billing Portal** (Stripe-hosted) so the member can update payment method, see renewal, and **cancel as easily as they subscribed** (one obvious path, no guilt loop, no "are you sure" dark pattern) — satisfying the EU Digital Fairness Act / UCPD cancel-easy requirement.
4. **Fully hidden when dormant.** When `BILLING_ENABLED` is off or the Stripe keys are absent (dev/CI/pre-go-live), the upgrade/manage UI is **not shown** (or shows only a calm, honest "coming soon" with no pay action). Nothing implies a member is or can become a paying subscriber, and nothing claims a member is subscribed when they are not.
5. **Entitlement-driven state.** Uses `isPlus(user)` to choose: free member → honest upgrade invitation; Plus member → "you're a supporter" + manage/cancel. Never guilt-trips a canceller; a lapsed member returns cleanly to a fully usable free product.

Explicitly **out of scope:** the Stripe SDK wiring itself (sibling P1), the actual perks (sibling P2), and any owner go-live action.

## Reproduction

1. Look for any Plus / upgrade / billing surface in the app. None exists.

Reproduction rate: `confirmed; feature absent (2026-07-01)`

## Customer impact

An honest, easy-to-cancel surface is the difference between ethical monetization and a dark pattern (and an EU-DFA liability). Hidden-when-dormant prevents any premature or misleading payment affordance before go-live.

## Duplicate check

- Search terms used: `plus`, `upgrade`, `subscribe`, `billing`, `manage`, `cancel`, `portal`.
- Tickets reviewed: full `CX-20260701-*` queue. The entitlement ticket owns state, the Stripe ticket owns the SDK/routes; this ticket owns the member-facing surface only. No overlap. New.

## Acceptance criteria

- [ ] A calm, honest Plus surface describes only the **allowed** perks and states that **safety + core participation are free forever** and photos are capped at 6 for everyone. Price is VAT-inclusive EUR (€6.99/mo); annual shown honestly, not as a disguised default.
- [ ] A free member can start the upgrade (Stripe Checkout, subscription mode, €6.99 price); a Plus member can open the **Stripe Billing Portal** to manage payment/renewal and **cancel as easily as they subscribed** — one obvious path, **no guilt loop, no dark pattern, no manipulative urgency**.
- [ ] The upgrade/manage UI is **entirely hidden (or a calm keyless "coming soon" with no pay action)** whenever `BILLING_ENABLED` is off or the Stripe keys are absent; **nothing implies the member is or can become a paying subscriber while billing is dormant, and nothing claims a member is subscribed when they are not.**
- [ ] State is driven by `isPlus(user)`; a lapsed/cancelled member returns cleanly to a fully usable free product with no broken half-Plus state and no guilt-trip.
- [ ] **Forbidden-perks guardrail:** the surface never advertises or sells paid boosts/likes/priority visibility, paid access to people, "who rated/skipped/viewed you", extra photos, or any attractiveness/popularity mechanic.
- [ ] Copy passes the experience-principles copy test (thoughtful-host tone, provable claims only, no hype, no urgency/scarcity).
- [ ] Accessibility: keyboard operable, screen-reader naming, visible focus, contrast, 44px touch targets, reduced-motion safe; on-brand; loading/empty/failure/retry states for the checkout/portal round-trips are calm and understandable.
- [ ] No secret is committed; the surface reads configured-state only via the server (never exposes keys to the client).
- [ ] Relevant automated tests and repository checks pass, including a test that the surface is hidden / pay-action-free when billing is dormant.

## Handoff and retest log

- 2026-07-01 - Filed as the honest Plus upgrade + manage/cancel surface for the €6.99 launch (`docs/marketing/monetization-and-pricing-analysis.md` §0). Cancel-as-easy-as-subscribe via Stripe Billing Portal (EU DFA/UCPD). Depends on the entitlement (P1) and Stripe (P1) tickets. Status `ready`.
