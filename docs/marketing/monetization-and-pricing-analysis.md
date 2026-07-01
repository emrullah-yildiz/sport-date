# Monetization & pricing analysis

Status: **proposal / analysis**. Prepared 2026-07-01.

This document recommends a monetization model, a free-vs-paid feature matrix, and EUR price
ranges for Sport Date. **Final pricing, the business-model choice, brand, and launch geography
are owner decisions** (see `references/escalation-policy.md`). Nothing here sets a price in code,
adds billing, or spends money. The concrete decisions are filed as `blocked-owner` tickets
(see the end of this document).

Two guardrails constrain every option below, without exception:

1. **Safety is never paywalled or degraded for free members.** Report, block, leave, emergency
   guidance, approximate-location privacy, pre-acceptance location protection, the Safety Center,
   appeals, and moderation are free for everyone, forever. They are not "premium safety."
2. **No dark patterns.** No artificial scarcity, no attractiveness scores, no public popularity
   metrics, no manipulative streaks, no engagement-maximising mechanics, no fake traction. Ethical,
   honest, easy-to-cancel monetization only, aligned with EU consumer-protection norms.

---

## 1. Market & competitor scan

Prices are current as of the cited dates and vary by country, age, platform (Apple/Google take a
~15-30% cut of in-app purchases), and dynamic/personalised pricing. Treat every figure as an
**anchor, not a quote**. Where a source reported USD only, it is labelled as such; EUR is
comparable but not identical. Anything uncertain is flagged.

### 1a. Dating apps — subscription tiers (the value-gating playbook)

| Product | Tier | Price (as reported) | What it gates |
|---|---|---|---|
| Tinder | Plus | ~$24.99/mo (US, 2026) | Unlimited likes, passport, rewind |
| Tinder | Gold | ~$39.99/mo (US, 2026) | "See who likes you" |
| Tinder | Platinum | ~$49.99/mo (US, 2026) | Priority likes, message before match |
| Hinge | Hinge+ | ~$30-35/mo monthly; $34.99 1mo / $64.99 3mo / $99.99 6mo | Unlimited likes, advanced filters |
| Hinge | HingeX | $49.99 1mo / $99 3mo / $149.99 6mo | Priority, "recommended for you" |
| Bumble | Boost | ~$14.99-15.99/mo | Rematch, extend, "beeline" |
| Bumble | Premium | ~$29.99/mo | Travel, advanced filters, see likers |
| Bumble | Premium+ | ~$39.99/mo | Incognito, unlimited |

**Pattern.** Mainstream dating apps mostly monetise *scarcity of attention*: they throttle likes,
hide who-likes-you, and sell the throttle back. Longer commitments cut the monthly rate; under-28
and per-region prices are common. This playbook is **explicitly off-limits for Sport Date** — it
depends on the swipe/attention mechanics the vision rejects (`docs/company/vision.md` non-goals;
`experience-principles.md`). We study it for price anchoring and to define what we will *not* do.

### 1b. Activity, fitness & maps — utility/prosumer subscriptions

| Product | Price (as reported) | Model note |
|---|---|---|
| Strava | ~€7.99-10.99/mo (EU, 2026); $79.99/yr; Family $139.99/yr | Freemium; paid = analysis, routes, segments. Annual heavily discounts monthly. |
| Komoot | Weekly €4.99 / Monthly €6.99 (web) / **Annual €59.99** (EU, ~May 2026) | Shifted from one-time region packs to subscription; some backlash noted by press. |

**Pattern.** Utility apps monetise *depth for enthusiasts* (analytics, planning, offline maps) and
lean on the **annual plan** as the real price. Strava's annual (~€6.7/mo equivalent) is the useful
anchor for a "committed enthusiast" willingness-to-pay in European sport. Komoot's move to
subscription drew complaints — a caution against removing something people already had.

### 1c. Events & communities — organizer fees and transaction cuts

| Product | Price (as reported) | Model note |
|---|---|---|
| Meetup | Organizer ~$14.99/mo (≤50 members) to ~$19.99/mo (unlimited); Pro from ~$30/mo; Meetup+ member sub exists | **Organizer pays**, not attendees. Region-based pricing. |
| Luma | Free events free; **paid tickets: 5% platform fee + Stripe (2.9%+$0.30)**; Luma Plus $59/mo (annual) removes platform fee | Transaction-based; SaaS tier for pros. |
| Partiful | Free, no premium tier (VC-funded, ~$27.3M; monetisation deferred) | Growth-first; no revenue model yet. |

