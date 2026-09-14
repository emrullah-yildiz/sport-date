# Next growth experiment: one host, one feasible session

Prepared September 14, 2026. This is an execution brief for the existing five-organization pilot, not a new campaign or permission to send. No external action occurred in preparing it.

## Decision and evidence

Prioritize a concrete host commitment for a beginner-friendly adult walk/run in northern Bucharest. A real activity with a responsible host gives prospective members something to join and makes attendance measurable. Additional broad acquisition would not resolve the current supply uncertainty.

The [September growth plan](../operations/growth-plan-2026-09-14.md) prioritizes host supply, attendance and return. Its 20-invitation scenario is broader than the later [five-organization packet](outreach/2026-09-14-host-pilot.md); use the smaller packet's exact scope. The [agent-state approval record](../operations/agent-state.md) records owner approval of the host pilot, with inquiries assigned to the owner. Do not reopen that unchanged approval or interpret it as permission for agent sending. The packet's draft status is historical; this brief does not alter its recipients or messages.

The [production baseline](../operations/production-baseline-2026-09-14.md) provides anonymous activity counters, not a verified customer, attendance or revenue baseline. Neither development account rows nor a finished interface establish demand. The five organizations were researched in the existing packet on September 14; this task did not independently reverify their contact routes or willingness to participate. Contact execution and outcomes remain unconfirmed in the reviewed evidence.

**Hypothesis:** within one bounded batch, a relevant local organizer will agree to a specific adult session's format, date, capacity and responsibilities. A positive reply or interest in the app does not qualify.

## Exact owner action

1. Use the existing packet's five organizations, tailored opening lines and complete Romanian inquiry: Runners of Bucharest, F45 Bucharest North, Padel One, PadelMania, and Bucharest Running Club. Start with the running organizations; padel is a logistics conversation until costs and venue arrangements are resolved. Recheck each official route before sending.
2. Send only from **support@keepitup.social**, following the owner's latest sender instruction. Verify that the mailbox or authenticated sending alias can send and receive as support before using email. Forwarding alone is insufficient. Do not substitute a personal Gmail sender. If support sending remains unavailable, retain the packet and report the access blocker; this does not require client tokens for a different personal sender. Owner-operated forms remain an alternative only where their identity and terms are acceptable to the owner.
3. Send at most one inquiry per listed organization and, if unanswered, one follow-up after five business days within the 14-day window. Stop on refusal. Do not expand the list or add a public recruitment post. The existing inquiry neither books a session nor promises participants.
4. For interested organizers, conduct the packet's 15-minute conversation. Record privately: proposed format and intention, date, capacity, accountable adult host, cancellation/weather plan, charges or permissions requiring approval. Name the local operator before scheduling a real session.
5. Update HQ with aggregate counts and the next constraint. Keep private correspondence, names of individual participants, contact details and meeting locations out of public reports. The team can then prepare the exact proposed session and remaining owner-only commitments for review.

No new broad strategy choice is needed. The next owner contribution is execution of the already approved packet and support-sender access if email is the chosen route. Approval of inquiries does not approve event publication, spending, contracts or agent outreach.

## Targets and honest interpretation

Retain September 21 and October 14 as the original evidence-review dates. Separately record the actual first-send date; delayed execution must not silently reset historical targets. The packet's targets were relative to authorization; preserve any missed authorization-relative dates and show days since actual sending alongside them.

| Evidence | Target and decision |
| --- | --- |
| Controllable execution | Owner delivers the five reviewed inquiries within three days of sender readiness and execution start. Record sent, failed delivery and declined separately. An unsent batch is blocked execution, not a failed market test. |
| Conversation signal | Two substantive conversations within seven days of the first inquiry. A substantive conversation covers willingness, format, timing and responsibilities. Acknowledgments do not count. |
| Supply signal | One adult host commitment and feasible session plan by day 14 after the first inquiry. Require explicit format, date, capacity and responsibility agreement; unresolved charges or operating permissions mean proposed, not ready. |
| Negative result | After five delivered inquiries, the permitted follow-up and the response window, no commitment means this batch failed its supply hypothesis. Summarize volunteered reasons and change one factor, such as occasion or host type, before proposing another batch. Five contacts cannot establish that the entire city lacks demand. |
| Ambiguous result | Delivery failures, unsent inquiries, incomplete response windows or unavailable operators remain execution gaps. Report them separately from organizer rejection. |

