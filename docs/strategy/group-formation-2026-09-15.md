# Strategy hypothesis: meet a new small sports group

September 15, 2026. Owner approved exploring a product centered on finding unfamiliar people for real small sports activities. Treat the direction as a testable hypothesis. This document is a strategy decision, not evidence of adoption or permission for recruitment, deployment or spending.

## The job and the difference

“I want to play or move this week, but I do not have the right people. Help me find a welcoming small group with a specific plan, understand whether I fit, and confidently take one step toward joining.”

The product earns its place before a group exists: discovery beyond an existing contact list, clear activity expectations, a bounded place in a small group, and a dignified host-reviewed introduction. Coordination supports that outcome after acceptance. More chat, dashboards, reminders or event administration alone will not prove the differentiated job.

Keep activity partners, friendship and dating explicit without making every encounter a dating event. Do not imply participants are all strangers unless they voluntarily establish that; do not collect contact lists or construct a social graph to prove it. A host can welcome newcomers while knowing some existing participants.

## Source evidence and implications

Current [discovery](../../apps/web/src/app/discover/page.tsx), [event creation](../../apps/web/src/components/CreateEventForm.tsx) and [join controls](../../apps/web/src/components/JoinRequestControls.tsx) already support real plans, eligibility, host review and accepted places. Build the first differentiated experience on those rules. A new matching engine, automatic group assignment or open personal-directory browsing is not required to test the job.

