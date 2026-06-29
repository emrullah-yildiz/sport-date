# Safety moderation operations

This is an operating and compliance-preparation document, not legal advice. Qualified counsel must determine Digital Services Act applicability, national reporting obligations, law-enforcement handling, retention, and user-notification requirements for the selected launch countries.

## Official EU baseline

European Commission guidance describes clear, accessible reporting contact points, mechanisms for notifying illegal content, explanations for moderation decisions, and internal review paths. Articles 16, 17, 20, and 21 of the Digital Services Act contain more specific requirements for services within their scope. Applicability and small-business exemptions must be reviewed before launch.

Sources:

- European Commission, "User rights under the Digital Services Act": https://digital-strategy.ec.europa.eu/en/factpages/user-rights-under-digital-services-act
- Regulation (EU) 2022/2065, including Articles 16, 17, 20, 21 and transparency reporting: https://eur-lex.europa.eu/eli/reg/2022/2065/oj/eng

The current in-product safety report is not represented as a complete DSA Article 16 illegal-content notice mechanism. If the service falls within scope, counsel must specify the additional notice fields, acknowledgement, decision, statement-of-reasons, appeal, contact, and transparency requirements.

## Safety principles

- Contain immediate access risk before debating intent.
- Keep reporting easy to find and usable under stress.
- Never reveal who blocked whom.
- Preserve only evidence necessary for a defined purpose and access group.
- Separate allegation, evidence, finding, action, and appeal.
- Explain account or content restrictions without exposing another person's private report.
- Do not promise guaranteed safety, response times, or emergency intervention the operation cannot deliver.

## Priority model

These are internal readiness targets, not public promises.

### Critical

Violence threats, stalking, or suspected underage participation. Immediately revoke shared access where blocking was requested, preserve relevant records, and route to an on-call trained human. Target initial human review: 15 minutes while the service is operating. A launch claiming this target requires staffed coverage and escalation contacts.

### Urgent

Sexual misconduct, hate, and unsafe-event allegations. Contain ongoing exposure, check upcoming shared events, preserve relevant records, and target initial review within four hours.

### Standard

Harassment without an immediate threat, scam, impersonation, no-show, and other conduct. Target initial review within one business day.

Automated priority is routing assistance, not a finding or sanction.

## Case workflow

1. **Intake:** acknowledge the report, issue a case ID, preserve submitted text, and state emergency limitations.
2. **Containment:** apply member-requested block immediately; remove shared requests, seats, room access, and precise-location access.
3. **Triage:** confirm category, urgency, affected upcoming events, jurisdiction, and whether a specialised illegal-content or emergency path is needed.
4. **Evidence:** record sources, timestamps, access, and preservation purpose. Do not ask for identity documents or sensitive media through ordinary support channels.
5. **Investigation:** distinguish reporter statement, system records, subject response, corroboration, and unknowns.
6. **Decision:** choose no action, warning, event removal, feature restriction, temporary suspension, permanent removal, or external escalation under approved policy.
7. **Notice:** communicate the decision and meaningful reasons to affected people without disclosing protected information.
8. **Appeal:** accept a structured challenge, assign a reviewer not responsible for the original decision where practicable, and record whether the decision is upheld, modified, or reversed.
9. **Closure:** apply retention rules, notify required recipients, and include anonymised operational metrics where lawful.

Every state or action change must append to the moderation audit log. Existing audit rows are never edited or deleted through application workflows.

## Evidence handling

- Keep original submissions immutable and store later notes separately.
- Record who accessed or changed a case and why.
- Do not place precise locations, report narratives, or evidence in analytics, logs, tickets, or social tools by default.
- Restrict critical cases to specifically authorised staff.
- Define secure upload, malware scanning, encryption, deletion, and lawful-basis rules before accepting attachments.
- Provide a separate path for law-enforcement or emergency requests; ordinary moderators must not improvise disclosures.

## Appeals

The product needs a decision notice with decision ID, affected rule or legal basis, action, effective period, meaningful explanation, appeal deadline, and appeal route. Appeals need their own status, reviewer, outcome, rationale, and immutable audit event. An appeal never restores contact between blocked members automatically.

The implemented foundation gives a reporter a private Safety Center, displays only a reporter-safe decision summary and named basis, enforces the appeal deadline at the database mutation boundary, accepts one structured appeal per report, and appends appeal creation to the case audit. Role-gated staff can triage, investigate, and issue a final decision that is published in the Safety Center. A different active moderator can review an appeal and publish an upheld, modified, or reversed outcome; both the queue and mutation reject the original decision-maker. Outbound decision delivery and moderator assignment remain unavailable.

## Staffing launch gate

Do not enable open messaging or acquire real event demand until named people own:

- critical and urgent on-call review;
- local emergency and illegal-content escalation references;
- moderation quality review and appeals;
- privacy and evidence requests;
- incident command, security escalation, and executive notification.

## Transparency measures

Track reports by category and priority, median acknowledgement and decision times, actions, appeals, reversals, automated routing use, and unresolved backlog. Publish only sufficiently aggregated statistics that cannot identify reporters, subjects, events, or locations.