**Pattern.** Event platforms monetise the **organizer** or take a **small % of paid tickets**, and
keep attendee participation free. This maps cleanly onto Sport Date's two-sided marketplace: the
*host* is the scarce, high-value side, and hosts already get concrete tooling value (coordination,
safety controls, reflection). Charging attendees to attend would poison liquidity.

### 1d. Safety-forward angle (what the market is learning)

- Safety is the **number-one concern** for singles in 2026; a large share of daters report a
  negative safety/privacy experience (Pew, cited via industry summaries). Verification correlates
  with lower harassment in reporting, though verification proves *appearance*, not *good character*.
- Regulators and press are converging on a clear line: **"features that maximise volume or paywall
  basic functionality do not improve safety outcomes."** Match integrating free in-app background
  checks (via Garbo) is the market signalling that *core safety should be free*.
- Takeaway for us: safety is a **trust foundation and acquisition asset, never a SKU.** This is
  also the ethical position the vision already commits to.

### 1e. EU regulatory backdrop (compliance preparation, not legal advice)

- **Digital Fairness Act (DFA):** Commission proposal expected ~Q4 2026, targeting dark patterns,
  addictive design, unfair personalisation/pricing, and **subscription/cancellation traps**
  (auto-renewal without reminders, hard-to-cancel flows).
- **UCPD guidance** already states **cancelling must be as easy as subscribing**.
- Practical implication: build for the DFA now — one-tap cancel, honest renewal reminders, no
  price obfuscation, no "are you sure" guilt loops, clear EUR pricing inclusive of VAT, and no
  personalised/opaque pricing by age or inferred willingness-to-pay (the Tinder dynamic-pricing
  pattern is a regulatory and reputational liability in the EU).

*Sources (accessed 2026-07-01): Tinder subscription tiers (tinder.com/feature/subscription-tiers,
G2A, Android Authority); Hinge/Bumble pricing (lowermysubs.com, help.hinge.co, support.bumble.com);
Strava (strava.com/pricing, support.strava.com); Komoot (support.komoot.com, mysubscriptioncost.eu);
Meetup (help.meetup.com organizer pricing); Luma (luma.com/pricing, help.luma.com); Partiful
(party.pro); EU DFA (europarl.europa.eu legislative-train, freshfields.com, insideprivacy.com);
safety data (flava.app, datingadvice.com, themarkup.org, calawyers.org). USD figures are labelled;
regional/EUR and dynamic pricing vary. Figures are anchors, not commitments.*

---

## 2. Recommended monetization model

**Recommendation: ethical freemium with two paid surfaces, sequenced.**

1. **Sport Date Plus** — a low-cost personal membership that removes friction and adds *warmth and
   convenience*, never safety and never attention-scarcity.
2. **Host tools** — value delivered to reliable hosts (the scarce marketplace side), sequenced
   after Plus and only once hosting volume justifies it.

Explicitly **rejected** for launch: (a) paid likes / see-who-liked-you / attention throttling —
violates the vision; (b) attendee pay-to-attend as a *platform* revenue line — poisons liquidity
(distinct from a host collecting real venue costs, see below); (c) dynamic/personalised pricing —
EU liability and dignity violation; (d) ads or data monetisation — incompatible with the privacy
posture and the sensitive nature of the data.

### Why freemium (not paid-only, not ads)

- **Chicken-and-egg liquidity.** A safety-first marketplace lives or dies on event supply and safe
  completed encounters (north-star). A paywall on core participation would starve the loop before
  it starts. Free core participation is a growth necessity, not just generosity.
- **Trust.** Charging for safety or for basic "can I meet someone" would contradict the brand and
  invite exactly the "paywalled basic functionality" critique the market is punishing.
- **Ability to pay later.** Freemium lets us earn the right to charge by first proving worthwhile,
  safe encounters — then converting members who value *convenience and richness*, and hosts who
  value *tooling*.

### The line that keeps us honest

Everything a member needs to **find, request, attend safely, and reflect on an event is free.**
Paid features are **convenience, richness, and expression** (member) and **coordination leverage**
(host). We charge for *nice*, never for *safe* and never for *access to people*.

### Free vs paid feature matrix

> Legend: **Free** = always free for everyone. **Plus** = proposed personal membership.
> **Host** = proposed host tooling (later phase). **Never paid** = must never move to a paid tier.

