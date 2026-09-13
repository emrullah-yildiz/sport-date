# CEO growth and revenue plan — 2026-09-14

The objective is a repeatable local business: adults find a real activity, attend, want to return, and eventually pay for optional convenience. The immediate bottleneck is unverified live demand and event supply. More content production or interface polish alone cannot establish either.

This plan replaces the expired July dates and follower-first priorities for this cycle. KeepItUp remains usable worldwide. Concentrating acquisition in one local community is an experiment, not a geographic access restriction. Final launch city, pricing, external communications and production changes remain owner decisions.

## Evidence baseline

**Owner clarification, September 14:** the original prompt and this first plan are starting hypotheses. The numerical scenarios below are preserved for comparison, not fixed commitments. Immediate priority is proof of a useful local loop: real host, worthwhile attendance, return, then voluntary payment for an implemented benefit at an approved price. Plus is one offer hypothesis. Set acquisition scale from real available places and operating capacity; revise the offer and targets from observed behavior. September 21 and October 14 are evidence-review checkpoints, not reasons to manufacture volume. Record forecast revisions and missed assumptions explicitly. One returning paying customer would be an early commercial signal, not proof of a sustainable business.

Read on **2026-09-14 Europe/Bucharest**. Sources: repository HQ report dated July 14; `apps/web/src/lib/click-metrics.ts`; metrics summary route; database schema; entitlement domain; and fresh read-only aggregate SQL against the locally configured database. No individual account, message, preference, report or precise location was retrieved.

| Measure | Observation | What it establishes |
| --- | --- | --- |
| Production real registered adults | **Unknown** | No verified production aggregate read in this cycle. |
| Latest checked-in HQ | July 14: 2 account rows, 0 new that week, 4 events | Historical report, now stale; exclusion of staff/test accounts not established. |
| Locally configured database accounts | 111 total; 0 created in preceding 7 or 30 days; 0 email-verified | Read at September 13 21:40:49 UTC (September 14 locally). Database deployment identity and staff/test exclusions are unverified. **Do not call these 111 users.** |
| Same database event activity | 68 event rows; 0 future published events in next 7 days; 23 request rows; 0 self-reported attended reflections | Test contamination and deployment identity unknown; does not establish a live marketplace. |
| Same database click ledger | No rows in the last 30-day query window | No recorded activity in that source; not proof of zero production visitors. |
| Production revenue / paying members | **Unknown** | Stripe linkage exists in code; no verified live payment ledger or revenue read. |
| Social evidence | July 14 report: 38 posts, 203 recorded Instagram reach, 0 recorded TikTok reach and no attributed followers | Historical channel report; TikTok measurement was already questioned. Not current platform performance. |
| Main landing | Owner-approved concept implemented and tested locally | No deployment or measured conversion improvement established. |

The production metrics API requires owner authentication or `SOCIAL_AGENT_SECRET`; this credential was unavailable in the checked local environment. Its present contract returns anonymous daily click counters, not registered users. A `signup_completed` beacon is not authoritative registration evidence. No credential values were logged.

## Metrics that govern decisions

- **New registered adults:** distinct successfully created adult accounts in the reporting interval, excluding explicitly classified staff/test fixtures. Report verified-account count separately. If exclusion is unavailable, label the count “account rows; exclusions unknown” and do not present it as customer traction. Never infer a person's test status from their name or behavior.
- **Activation:** a new real member makes a first valid join request or publishes a real future event within seven days of registration. Cohort aggregate needed; anonymous beacons cannot deduplicate people.
- **Request acceptance:** requests accepted / requests resolved, alongside pending requests and their age. Do not hide pending requests by presenting only a favorable percentage.
- **Attendance:** qualified self-reported attendance after an event / accepted places at those elapsed events. This is self-report, not verified physical attendance; report reflection response coverage.
- **Repeat participation:** first-time attendees with a second qualified attendance within 14 days / first-time attendees whose full 14-day window has elapsed. Immature cohorts remain pending.
- **North-star event proxy:** elapsed events with at least two qualified attendance reflections answering “would join again: yes.” This records willingness to return, not romantic success or a guarantee of safety. Report operational safety review status separately; private moderation details never enter the public scorecard.
- **Revenue:** settled customer payments less refunds, separated from test transactions, grants and complimentary Plus entitlements. Report gross receipts and fees/tax treatment explicitly; do not invent MRR from `plus_until`.
- **Supply:** distinct committed hosts, real future sessions, and available non-host places in the chosen acquisition area. “Event rows” is not supply.

Anonymous click counts remain useful as directional activity indicators. They are not unique visitors, person-level conversion, attribution or retention. Missing data renders as **unknown**, never zero. HQ displays source, last observation time, exclusions and maturity beside each metric. Global sums suffice initially; avoid granular demographic or location cuts in tiny cohorts.

## Targets and clock

The business sprint runs **September 14–21 (7 days)** and **September 14–October 14 (30 days)**. Record misses on those dates even if owner-dependent distribution or a launch gate delays execution. Also track days since the first authorized, operationally ready pilot so experiments receive a fair exposure window. Targets are management hypotheses, not forecasts or promises.

