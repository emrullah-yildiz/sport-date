# CX-20260701-owner-decision-payments-processor-and-billing-gate

- Status: `blocked-owner`
- Severity: `high`
- Priority: `P1` — gates any go-live of billing; must not be actioned by an agent (spending money / accepting terms / handling payment data).
- Customer journey: (business/infrastructure — no member surface until decided)
- Surface: `both` (eventual)
- Environment and viewport/device: n/a
- Found by: Product/growth strategist review (2026-07-01), analysis in `docs/marketing/monetization-and-pricing-analysis.md`
- Implementation owner: `owner`
- Related tickets: `CX-20260701-owner-decision-monetization-model-and-pricing` (verified), `CX-20260701-membership-tier-scaffolding-non-billing` (non-billing foundation; must not integrate a live processor)

## Decision needed

Select a payment processor and approve the go-live of billing, VAT handling, and the
EU-compliant subscription cancel/renewal experience. Per `AGENTS.md` / `references/escalation-policy.md`,
spending money, changing billing, accepting platform terms, and handling payment methods are
**owner-gated**. No billing exists and none may be switched on without this decision.

## Recommendation

- **Do not switch on billing until the free core loop is credible in the launch city** (see the
  phased rollout in `docs/marketing/monetization-and-pricing-analysis.md`, Phase 2).
- Build only the **EU-compliant cancel/renewal UX spec** and account scaffolding in the meantime;
  do not integrate a live processor or store payment data until approved.
- Require **one-tap cancel (as easy as subscribe)**, honest renewal reminders, VAT-inclusive EUR
  pricing, and **no dynamic/personalised pricing** — aligning early with the EU Digital Fairness
  Act (expected ~Q4 2026) and current UCPD guidance.
- Keep payment data outside the safety/moderation data boundary and minimise what is stored.

## Two meaningful alternatives

- **A) Native app-store billing (Apple/Google).** Simpler compliance surface but ~15-30% platform
  cut and less control over the cancel UX; note web-first is our primary discovery surface.
- **B) Direct processor (e.g. Stripe) for web + app-store for native.** More control and lower fees
  on web; more integration and VAT/SCA responsibility. (Owner to choose; agent will not create
  accounts or accept terms.)

## Consequence of delay

Plus cannot be charged. This is acceptable and intended until the free loop is proven; it does not
block any free feature work.

## Exact action requested

1. Approve (or defer) building the billing scaffolding + EU-compliant cancel/renewal UX spec (no
   live processor).
2. When ready, select the processor and authorize account creation / terms acceptance (owner
   action — agents will not do this).
3. Confirm counsel review of subscription terms is required before go-live (existing launch gate).

## Acceptance criteria

- [ ] Owner records processor choice (or explicit deferral) and billing go-live gate.
- [ ] EU-compliant cancel/renewal requirements confirmed as binding.
- [ ] Counsel-review-before-go-live confirmed; decision logged in `docs/operations/decision-log.md`.

## Handoff and retest log

- 2026-07-01 - Filed by product/growth strategist with recommendation; status `blocked-owner` (awaiting owner decision and credentials).
- 2026-07-01 - **Owner direction recorded (status intentionally kept `blocked-owner`).** Processor direction = **Stripe** (per alternative B: direct processor for web; app-store billing for native later). This records the chosen *direction* for **design only**. Go-live is NOT unblocked: it still requires owner-provided actions the escalation policy reserves — creating the Stripe account, providing live/test keys, accepting Stripe's platform terms, and signing off real pricing. **No agent may** create the account, add keys, accept terms, or switch on charging. Only **non-secret integration DESIGN** may proceed (EU-compliant cancel/renewal UX spec, VAT handling design, data-boundary design, a keyless integration sketch that reads any future credential from the environment). No live billing until credentials + explicit owner go-live approval + counsel review of subscription terms. Status remains `blocked-owner`.