| Capability | Tier | Notes |
|---|---|---|
| Report, block, leave an event | **Never paid** | Core safety. Non-negotiable. |
| Emergency guidance / safety center / appeals | **Never paid** | Core safety. |
| Approximate-location privacy; precise location hidden pre-acceptance | **Never paid** | Core privacy invariant. |
| Moderation, audit, decision notices | **Never paid** | Core trust. |
| Browse/discover events; city/sport/language/time filters | **Free** | Core loop. |
| Request a place, cancel a request, attend | **Free** | Core loop. No pay-to-attend. |
| Create/host an event (baseline coordination + safety tools) | **Free** | Supply must be frictionless. |
| Event reflection + Movement Arc progression | **Free** | Encounter-based, never rewards engagement. |
| Basic profile (intro, sports, languages, seeking, prompts) | **Free** | Trust check must be free. |
| Up to ~2 profile photos | **Free** | Recognition/safety at the meeting point should be free. |
| **Extended photo series (3-6)** | **Plus** | Richer self-expression; convenience, not access. |
| **Advanced discovery filters** (pace/level bands, time-of-day, "hosts I've safely met") | **Plus** | Convenience/relevance. Never a compatibility or attractiveness score. |
| **Travel/passport** (browse another city before a trip) | **Plus** | Convenience. |
| **See more context on an event before requesting** (e.g. richer host history that host opts to share) | **Plus** | Only host-consented, non-privacy-eroding context. |
| **Priority on waitlists** | **Never paid** *(as designed)* | Would let money jump a queue for meeting people → dignity + fairness problem. Keep out. |
| **Multi-event host dashboard, recurring series, co-hosts** | **Host** | Coordination leverage for reliable hosts. |
| **Host insight** (attendance reliability, no-show patterns, *aggregate* only) | **Host** | Never per-member scoring exposed to others; no attractiveness metric. |
| **Collect real venue cost from attendees** (padel court, lane fee) | **Host, pass-through** | Cost recovery, transparent before request. Platform may waive/again minimise its cut. Distinct from platform charging for access. |

Notes on two deliberately-excluded ideas: **paid priority to meet a specific person** and **paid
visibility boosts** are excluded permanently — both convert money into an advantage in *who gets to
connect*, which the vision forbids. Waitlist priority is likewise excluded even though competitors
sell it.

---

## 3. Suggested EUR price points (RECOMMENDATION — owner decision)

> **These are recommendations with reasoning, not decisions.** Final numbers are filed as a
> `blocked-owner` ticket. All prices should be shown VAT-inclusive, in EUR, with the annual plan
> presented honestly (not as a disguised default).

### Sport Date Plus (personal membership)

- **Monthly: €6.99-8.99/mo.**
- **Annual: €49-69/yr** (≈ €4.10-5.75/mo equivalent), i.e. roughly "two months free."
- **Optional weekly / short pass: €2.99-3.99** for a member who wants Plus only around a trip or a
  busy fortnight (this is *pro-consumer* — it lets people pay for exactly what they use and cancel
  cleanly, which is the anti-dark-pattern position).

**Willingness-to-pay logic.** This sits **below** dating-app premium (Tinder/Hinge €30-50/mo) on
purpose — we are not selling attention, and our audience is value-conscious European adults who
"move socially a couple of times a month" (positioning). It sits **at/around** the enthusiast
utility band (Strava ~€8/mo, Komoot ~€60/yr), which is the honest comparison: Plus is
convenience/richness for someone who already enjoys the free product, not a gate on connection.
Anchoring at the utility band (not the dating band) is also a *positioning statement*: we price
like a trusted activity companion, not like an attention casino.

### Host tools (later phase)

- **Do not charge hosts at launch.** Hosts are the scarce side; free hosting buys liquidity.
- When host value is proven, options to test (owner decision): **€9-15/mo** for a multi-event/
  recurring-series host tier (anchored to Meetup organizer ~$15-20/mo), **or** keep hosting free
  and let Plus + optional pass-through venue-cost handling carry revenue. Recommendation: **prefer
  a free host baseline + optional paid "organizer" tier for people running recurring series**,
  rather than taxing casual hosts.

### Venue-cost pass-through (if built)

- If Sport Date ever helps a host collect a real court/lane fee, **take a minimal or zero platform
  cut at launch** (Luma-style 5% is the ceiling to consider, but lower/zero is more on-brand while
  proving trust). Always show the full cost, VAT-inclusive, *before* a member requests a place.
  This is cost recovery, not platform revenue, and must never read as "pay to meet people."

