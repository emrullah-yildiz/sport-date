# CX-20260706-group-event-payment-links — Payment links on group events

**Priority:** P2 (revenue synergy — owner idea 2026-07-06) · **Status:** blocked-owner
(needs Stripe, arriving ~week of 2026-07-13) · **Owner-gate:** money/payments = yes

## Owner's idea (verbatim intent)
"They create group events with payment links included" — hosts attach a payment
link to an event so the group can split real costs (court rental, equipment,
entry fees).

## Why it matters
First genuinely monetizable workflow that isn't a subscription: KeepItUp
facilitates the money that already changes hands around amateur sports. Fits
the income target; natural Stripe use-case (Payment Links / Checkout).

## Scope sketch (to be specced when Stripe lands)
- Host adds an optional cost per event ("€4/person for the court") + a payment
  link (Stripe Payment Link v1; platform-fee model later).
- Shown to accepted participants only; NEVER a condition for safety features;
  joining stays free — this is cost-splitting, not ticketing (ticketing =
  consumer-law/VAT review first).
- Hard rules: no pay-to-join gating of the free core loop; refunds/disputes
  story before launch; counsel note on payment-facilitation obligations.

## Marketing note
Explicitly EXCLUDED from social posts until shipped (only-implemented-features
rule). The 2026-07-06 "what you can do with KeepItUp" post ships without it.
