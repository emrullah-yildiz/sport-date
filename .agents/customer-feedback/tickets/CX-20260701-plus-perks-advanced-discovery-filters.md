# CX-20260701-plus-perks-advanced-discovery-filters

- Status: `ready`
- Severity: `medium`
- Priority: `P2` — (Reach 4 × Impact 3 × Confidence 3) / Effort 3 = 12. The first real Plus perk — proves the entitlement gate end-to-end and gives Plus honest value. Depends on the entitlement ticket; independent of the Stripe/UI tickets (works whether or not billing is live, because free members keep everything).
- Customer journey: discovery
- Surface: `web` (matching logic shared with mobile)
- Environment and viewport/device: all widths
- Found by: Owner launch decision (2026-07-01) — advanced discovery filters is the first named Plus perk; `docs/marketing/monetization-and-pricing-analysis.md` §0
- Implementation owner: `unassigned`
- Related tickets: `CX-20260701-plus-tier-entitlement-model-and-gating` (P1 — gates these filters via `isPlus(user)`), `CX-20260701-discover-geo-radius-and-use-my-location` (the base distance/radius capability this perk deepens), `CX-20260701-plus-billing-management-ui` (P2 — honestly advertises this perk), `CX-20260701-discover-advanced-skill-silently-excludes-events` (discovery-fairness precedent — never silently exclude)

## Customer outcome

As a member browsing events, I want richer ways to narrow discovery — a finer distance radius, schedule / time-of-day, and more language options — so I can more quickly find events that fit my life; and as a free member I want discovery to stay fully usable without any of these, never crippled to sell me an upgrade.

## What I observed

Discovery today offers free filters for sport, language, and a coarse "when" (24h / 7d / 30d), plus base geo-radius work in flight (`CX-20260701-discover-geo-radius-and-use-my-location`). The owner named **advanced discovery filters** as the first Plus perk (distance radius, schedule/time-of-day, more languages). These must be a *convenience layer on top of a fully-usable free discovery* — never a gate that makes free discovery worse, and never a compatibility or attractiveness score.

## What I expected (scope — FIRST PLUS PERK, GRACEFULLY DEGRADING)

1. **Advanced filter controls gated by `isPlus(user)`:** a finer **distance radius** (e.g. specific km bands beyond the free default), **schedule / time-of-day** (e.g. mornings / evenings / weekends), and **more languages** (multi-select beyond the free single-language filter). Applied server-side in the discovery query via the shared matching path.
2. **Gated ONLY through the entitlement helper** from `CX-20260701-plus-tier-entitlement-model-and-gating` — one server-side `isPlus(user)` / `canUse` check, no ad-hoc gating. Fail-closed: unknown/absent tier → treated as free (advanced filters simply not applied).
3. **Graceful degradation for free members — this is the core requirement.** A free member's discovery is **fully usable**: all existing free filters keep working, they still see all events they are eligible for, and nothing is silently excluded. Where advanced controls appear, a free member sees a calm, honest note that they are a Plus convenience (no dark pattern, no crippling, no fake urgency) — or the controls are simply absent for free members; either way free discovery is complete on its own.
4. **No safety/fairness regression.** Advanced filters only *narrow at the member's own request*; they never bypass age, approximate-location/city, language eligibility, capacity, mutual-block, or host-exclusion gating (mirrors the discovery-skill-matching decision in `docs/operations/decision-log.md`). Precise location is never exposed; distance uses the approximate-location posture already in place. If a filter would empty the feed, the existing calm empty-state explains why and offers to widen — never a silent exclusion.
5. **Not a score.** These are relevance filters chosen by the member, never a compatibility/attractiveness/popularity ranking.

## Reproduction

1. Open `/discover`. Only sport / language / coarse-when filters exist; there is no Plus-gated advanced filtering.

Reproduction rate: `confirmed; feature absent (2026-07-01)`

## Customer impact

Gives Plus honest, useful value (convenience/relevance) while proving the entitlement gate works end-to-end — without ever degrading the free experience, which stays fully usable and fair.

## Duplicate check

- Search terms used: `filter`, `radius`, `distance`, `time-of-day`, `schedule`, `language`, `plus`, `advanced`.
- Tickets reviewed: `CX-20260701-discover-geo-radius-and-use-my-location` (base distance/location; free-tier capability this perk deepens), `CX-20260701-discover-advanced-skill-silently-excludes-events` (fairness precedent). This ticket is the **Plus-gated advanced layer** on top; it does not duplicate the base geo-radius work and must not gate it. New.

## Acceptance criteria

- [ ] Advanced discovery filters (finer distance radius, schedule/time-of-day, more languages) exist and are **gated only via the entitlement helper** (`isPlus(user)` / `canUse`), applied server-side through the shared matching path; fail-closed (absent/unknown tier → free, filters not applied).
- [ ] **A free member's discovery is fully usable**: all existing free filters work, all eligible events are shown, and **nothing is silently excluded**. Advanced controls, where surfaced to free members, carry a calm honest "Plus convenience" note (no crippling, no dark pattern, no urgency) — or are simply absent — with free discovery complete on its own.
- [ ] Advanced filters **only narrow at the member's request** and never bypass age, approximate-location/city, language eligibility, capacity, mutual-block, or host-exclusion gating; precise location is never exposed; an emptied feed shows the existing calm widen-your-search empty state.
- [ ] **Safety + core participation stay free**: discovery itself, requesting, attending, hosting remain free for everyone; only the *advanced convenience filters* are Plus.
- [ ] **Forbidden-perks guardrail:** these filters are relevance/convenience only — never a compatibility, attractiveness, or popularity score/ranking; no "who liked/skipped/viewed you", no boosts, no priority visibility, no extra photos.
- [ ] **Cancel-easy consistency:** a member who lapses from Plus loses only the advanced filters and returns to a fully usable free discovery with no broken state.
- [ ] Tests cover: Plus member gets advanced filtering; free member gets full unfiltered-eligible discovery with graceful degradation (nothing silently excluded); gating routed only through the entitlement helper; no safety/fairness gate bypassed; fail-closed on absent tier.
- [ ] Accessibility: filter controls keyboard operable, labelled, visible focus, 44px targets, reduced-motion safe; on-brand copy passes the copy test.
- [ ] Relevant automated tests and repository checks pass.

## Handoff and retest log

- 2026-07-01 - Filed as the first Sport Date Plus perk (advanced discovery filters) for the €6.99 launch (`docs/marketing/monetization-and-pricing-analysis.md` §0), gated by the entitlement helper (`CX-20260701-plus-tier-entitlement-model-and-gating`) and gracefully degrading so free discovery stays fully usable. Status `ready`.