The [host experiment](../marketing/next-growth-experiment-2026-09-14.md) has a bounded approved inquiry packet, but reviewed evidence does not establish a committed real host or attended pilot. The [live demo record](../operations/live-demo-events-2026-09-15.md) establishes six fictional events, not available real-world supply. The [measurement review](../marketing/next-growth-experiment-2026-09-14.md#measurement-readiness-repository-review-no-live-reads) establishes mutable requests/seats and qualified self-reports, not an authoritative historical funnel or verified attendance.

## Staged product strategy

1. **Understand and choose a group.** Make discovery and event detail answer: what will we do, when, in which broad area, at what pace, with what intention, how many places, and what happens after I request? Keep one clear request action, real eligibility and useful cancellation recovery. Show demo status before someone mistakes a fictional plan for a meeting; never include demo cards in a claim of real availability.
2. **Help a first host form a group.** When there is no suitable real plan, offer a clear start-a-plan path using the existing host flow. Explain that publishing seeks participants and does not guarantee any will join. Prefer a concise invitation to new participants over new admin features. Defaults and progressive disclosure may simplify composition; do not remove adult, capacity, intention, location or responsibility requirements. Real distribution starts with the existing host inquiry work, not a claim of automated audience generation.
3. **Make the first encounter workable.** Give pending members an understandable host-review state; accepted members get appropriate meeting coordination. Host tools should resolve actual admission, change or cancellation needs. Keep precise location access, block/report and graceful exit unchanged. Fix broken coordination when it prevents attendance, but do not use a chat feature as the differentiator.
4. **Earn the second encounter.** After qualified self-reported attendance, make an existing next real activity easy to find. Test whether people choose it, without streaks, unsolicited messages or pressure. Monetization follows demonstrated voluntary value and approved pricing; no subscription promise or price is selected here.

## Seven-day commitments: September 15–22

These are controllable team deliverables, not promises of customers. Record the original dates and any misses.

| By | Commitment | Completion evidence |
| --- | --- | --- |
| September 16 | Audit discovery → detail → request and empty → create against the group-formation job; select one material comprehension gap. | Actual source/browser findings, chosen before/after behavior and acceptance criteria. |
| September 18 | Implement one complete local slice that helps a newcomer choose or start a real plan; keep explicit demo labeling and existing safety/eligibility. | Relevant tests, typecheck, mobile/keyboard/reduced-motion inspection and an exact reviewable diff. No conversion claim from automated checks. |
| September 19 | Prepare an aggregate-only pilot measurement specification and fixture-exclusion regression cases. | Defined source identity, denominators, readiness flags and the six explicit exclusions below. Do not call a specification implemented telemetry. |
| September 20 | Package the single adoption test below using the current host packet and actual accessible product. | Exact recruitment scope and session prerequisites ready for owner action; no redundant inquiry approval and no messages sent by preparation. |
| September 22 | Review delivery and any real evidence; choose continue, revise or defer the hypothesis. | HQ separates completed local work, released work, unexecuted research, observed outcomes and unknowns. Business blockers do not suspend independent product work. |

## One falsifiable adoption test

Once a real host has agreed to a specific newcomer-friendly session and the owner authorizes the exact participant recruitment/publication scope, offer that one session to five relevant consenting adults who were not already planning to attend. Owner/operator handles external contact; the prior five-organization inquiry approval is not blanket participant-recruitment authorization. At least two test participants should voluntarily say they do not already know the other non-host participants; retain an aggregate count, not a relationship graph.

Give the real invitation without coaching people through the interface. Observe whether they understand the activity, fit and host-review step; whether they choose to request; and, after acceptance, whether they attend. Do not pressure uninterested people into a request merely to complete the task.

**Working success threshold:** at least three of five voluntarily make a valid request without step-by-step help, and at least two non-host participants submit qualified attended reflections after the session. Record accepted places, cancellations, missing reflections and timing alongside these counts. This is a directional signal from five people, not a conversion benchmark or causal proof.

**Falsification/revision:** if the valid offer reaches all five with a usable response window but fewer than three request, investigate whether the activity, unfamiliar-group premise or product explanation is unattractive before adding coordination features. If requests pass but attendance fails, investigate acceptance, logistics and confidence. Missing supply, inaccessible product, no recruitment approval, cancelled sessions or incomplete observation are execution gaps, not rejection of the hypothesis. Browser tests and demo-event requests do not count.

## Attendance, return and explicit exclusions

Use a verified production source and explicitly identified real pilot events. Exclude all six event IDs from supply, requests, accepted places, attendance, return and revenue attribution, including any subsequently created interactions on them:

| Fictional event | Excluded production ID |
| --- | --- |
| Easy evening run | `a01ba962-cc5f-4f4a-a42f-83429368d84d` |
| Friendly tennis doubles | `fee224b2-12da-4cf2-aa6f-c711fb304728` |
| First padel rally | `a898744f-4c75-4b70-a2f3-94480a79b3fa` |
| Weekend walking crew | `e4b3bd52-60b6-459c-aee8-2ffff18a8e2e` |
| Casual basketball | `c5c445c5-7732-485b-96a7-9876e3276ead` |
| Advanced tennis practice | `9f1f5987-2179-4f92-8fb8-4b26c428f576` |

Also exclude the synthetic DEMO Test Host from customer/host counts using its exact privately held account identifier, not a name/email heuristic. This list is a known minimum; it does not classify all older staff/test records. If the full pilot exclusions or source identity are unverified, report readiness as unknown rather than customer totals. Do not reproduce the private creation receipt or credentials in reports.

- **Formation:** distinct real pilot plans with at least two accepted non-host people, shown separately from completed activities. Current accepted seats are a snapshot, not lifetime acceptances.
- **Attendance:** non-host `attended` reflections with `qualified_for_progress = TRUE` on elapsed real pilot events. Show response coverage, left-early/did-not-attend counts and missing responses. Qualified self-report is not independent physical attendance verification; no report does not establish safety.
- **Return:** first-time qualified non-host attendees who report attending a second distinct real event within 14 days, divided by the first-attendee cohort whose complete 14-day window has elapsed. Use event dates, exclude demos at both ends and show the denominator. Most September 15–22 attendees will be immature at the seven-day checkpoint; willingness to return is a separate measure.

Current request rows can be reused and accepted seats deleted on leaving. Do not claim an exact historical accepted-to-attended rate without a validated denominator. Anonymous click counts cannot remove demo/staff interactions retroactively or identify distinct attendees. Track these limitations in HQ beside the result.
