# Monetization go-live runbook — Sport Date Plus (Stripe)

The exact, ordered steps to turn on **real** billing for **Sport Date Plus** (€6.99/month; annual
~€59–69/yr, configurable). This is the "path to the first euro".

The **code** for Plus billing is built now, in **Stripe TEST mode, behind a `BILLING_ENABLED`
feature flag**, and **fails closed** (Plus simply unavailable, calm "coming soon") whenever the
Stripe keys or the flag are absent — the default in dev/CI and in production until go-live. **No
member is charged until every step below is complete and the owner flips `BILLING_ENABLED`.**

> **Owner-only, by policy.** Per `references/escalation-policy.md`, every real-money action here —
> creating/verifying accounts, adding LIVE keys, creating a real Product/Price, registering a legal
> entity + VAT, accepting platform terms, and spending — is an **OWNER action**. **No agent** creates
> accounts, adds live keys, accepts terms, or switches on charging. Steps below are marked
> **`[OWNER-ONLY]`** (only the owner can do it) or **`[AGENT-OK]`** (an agent may prepare/verify it,
> no secret or spend involved).

> **Secrets discipline.** Never paste a real Stripe key, webhook secret, price id, connection
> string, or VAT/entity detail into this repo, a PR, a chat, or any log. Secrets live only in the
> Stripe/Vercel consoles and Vercel's per-environment env vars. Every value shown here is a
> placeholder.

> **Not legal or tax advice.** The VAT/OSS and legal-entity guidance here is operational
> orientation, not counsel. Confirm the specifics for your jurisdiction with a qualified
> accountant / lawyer. Counsel review of the subscription terms is a launch gate
> (`CX-20260701-owner-decision-payments-processor-and-billing-gate`).

---

## Decisions this runbook assumes (already made)

- **Model:** ethical freemium. Safety + core participation **free forever**; Plus =
  convenience/richness only. Photos capped at **6 for everyone**. (`docs/marketing/monetization-and-pricing-analysis.md` §0.)
- **Launch price:** **€6.99 / month** (VAT-inclusive EUR); annual **~€59–69/yr**, configurable.
- **Processor:** **Stripe** (direct, web-first).
- **Flag/keys:** `BILLING_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`.

Related tickets: `CX-20260701-owner-decision-monetization-model-and-pricing` (verified),
`CX-20260701-owner-decision-payments-processor-and-billing-gate` (go-live gate),
`CX-20260701-plus-tier-entitlement-model-and-gating`,
`CX-20260701-stripe-subscription-integration-test-mode`,
`CX-20260701-plus-billing-management-ui`,
`CX-20260701-plus-perks-advanced-discovery-filters`.

---

## Prerequisite (code side, before any of this)

- **`[AGENT-OK]`** The four buildable tickets above are implemented and verified: the entitlement +
  `isPlus(user)` gating helper, the fail-closed test-mode Stripe module + Checkout + signature-
  verified webhook behind `BILLING_ENABLED`, the honest billing-management UI (Stripe Billing Portal
  for cancel-as-easy-as-subscribe), and at least the first perk. Production build is green with the
  flag off / no keys (fail-closed proven). No secret committed.
