# KeepItUp: enrollment, experience and commercial review

24 September 2026. Owner-requested review only. Recommendations below are proposals, not an execution plan activated by this review. HQ is the report dashboard: https://keepitup.social/hq.html.

## Judgment

**KeepItUp has not yet demonstrated product-market fit, but the available evidence does not establish market rejection either.** It has a substantial product foundation and very little recorded activity. The first commercial promise remains unproven: a newcomer finds a suitable real activity, attends, and wants another one.

My recommendation is to test a narrowly operated, recurring newcomer sports group through the existing product before building another app. The likely bottleneck is a combination of unproven distribution, unverified local supply and effort before value. Another codebase would inherit those problems. More general marketing or visual polish cannot resolve them on its own.

Interpret “go public” as a public customer launch. The website is already publicly accessible as a beta; the missing step is a credible, repeatable local offer and evidence that people choose it.

## What we know—and what we do not

Authenticated production metrics were read on 24 September at 12:52–12:53 UTC. The current day is incomplete.

| Anonymous recorded event | Aug 26–Sep 24 | Sep 18–24 |
| --- | ---: | ---: |
| Landing page loads | 67 | 33 |
| Discovery loads | 45 | 4 |
| Signup starts | 2 | 0 |
| Signup completions | 1 | 0 |
| Landing join CTA clicks | 1 | 0 |
| Join requests | 1 | 1 |
| Event publication starts / completions | 2 / 1 | 0 / 0 |

Source: authenticated `GET /api/metrics/summary?days=30` and `?days=7`, both HTTP 200. These are repeatable client events, potentially including owner, staff, test and automated activity. They are **not unique prospects, verified customers or a conversion funnel**. Do not calculate a signup conversion rate from this table.

“Signup started” means the visitor successfully advanced past the first-and-last-name screen. It does not count everyone who opened signup. Completion is a browser beacon after the registration API succeeds; direct API accounts and failed beacons may be absent. The principal “Find an activity” hero link is not instrumented by the click tracker. No step-level abandonment or acquisition attribution is available. Missing counters do not prove nobody performed the action.

Real customers, current real upcoming places, attendance, retention and settled revenue remain **unknown**. The live pilot aggregate endpoint returned 404; unauthenticated discovery data returned 401. I did not query individual member records. Six documented demo events dated September 15–20 are fictional and past; they cannot establish current real supply. The reviewed evidence does not establish delivery or outcomes of the prepared host inquiries. An unexecuted or unobserved experiment is not evidence that customers rejected it.

The September 21 growth checkpoint and September 22 strategy checkpoint have passed without verified business-outcome evidence in the reviewed sources. The correct status is “outcome not evidenced,” not a silently extended deadline or claimed success. The previous HQ report was dated September 15 and included stale working assignments; it was not evidence of continuous activity.

## Why enrollment may be weak

| Priority | Finding | Confidence and meaning | Proposed response |
| --- | --- | --- | --- |
| 1 | Very little recorded exposure; relevant audience and channels unknown | High confidence in counts, low confidence in actual reach. Too little evidence to diagnose a conversion failure. | Establish where relevant adults encounter a concrete offer and whether they choose it. |
| 2 | A visitor cannot evaluate nearby activities before authentication | Live confirmed. A likely barrier, not measured causality. | Lead acquisition to a real public invitation with date, broad area, pace, intention, cost and availability. |
| 3 | No verified recurring real supply | Evidence gap, not proof the marketplace is empty. | Confirm hosts, sessions and suitable available places before broad promotion. |
| 4 | Ten signup screens precede the activity payoff | Live first screen plus committed source. Abandonment location is unknown. | Test progressive profile completion and an event-first path while retaining essential adult, consent and participation rules. |
| 5 | Dating, friendship and a new crew compete in the same broad promise | Observed copy; expectation mismatch is a hypothesis. | Lead with one occasion and state each session’s intention clearly. |
| 6 | No demonstrated reason to switch from existing groups or apps | Competitive judgment; needs customer interviews. | Differentiate on a reliable welcome and worthwhile repeat encounters, supported by actual operations. |

No observed evidence supports blaming a particular demographic, the visual design alone, or a specific signup question for the enrollment result.

## The website journey

