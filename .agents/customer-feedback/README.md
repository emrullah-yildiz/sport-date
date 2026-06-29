# Customer feedback queue

This directory is the repository-local handoff between customer-perspective testing and implementation. It records simulated usability findings from local or isolated test environments. It is not a support system, a safety-report channel, or evidence from real customers.

## Queue layout

- New tickets live in `.agents/customer-feedback/tickets/`.
- Copy `.agents/customer-feedback/ticket-template.md` for each finding.
- Name tickets `CX-YYYYMMDD-short-customer-outcome.md`. If two tickets would receive the same name, append `-2`, `-3`, and so on.
- Keep screenshots and large recordings out of Git by default. Prefer a redacted text description. If a repository-safe artifact is essential, place it beside the ticket and link it.

## Status flow

`draft` -> `ready` -> `in-progress` -> `implemented` -> `verified`

Use `blocked-owner` only when the repository escalation policy requires an owner decision. Use `wont-fix` only with a short recorded product rationale. Reopen a failed retest by returning the ticket to `ready` and appending the new observation; do not erase history.

## Duplicate check

Before creating a ticket, search open and recently verified tickets for:

- the journey and customer goal;
- visible copy or error text;
- expected and observed outcomes;
- surface, route, screen, or likely component.

Treat two reports as duplicates when the same product change and acceptance test would resolve both. Add the new surface, scenario, and evidence to the existing ticket. Similar symptoms with different safety boundaries or independently testable outcomes remain separate.

## Handoff rules

The customer agent owns reproduction, customer impact, acceptance criteria, deduplication, and retesting. The implementation agent owns diagnosis, product changes, tests, and relevant documentation. The implementation agent must not mark its own work `verified`.

Tickets must not contain personal data, credentials, session values, precise meeting locations, private report narratives, or unredacted member identifiers. A real member support or safety concern belongs in the approved restricted operational system, never this Git queue.

## Triage order

1. Authorization, precise-location exposure, blocking/reporting failures, or unsafe recovery.
2. Journeys that prevent a customer from safely joining, hosting, coordinating, cancelling, or leaving.
3. Accessibility and mobile event-day failures.
4. Misleading expectations, dead ends, and trust-eroding errors.
5. Minor clarity, layout, and polish issues.

Within a tier, prefer the smallest change that restores the complete customer outcome without weakening product safeguards.