| Outcome | By September 21 | By October 14 |
| --- | --- | --- |
| Measurement | Verified production aggregate baseline with fixture exclusions or an explicit remaining gap | Daily fresh aggregates; attendance/retention cohorts and revenue source established |
| Committed recurring hosts | 3 | 10 |
| Real sessions offered during interval | 6 | 40 |
| Non-host places offered | 24 | 160 |
| New real registered adults | 25 | 200 base target; **1,000 stretch** |
| Newly activated members | 12 | 100 |
| First qualified attendances | 6 | 48 |
| North-star event proxy | 2 events | 10 events |
| Repeat participation | Establish first cohort; too early for 14-day result | At least 25% of mature first-attendee cohort, with denominator visible |
| Revenue evidence | Five voluntary value interviews after actual use, if recruitment authorized | Ten value interviews and three explicit Plus purchase-intent statements; first settled payment only if billing/pricing approval and launch gates are satisfied |

The first week does not declare retention success. No paid advertising, referral prizes, new tools or paid placement budget is committed by this plan. The default cash acquisition budget is zero.

## Funnel math and capacity

Planning assumptions, deliberately not industry benchmarks: 20% of qualified landing visitors start signup; 50% of starters finish; 50% of registrants activate; 60% of requests receive acceptance; 80% of accepted participants self-report attending.

- Base case: **2,000 qualified visitors × 20% × 50% = 200 registrations**. If activation consists of join requests, 100 requests × 60% × 80% gives **48 attendances**. Host activations must be separated to avoid double-counting demand.
- Stretch case: **10,000 qualified visitors × 20% × 50% = 1,000 registrations**; 500 requests × 60% × 80% gives **240 attendances**. At half the assumed signup conversion, required visitors double to 20,000.
- The stretch case needs at least **300 accepted non-host places**. With four non-host places per session, that is **75 sessions**. Roughly 19 hosts running weekly for four weeks offer 76 sessions, with essentially no scheduling/compatibility buffer. Real required supply will be higher. A roster of 10 hosts/40 sessions is a base-case plan, not enough to promise the stretch outcome.
- Week-one base supply is 3 hosts × 2 sessions × 4 non-host places = 24 offered places. Twelve join requests × 60% × 80% yields about 6 attendances. Offered places do not guarantee compatible times, languages, intentions or acceptance.

There is currently no verified channel capable of delivering 10,000 qualified visitors. Before raising acquisition toward the stretch, require observed signup conversion, sufficient compatible future places, host responsiveness and functioning safety operations. Never loosen eligibility or expose locations to make the funnel look better.

## Three experiments, in execution order

### 1. One community with actual hosts

**Hypothesis:** a recurring small activity with a real host and a clear next date produces more meaningful participation than a general app invitation. Working research wedge: the previously documented Bucharest corridor and accessible run/walk sessions; padel only where a real host has an approved, available venue and transparent costs. City remains owner-gated.

Growth agent prepares one current host packet and revalidates a small organizer shortlist; owner or explicitly authorized operator contacts up to 20 relevant organizers. No September send uses the July list without fresh checks. Recruit three hosts, agree two dates each, confirm capacity, cancellation expectations and operational coverage before member acquisition. Product agent verifies the create → invitation → request → accept → attend flow locally. CEO owns the result.

**Gate:** after 20 delivered invitations and seven days of response time, at least five relevant replies, three committed hosts and six dated sessions. If fewer than three hosts commit, conduct up to five permission-based problem interviews and revise the occasion or invitation before extending the list. No reply is not consent to repeated follow-up. If invitations are unsent, mark execution blocked; do not conclude the channel failed.

**Assets:** existing host/event-invite and poster features; a refreshed host invitation and a one-page operating brief. Status: product capabilities implemented; recruitment packet requires freshness review and authorization before sending.

### 2. Explain the next real plan and remove signup friction

**Hypothesis:** unfamiliar adults understand “choose an activity, request a place, host reviews, meet after acceptance” and can complete the next step without help.

Design agent prepares a five-task comprehension script and audits discovery/signup. Builder ships one complete friction fix at a time with consent/adult/compatibility safeguards unchanged. Research participants, once authorized, use fictional accounts in a controlled study; external recruitment and production release remain gated. Ask what the product does before explaining it. Do not confuse automated browser checks or agent simulations with human research.

**Gate:** at least 4 of 5 unfamiliar adults correctly explain the mechanism and the location boundary, and complete the specified task without coaching. This is directional formative evidence, not statistically significant conversion proof. Fix the most repeated critical misunderstanding before broad distribution. After at least 100 real signup starts, investigate completion below 50%; use trusted aggregate counts and label ratios as directional if unique cohort measurement is unavailable. Do not run a low-volume A/B test and declare a winner from a handful of clicks.

**Assets:** approved main landing, study script and the implemented next journey slice. Primary CTA: discover a real activity / request a place; fictional examples remain unmistakably labeled.

### 3. Host invitation loop, then willingness to pay