The live unauthenticated journey is **landing → “Find an activity” → login → signup, Step 1 of 10**. The promised activity is not yet visible. Signup then asks, in order, for name, gender, orientation, birthday, sports, intentions, photos, location, credentials and review. Gender and orientation are optional, but their screens still appear before a visitor has chosen whether dating is relevant.

Committed source also loses event context: an invitation sends a guest to generic signup/login, login returns to Profile, and signup offers a profile destination. Someone who wanted one session must rediscover it. Restoring the intended event after authentication should still require a deliberate request; creating an account is not consent to join.

The proposed journey to evaluate is **specific real invitation → understand fit and host review → essential account setup → return to that event → voluntarily request → receive a timely decision → attend → see another suitable session**. Show only safe public logistics; exact meeting details and participant access remain restricted until acceptance. An account-free preview does not require making member profiles or precise locations public.

The landing has a useful emotional promise and explains host acceptance, adults-only participation and location protection. But its extended narrative offers a hypothetical afternoon before demonstrating a real available occasion. Keep the warmth; test whether a concise local offer answers “what can I actually do this week?” sooner. No measured performance, scrolling or visual-usability failure is claimed here.

Credibility also needs attention in any later revision:

- Live Trust and social metadata promise “GDPR-grade” protection while Privacy and Terms explicitly remain previews with unresolved review items. Align claims with substantiated operations. This is a credibility finding, not a legal determination.
- The sampled expired demo invitation says similar games are hosted “all the time,” without establishing current supply. A test invitation should remain clearly fictional on every public surface and must never become acquisition proof.
- Source-level empty-state copy promises notification although the interest signal is anonymous and explicitly not a notification subscription.
- Signup’s verification guidance references Profile although the control now lives in Settings.

Preserve what already works: privacy-safe public invitation infrastructure, host-reviewed admission, block/report/leave controls, explicit optional-data consent, honest beta disclosure and billing that stays unavailable when not configured. These are reasons to reuse the foundation rather than rewrite prematurely.

## Market fit and the proposed first audience

**Positioning hypothesis:** a welcoming first sports group for adults who want to participate but do not have people to go with. The useful difference would be reliable newcomer inclusion, a clear first visit and another suitable session—not merely an event directory or “no swiping.”

Example proposition for research: “Come alone to a small, beginner-friendly Saturday walk/run. A host welcomes you, explains the plan and helps everyone meet.” This is draft positioning, not an advertised or confirmed session.

Concentrate on one practical neighborhood, one recurring time and one accessible sport before adding variety. Bucharest is an existing research candidate only if a named operator and committed hosts are available; this review does not choose the launch country/city. Activity/friendship and singles sessions should have explicit, separate expectations. Do not imply that all participants are strangers or that a friendship event is covertly for dating.

Current official offers show why the broad category is insufficient:

| Alternative | Verified offer | Implication |
| --- | --- | --- |
| Timeleft | Small-group dinners, drinks and runs through a subscription; friendship core and separately opted-in singles formats. | Meeting strangers through sport is already offered. Geographic availability of each format needs separate checking. |
| Strava | Local event browsing by location, sport, date and format. | Discovery filters alone are not a compelling advantage. |
| Thursday | Event tickets available without creating a dating profile. | A specific occasion can carry the acquisition promise. |
| Meetup | Organizer plans start at $29.99 monthly or $174.99 annually; exact regional offers vary. | Organizer value is a plausible paid category, not evidence anyone will pay KeepItUp. |
| Existing clubs and group chats | Familiar substitute to investigate in interviews. | Ask what is missing from the participant’s current way of finding company before assuming they need another app. |