### What we will not price

No paid safety, no paid access to people, no paid visibility, no paid waitlist priority, no
personalised/dynamic pricing, no ads, no data sale.

---

## 4. Risks and how the model protects safety and dignity

| Risk | Description | Mitigation |
|---|---|---|
| **Chicken-and-egg / liquidity** | Charging too early or too broadly starves event supply and safe completions. | Core participation and hosting stay free. Monetise only convenience/richness (Plus) and, later, host leverage. Don't introduce Plus until the free loop works locally. |
| **Trust erosion** | Any hint that safety or access is paywalled damages the core promise and invites the "paywalled basics" critique. | Hard rule: safety and access are free forever, stated in-product. Matrix above is the contract. |
| **Churn** | Low-intent subscriptions churn; forced-renewal traps create backlash and (soon) DFA exposure. | Honest annual framing, short passes for light users, one-tap cancel, renewal reminders, no guilt loops. Design *for* easy exit — churn from a clean cancel is healthier than trapped revenue. |
| **EU regulatory (DFA/UCPD)** | Dark-pattern subscriptions, opaque/personalised pricing, hard cancellation. | Cancel-as-easy-as-subscribe; VAT-inclusive EUR; no dynamic pricing; no dark patterns; counsel review before any billing goes live (launch gate). |
| **Two-sided fairness** | Paid advantages in *who gets to meet whom* corrupt the marketplace and violate dignity. | Permanently exclude paid likes, boosts, waitlist priority, and paid priority to reach a person. Plus buys convenience/expression, not advantage over other members. |
| **Objectification / scoring creep** | Monetisable "insight" features could drift into attractiveness or popularity scoring. | Host insight is aggregate/reliability-only and never exposed as a per-member public metric; regression-guard the "never rewards" invariants already in the codebase. |
| **Privacy of payment data** | Payment introduces new sensitive data and a new processor. | Defer billing until an owner-approved processor and counsel review exist (launch gate); minimise stored payment data; keep it outside the safety/moderation data boundary. |

**Dignity check (from experience-principles):** every paid feature must pass "does this help a real,
safe meeting happen, or merely extract money/engagement?" Plus passes because it adds richness and
convenience to a product the member already uses for free; it never makes rejection more visible,
never ranks people, and never buys access to another human.

---

## 5. Phased rollout — earn the right to charge

Monetization is **sequenced behind the north-star** (weekly safe completed events with repeat
intent). We do not charge before the free loop is credible.

**Phase 0 — Prove the free loop (now → launch validation).**
No monetization. Ship the buildable trust/ease/vibe features (see
`feature-roadmap-proposal.md`). Instrument request→accept→attend→safe-completion→repeat. Gate:
the local loop works without heroic manual intervention (roadmap "Marketplace sequence").

**Phase 1 — Foundations that make charging *possible* and *honest* (no charging yet).**
Build the account/billing *scaffolding decisions* as owner-gated (processor, VAT, EU-compliant
cancel/renewal UX spec) but **do not switch on billing.** Draft the Plus feature set as free
during beta so members experience the value before any price. Counsel review of subscription terms
queued as a launch gate.

**Phase 2 — Introduce Sport Date Plus (convenience/richness only).**
Turn on Plus at the recommended EUR band once (a) the free loop is healthy in the launch city and
(b) counsel + processor are approved. Launch with monthly + annual + short pass, one-tap cancel,
honest renewal reminders. Measure conversion, churn, and — critically — that safety/liquidity
metrics do **not** degrade for free members.

**Phase 3 — Host tooling (if hosting volume justifies it).**
Add the recurring-series/organizer tier and (optionally) transparent venue-cost pass-through, only
once there are enough repeat hosts that coordination leverage is real. Keep a free host baseline.

Throughout: never introduce a paid tier that removes something free members already had (Komoot
lesson), and never move a safety feature behind a wall.

---

## 6. Owner decisions to file

- **Business-model choice** (freemium vs alternative) and **final Plus / host price points and
  currency behaviour** → `blocked-owner`.
- **Payment processor, VAT handling, and go-live of any billing** → owner + counsel gate (already a
  roadmap launch gate); referenced by the pricing ticket.

See the filed tickets under `.agents/customer-feedback/tickets/` (naming `CX-20260701-*`).