**Hypothesis:** people who have a worthwhile first activity will return through a host's next event invitation; some returning members value the existing Plus discovery controls enough to pay.

At the end of an authorized pilot, the host may voluntarily share the next event's privacy-safe invitation. Owner/authorized operator handles external communication; no automated unsolicited member messages. Record aggregate first/second qualified attendances and reflection coverage. Offer a voluntary value interview about actual usage; do not create a deceptive checkout, fake scarcity or paid access to safety/other people.

**Gate:** after at least 20 first-time attendees have a full 14-day observation window, target at least 25% repeat attendance. If missed, diagnose availability, host reliability and actual participant feedback before promoting Plus. After ten voluntary value interviews, require three explicit statements that the currently implemented advanced-discovery value is worth paying for before requesting a priced pilot. Purchase intent is not revenue. A tiny cohort remains exploratory.

**Assets:** existing public invite/poster, reflections/progression and Plus capability. Distribution CTA: a specific next activity, not “follow us.” Do not increase content cadence beyond the existing cap of approximately four posts per channel per week; every proposed post needs a real distribution action and fresh approval before publication.

## Revenue hypothesis and limits

Keep the working free-core/paid-convenience model: optional Plus advanced discovery filters are the only currently declared paid capability. Hosting, discovering, requesting, canceling, attendance, basic profiles, photos, event messaging and safety remain available without Plus. Do not advertise hypothetical host tools as shipped benefits.

Final price, payment activation and legal/commercial terms require the owner. At 200 real members, even an illustrative 2.5% paid conversion is only five paying members; monthly gross revenue would be **5 × owner-approved monthly price**, before refunds, fees and taxes. At 1,000 members and the same unvalidated rate, it is 25 × price. Neither signups nor Plus entitlements imply profitability. No price or conversion rate is chosen by this illustration.

CEO stops low-value feature expansion until supply and first attendance are evidenced. Focus engineering on observability, the first-event journey and verified blockers. Revisit monetization after retention/value evidence; do not install a payment wall in an empty marketplace.

## Owner decision cards — maximum three

### SD-20260914-pilot — Choose the pilot city and accountable local operator

**Decision:** which one community gets the first concentrated host pilot, and who is responsible on the ground?

**Recommendation:** approve Bucharest as the first concentrated acquisition pilot only if the owner or a named local operator can personally support it; begin with run/walk, adding padel only with committed supply. This follows existing research and remains a proposal, not a final country decision.

**Alternatives:** choose another city where a named operator already has organizers; or defer physical acquisition and run remote comprehension research while appointing an operator. Worldwide product access stays unchanged.

**Exact action:** on HQ, approve the proposed pilot or enter the alternative city, name the accountable operator and confirm their available pilot dates. No identity document is requested.

**Delay consequence:** real local supply and attendance targets remain blocked; engineering/research preparation continues.

### SD-20260914-distribution — Authorize one bounded host recruitment batch

**Decision:** who sends the reviewed outreach and under which account/limits?

**Recommendation:** owner executes one freshly verified batch of at most 20 organizer invitations over four days, five per day, using the reviewed packet. No ad spend, purchases or bulk automation.

**Alternatives:** explicitly authorize an identified operator/agent for the same reviewed batch from one named existing account with a 20-message total cap and no unsolicited follow-ups; or decline outreach and proceed only with owner-introduced contacts.

**Exact action:** after the fresh packet is visible in HQ, approve that packet and select owner execution, or name the account/operator and explicitly authorize the listed messages and limits. Approving strategy alone is not permission to send an unspecified future batch.

**Delay consequence:** acquisition remains untested; no additional content volume is commissioned to hide the gap. Until the fresh packet exists this is a pending preparation item, not a ready-to-approve send request.

### SD-20260914-operations — Assign the pilot safety and launch-readiness owner

**Decision:** who accepts operational responsibility for the pilot and closes the existing launch gates?

**Recommendation:** name an accountable safety operator and backup, confirm coverage for proposed sessions, and appoint the owner-side legal/business contact to resolve the existing launch-readiness checklist before recruitment activates the real pilot. Production status is rechecked against evidence, not assumed from July plans.

**Alternatives:** appoint a qualified external operator with costs/contracts separately approved; or keep activity in a controlled non-live research setting until coverage and required reviews exist.

**Exact action:** record the responsible operator, backup and coverage window in the private HQ decision notes; assign the business contact to the existing `docs/operations/owner-escalation.md` gates. This card does not authorize spending, binding legal claims or a production deployment; a verified release packet is a separate decision when ready.

**Delay consequence:** no growth campaign directs participants into events lacking accountable operational coverage. Measurement, design, tested implementation and draft recruitment work remain unblocked.

## Review rhythm

Each operating cycle reads HQ decisions, refreshes available aggregate evidence, chooses the single largest measured bottleneck and assigns bounded design/build/growth tasks. Each daily HQ report states what actually changed, current metrics versus targets, unknowns, next experiment and at most three owner-only decisions. Review experiment gates weekly; log failed assumptions instead of escalating content volume. Never claim autonomous work ran while the runtime was stopped or a scheduled cycle was missed.