Sources, checked September 24: [Timeleft explanation](https://help.timeleft.com/hc/en-150/articles/28529250732444-What-is-Timeleft-and-How-Does-It-Work), [Strava event browsing](https://support.strava.com/en-us/articles/15401534-browse-events-on-mobile), [Thursday ticket journey](https://www.thursday.com/blog/buy-tickets-without-the-app), [Meetup organizer pricing](https://help.meetup.com/hc/en-us/articles/28677808413197-Organizer-Subscription-prices-overview). Competitors’ descriptions establish their offers, not their profitability or demand for KeepItUp.

## How this could earn money

The question is who receives enough repeated value to pay. Historical July records selected €6.99/month Plus and free core participation; September strategy treats Plus as an offer to validate. Nothing in this review activates billing or changes that commitment. A configured subscription entitlement or trial is not settled revenue.

| Model | Judgment | Evidence needed before investment |
| --- | --- | --- |
| Optional member Plus | Possible later; filters and convenience have little value without abundant suitable events and repeat use. | Returning active participants voluntarily buy and retain a clearly useful optional benefit. |
| Optional organizer/venue tools or measurable attendance service | Best adjacent commercial hypothesis; scarce hosts should not be charged before receiving value. | Organizers repeatedly use the service, can identify time saved or incremental customers, and make real payments. |
| Separately operated hosted experiences | Worth considering if people want a managed welcome rather than self-organization; a service business with staffing costs. | Attendance, repeat choice and positive contribution after host labor, venue, support, refunds and acquisition. A core participation paywall would contradict the existing promise. |
| Advertising or sale of member data | Poor initial direction. | Advertising needs scale and distracts from the immediate value; member-data monetization conflicts with the product’s trust position. |

Illustrative arithmetic, **not a forecast or measured conversion benchmark**: if 3% of monthly active participants pay the historical €6.99 price, 1,000 active participants yield 30 payers and **€209.70 monthly gross billings**; 10,000 yield **€2,097**. About 716 payers, or roughly 23,900 active participants at that assumption, are needed for €5,000 gross monthly billings. These amounts precede VAT treatment, fees, refunds, acquisition, moderation, support and founder time. Registrations are not active participants.

For comparison, a purely hypothetical €49/month organizer offer with €10 incremental monthly delivery cost leaves €39 before tax and fixed costs. Ten retained organizers yield €390; 100 yield €3,900. If acquiring/onboarding one costs €120, simple payback takes just over three paid months, provided retention and delivery costs hold. These are unapproved prices and invented planning inputs, included to expose the economics that must be measured—not to present another subscription as validated.

For any model, compare acquired-customer cost with realized contribution over observed paid months; include operator labor and cancellations. Do not justify paid advertising with gross revenue, assumed lifetime value, or unpaid purchase-intent statements.

## A public launch and marketing strategy to evaluate

The following stages begin only when their prerequisites exist. They are not tasks executed in this review, and no publication, outreach, spend or launch date is committed.

| Stage | Proposed scope | Evidence gate |
| --- | --- | --- |
| 1. Establish the offer | One local operator and one committed host with a feasible dated session, clear pace, intention, capacity, cost and cancellation rules. Reuse the existing host research. | One real session and accountable response/moderation coverage are enough for initial learning. Prepare a follow-up opportunity before evaluating return. If host commitment fails, revise the offer before generating more content. |
| 2. Check the first journey | Five unfamiliar, consenting adults evaluate a real invitation without coaching. Ask what it is, who it is for, what happens next and why they would decline. | At least four understand the mechanism; at least three voluntarily request a suitable session. Directional learning only, not a statistical conversion result. |
| 3. Run a small local cohort | Before broader cohort promotion, aim for three reliable hosts and six dated sessions; recruit only against actual available places. Offer another suitable session within the return window. | Record requests, decision delays, acceptance, attendance responses and cancellations. Aim to observe at least 20 first attendees with a complete 14-day window. |
| 4. Assess repeated value | Observe mature return and interview participants about their actual experience. | Working threshold: at least 25% return within 14 days with a real suitable opportunity. Report the denominator and missing self-reports; one tiny cohort does not prove fit. |
| 5. Test paid value | Make a transparent, later-approved optional offer to returning participants or organizers who received value. | Settled non-test payments, refunds, delivery costs and retention. At least three unrelated paying customers plus a renewal/repeat payment is a useful initial signal, not business validation. |
| 6. Expand carefully | Add one time slot or neighborhood before a new city. | Reliable supply, satisfactory repeat behavior and measured economics. Paid acquisition follows evidence, not an arbitrary signup target. |

For these gates, attendance means distinct non-host participants with qualified self-reported attendance on real elapsed events, with explicitly classified demo/staff activity excluded. Return means a second such event within 14 days, among people whose complete observation window has elapsed. Show missing responses and response coverage separately; these are not independently verified physical-attendance measures.

For a first month after readiness, spend the opening week on supply and comprehension, the next two on sessions and return opportunities, and the final week reviewing mature outcomes. Later cohorts will still be immature at day 30; do not force a retention conclusion to fit a calendar.

Marketing should invite someone to **one real plan**, with a specific date, broad area, pace, intention and transparent cost. First proposed channels: a willing host’s existing audience, relevant local clubs/venues and voluntary participant invitations. Proposed content: show the real first-arrival experience, explain who the session suits, and answer whether arriving alone is welcome. Actual people/images require their permission; do not manufacture testimonials. Local language and English variants should follow the chosen audience’s evidence.

Judge channels by worthwhile attended and returning participation, not likes, posts or registrations alone. Broad “download our new social app” campaigns, general directory launches and high content volume are weak first bets for a geographically fragmented marketplace. No paid campaign budget is recommended before contribution and retention are observed.

HQ should separately show dated sources for real upcoming places, qualified exposure, signup entry and completion, first valid requests, pending request age, acceptance, attendance with response coverage, mature 14-day return, settled payments/refunds and delivery cost. Known demo/staff activity must be excluded explicitly; unknown values stay unknown. This is a measurement recommendation, not newly installed tracking or a proposal for invasive profiling.

## When to change direction—or build a different app

| Evidence from feasible, delivered offers | Decision |
| --- | --- |
| Little relevant exposure or no real session available | Diagnose execution and supply. No basis for declaring the idea rejected. |
| Relevant adults understand the offer but repeatedly decline | Change the audience, occasion or promise based on volunteered reasons. Do not first add features. |
| People attend and return for friendship/activity, while dating creates hesitation | Concentrate the proposition on activity groups, using the existing product. Keep singles sessions explicit if separately supported. |
| Participants return but do not pay for Plus; organizers demonstrate repeated paid value | Consider an organizer-focused business using the existing foundation. Validate a specific workflow before building a general club-management suite. |
| Participants want the experience but hosts will not self-organize it | Consider a managed local service, with labor, responsibility and margin made explicit. It may need less software. |
| Repeated real cohorts have low return despite suitable follow-up supply, and neither participants nor organizers show paid value | Stop or choose another problem. A new brand or codebase does not by itself fix a weak recurring need. |

Before a substantial rebuild, require evidence of a different recurring job, an identifiable paying customer and why the present foundation prevents serving it. Two well-executed offer iterations with a pre-agreed exposure window are a practical review checkpoint—not a scientific proof of market absence. Record why people decline and distinguish insufficient exposure, execution failure and genuine lack of value.

**Recommendation for the owner’s later decision:** retain the current technical foundation; focus the next business experiment on a reliable newcomer group; treat optional organizer value as the leading adjacent revenue hypothesis. Do not fund a second app solely because enrollment is unverified or low.

## Evidence and review limitations

- Live HTTP review: `/`, `/landing`, `/signup`, `/discover`, `/login`, `/trust`, `/privacy`, `/terms`, `/research`, `/feedback`, one documented expired demo invitation, robots, sitemap and HQ. No registration, request, survey, message or payment was submitted.
- Browser automation had no available browser/app surfaces. No fresh visual, mobile, motion, keyboard, performance or complete interactive signup assessment was possible. Earlier QA records are historical, not new evidence.
- Committed sources: `LandingExperience.tsx:77`, `discover/page.tsx:34`, `sign-up-steps.ts:29`, `SignUpForm.tsx:82`, `SignUpForm.tsx:136`, `SignUpForm.tsx:159`, `LoginForm.tsx:56`, `e/[eventId]/page.tsx:147`, `e/[eventId]/page.tsx:176`, `RegionInterestSignal.tsx:52`, `click-metrics.ts`, and `PlusBilling.tsx`. Existing dirty signup/profile work was preserved and not represented as deployed.
- Internal context: [company vision](../company/vision.md), [September growth plan](../operations/growth-plan-2026-09-14.md), [group-formation hypothesis](group-formation-2026-09-15.md), [demo exclusions](../operations/live-demo-events-2026-09-15.md), [historical pricing decision](../marketing/monetization-and-pricing-analysis.md). Current evidence takes precedence over old activity or traction claims.
- No visitor interviews, current campaign-platform analytics, authoritative customer cohort or payment ledger were available. Causes remain hypotheses where identified above.
- Verification: 26 existing HQ/reporting tests and web typecheck passed. Independent review checked evidence, causal language, scope and privacy; its three clarifications were incorporated. The ten-part HQ report passed schema/size checks and was published with exact live API readback verified at 2026-09-24T12:57:53.415Z. These checks establish reporting integrity, not product-market fit.