- **`[AGENT-OK]`** `apps/web/.env.production.example` documents `STRIPE_SECRET_KEY`,
  `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `BILLING_ENABLED` as commented placeholders only.

---

## Ordered go-live steps

### (a) Register a legal entity / sole-trader + business bank — `[OWNER-ONLY]`

- Register the business (sole-trader / PFA / SRL / equivalent for your jurisdiction) and open a
  **business bank account** for Stripe payouts.
- You will need the entity's legal name, registered address, and tax/registration number for
  Stripe KYC and for invoices.
- Why first: Stripe KYC (step b) and VAT registration (step c) both need the entity to exist.

### (b) Create + verify a Stripe account (KYC) — `[OWNER-ONLY]`

- Create the Stripe account for the entity from (a); complete **KYC / identity + business
  verification**; add the business bank account for payouts.
- Set the account country and default currency to **EUR**.
- Do **not** yet accept anything into production code — keys come in steps (e)/(f).

### (c) EU VAT / OSS registration for digital subscriptions — `[OWNER-ONLY]`

- Sport Date Plus is a **digital service** sold to EU consumers → **VAT is due in the customer's
  country of residence**. Register for the **EU VAT One-Stop-Shop (OSS)** (or confirm the threshold
  position for your jurisdiction with an accountant) so cross-border EU VAT is filed through a single
  return.
- Decide the VAT treatment and enable **Stripe Tax** (recommended) so VAT is calculated and collected
  per customer location. Confirm **prices are shown VAT-inclusive** in EUR (a launch requirement).
- Keep invoices/records; OSS filing is typically quarterly.
- Confirm specifics with a qualified accountant — this is operational orientation, not tax advice.

### (d) Create the €6.99 Product / Price in Stripe (+ annual) — `[OWNER-ONLY]`

- In Stripe, create a **Product** "Sport Date Plus".
- Add a **recurring Price**: **€6.99 / month**, currency EUR, VAT-inclusive presentation.
- Add the **annual Price** at the configured amount (~€59–69/yr, "2 months free") — the exact number
  is set here as a Stripe Price, not hardcoded in the app. (Optional short pass can be a further
  Price.)
- Copy the **monthly Price id** — it becomes `STRIPE_PRICE_ID`. (The app's Checkout uses this id;
  the annual/short-pass ids are surfaced by the billing UI when offered.)
- Do this **first in TEST mode**, then repeat in LIVE mode at step (f) — test and live have separate
  Product/Price ids.

### (e) Add STRIPE **TEST** keys to Vercel env + verify test checkout — `[OWNER-ONLY]` to add keys; `[AGENT-OK]` to verify

- In Vercel (project `apps/web`), add as env vars (Preview/Production as appropriate for a test run):
  - `STRIPE_SECRET_KEY` = Stripe **test** secret key (`sk_test_…`)
  - `STRIPE_PRICE_ID` = the **test** €6.99 monthly Price id
  - `STRIPE_WEBHOOK_SECRET` = the signing secret of a **test** webhook endpoint pointed at
    `/api/billing/webhook`
  - `BILLING_ENABLED` = `true` **for the test environment only**
- Register the **test** webhook endpoint in Stripe → the app's `/api/billing/webhook`, subscribed to
  `customer.subscription.created` / `updated` / `deleted` (+ `checkout.session.completed`).
- **`[AGENT-OK]` Verify end-to-end in test mode:** run a Checkout with a **Stripe test card**, confirm
  the webhook is received + signature-verified, and confirm the member's **Plus entitlement flips on**;
  cancel via the **Stripe Billing Portal** and confirm entitlement flips **back to free** (cancel as
  easy as subscribe). Confirm that with the flag off / keys absent the app is fail-closed ("coming
  soon", no charge). **No real money moves in test mode.**

### (f) Add STRIPE **LIVE** keys + webhook secret — `[OWNER-ONLY]`

- Only after (e) passes and after **counsel review of the subscription terms**.
- Repeat step (d) in **LIVE** mode to get the live €6.99 Product/Price.
- In Vercel **Production** env, add:
  - `STRIPE_SECRET_KEY` = **live** secret key (`sk_live_…`)
  - `STRIPE_PRICE_ID` = the **live** €6.99 monthly Price id
  - `STRIPE_WEBHOOK_SECRET` = the **live** webhook endpoint's signing secret
- Register the **live** webhook endpoint (production URL → `/api/billing/webhook`, same events).
- Keep `BILLING_ENABLED` **still off** in production for now (keys present, flag off = still fail-
  closed, still no charging) until the final flip.

### (g) Accept Stripe's terms — `[OWNER-ONLY]`

- Accept Stripe's **Services Agreement / platform terms** in the Stripe dashboard for the live
  account. (An agent must never accept these.)
- Confirm payout schedule, statement descriptor, and dispute/refund settings.

### (h) Flip `BILLING_ENABLED` — `[OWNER-ONLY]`

- Set `BILLING_ENABLED=true` in Vercel **Production** and redeploy (or re-provision the env).
- **This is the moment real charging becomes possible.** The upgrade surface appears; a member can
  subscribe to Plus at €6.99/mo and self-serve cancel via the Billing Portal.
- **Immediately verify on production:** one real subscribe (you can refund yourself), webhook
  verified, entitlement on; cancel via Billing Portal, entitlement off; confirm safety + core
  participation remain free and unaffected; confirm VAT is applied correctly and invoices are
  VAT-inclusive EUR.
- **Rollback:** set `BILLING_ENABLED=false` and redeploy → billing goes dormant again (fail-closed),
  existing Plus members are unaffected in their free-forever core experience. Removing the keys is the
  belt-and-braces stop.

---

## Post-go-live guardrails (must stay true)

- Safety (report, block, leave, emergency, approximate-location privacy, Safety Center, moderation,
  appeals) and core participation (discover, join, host, message, sign out) are **free forever** —
  never gated by Plus.
- Photos stay capped at **6 for everyone** — no per-tier photo advantage.
- Plus only ever grants the allowed convenience/richness perks. **Never** build paid boosts/likes/
  priority visibility, paid access to people, "who rated/skipped/viewed you", or any attractiveness/
  popularity mechanic; **no** manipulative urgency.
- **Cancel is as easy as subscribe** (Stripe Billing Portal, one obvious path, no guilt loop) — EU
  Digital Fairness Act / UCPD.
- VAT-inclusive EUR pricing; **no** dynamic/personalised pricing.
- Record the go-live and any pricing change in `docs/operations/decision-log.md`.
- If a subscription lapses, the member returns cleanly to a **fully usable free** product.

---

## Owner inputs still required (checklist)

- [ ] `[OWNER-ONLY]` Legal entity / sole-trader registered + business bank opened (a).
- [ ] `[OWNER-ONLY]` Stripe account created + KYC-verified, EUR (b).
- [ ] `[OWNER-ONLY]` EU VAT / OSS registration; Stripe Tax enabled; VAT-inclusive confirmed (c).
- [ ] `[OWNER-ONLY]` €6.99 monthly + configurable annual Product/Price created (test, then live) (d, f).
- [ ] `[OWNER-ONLY]` Counsel review of subscription terms complete (before f).
- [ ] `[OWNER-ONLY]` TEST keys added; `[AGENT-OK]` test checkout + cancel verified end-to-end (e).
- [ ] `[OWNER-ONLY]` LIVE keys + webhook secret added to Vercel Production (f).
- [ ] `[OWNER-ONLY]` Stripe terms accepted (g).
- [ ] `[OWNER-ONLY]` `BILLING_ENABLED=true` flipped + production verify + rollback tested (h).