## Attendance is the next experiment

Only after host agreement and the existing operational/publication gates are satisfied, propose one 45-minute session with host-confirmed capacity and clearly stated intention. Use the existing request, acceptance, cancellation and reflection flow. Keep exact meeting details behind accepted membership. A real operator and working support/report route must exist before inviting participants.

The first learning threshold is two non-host participants reporting attendance, with both accepted-place and reflection-response denominators visible. Ask voluntarily whether they would join again; willingness is not repeat attendance. A second qualified attendance within 14 days is an early return signal, not retention proof for a tiny cohort. No reports is not evidence that a session was safe. Any unresolved operational concern overrides recruitment targets.

While owner execution is pending, continue material product improvements and preparation of aggregate measurement. Do not manufacture new campaigns, outreach volume, customer claims or paid-value conclusions to fill the waiting period.

## Measurement readiness: repository review, no live reads

The existing owner/agent-authorized [metrics summary route](../../apps/web/src/app/api/metrics/summary/route.ts) returns only daily anonymous click counters. It cannot currently deliver the experiment's authoritative funnel. Readiness below describes code and schema capability, not production observations or confirmed deployed migrations.

| Measure | Available evidence and limitation |
| --- | --- |
| Inquiries, conversations, host commitment | Owner-reported experiment evidence; no existing authoritative product counter. Keep commitment criteria above and distinguish unknown from zero. |
| Requests | [Join-request records](../../apps/web/db/005_join_requests.sql) support current unique member/event requests by status. The `join_requested` browser beacon is an anonymous action count, not a unique requester or authoritative request. [Re-requesting](../../apps/web/src/lib/join-requests.ts) overwrites the cancelled row's timestamps/status, so current rows cannot reconstruct every historical attempt or a stable historical funnel. |
| Accepted places | `event_participants` stores current accepted non-host places with `accepted_at`. Leaving removes the seat; request rows can subsequently be reused. A current-seat count is measurable, but an exact past accepted-place denominator at event start is not reliably reconstructible from these current records. Do not label it lifetime acceptances or compute an unqualified historical acceptance-to-attendance rate. |
| Attendance and willingness | [Reflections](../../apps/web/src/lib/reflections.ts) store one editable member/event response after the event ends. Count `attendance = 'attended'` and `qualified_for_progress = TRUE`, excluding the host for this experiment. Report `left_early`, `did_not_attend`, missing responses and `would_join_again` separately. `qualified_for_progress` reflects eligible self-report, not independent attendance verification. Pre-event `event_attendance_confirmations.status = 'confirmed'` is intention, not attendance. |
| Return | Existing reflections joined to event dates and member IDs can derive a second distinct attended event within 14 days of the first, with the host excluded and a fully elapsed observation window. [Member progress](../../apps/web/src/lib/progress.ts) already counts qualified reflections, but its lifetime total is not a return-cohort metric. No aggregate return endpoint exists in the reviewed reporting surface. |
| Staff/test exclusions | No explicit classification was found in the reviewed database migrations or these queries. Anonymous counters cannot be retroactively classified. Operational rows include whatever accounts/events exist in the configured database; staff roles alone are not a complete fixture classification. Do not infer exclusions from names, email patterns or behavior. |

**Smallest next implementation:** prepare a tested owner/agent-authorized, aggregate-only pilot snapshot over existing request, participant and reflection records, with a privately supplied explicit pilot-event scope and explicit staff/test exclusions. Return observation time, current-state counts, qualified self-reports, response coverage and exclusion readiness; return unknown/readiness flags when scope, exclusions or source identity are unverified. Keep person/event identifiers and private text out of the response. This requires no extra client tracking and should reuse the existing reporting authorization boundary. Local implementation is unblocked; deployment remains owner-gated.

Before presenting historical funnel rates, separately specify a minimal privacy-reviewed accepted-place denominator snapshot at event start; current seats must not be mistaken for that snapshot. First verify whether the prospective pilot needs this durable denominator before adding storage. Until then, display counts with their current-state limitations and owner-confirmed operational attendance evidence, rather than a misleading rate. No telemetry, schema, endpoint or production data was changed by this review.
