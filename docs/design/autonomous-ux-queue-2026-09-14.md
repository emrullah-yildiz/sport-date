# Next product experience iterations

Owner renewed continuous local product, UX and UI iteration on September 14. These are code-review findings, not user-research results. Confirm each trigger with a focused reproduction before changing it. Pending business decisions do not block this queue. Keep completed work and production availability separate.

## Completed locally: keyboard continuity during signup

Implemented in main commit 3679cbf; not yet deployed. Full web suite (1,190 tests), typecheck, lint and production build passed; ten-step mobile browser checks passed in normal and reduced motion with API mutations intercepted.

Original issue: changing signup steps leaves focus on the persistent Next button, causing the next Tab to skip the new question. Move focus to the new step heading and support form submission from text steps without changing validation, consent or account-creation rules. Correct the login introduction's obsolete claim that events arrive in a future slice. Verify forward/back navigation, invalid input, mobile and reduced motion without creating accounts.

## Next: complete chat safety reporting

`apps/web/src/components/EventRoomChat.tsx` has a separate report dialog. On report-plus-block success it ignores `sharedUpcomingEvents` and reloads. Reuse the behavior in `ReportSafetyControls.tsx`: explain remaining shared third-party events and offer the existing optional safety exit. Never force cancellation or weaken report/block authorization.

The dialog accepts 2,000 typed characters and prepends quoted message evidence, but domain validation caps the combined details at 2,000. Make the actual budget clear, prevent avoidable rejection, and preserve evidence and the member's explanation without silent truncation. Test maximum lengths, successful report/block with shared events, failed report, optional exit and accessible confirmation. Use mocked responses; no production reports or messages.

## Then: recoverable host editing

`HostEditEventForm.tsx` silently disables saving when no experience levels are selected, exposes only the first server error, and reloads away successful-save feedback. Inspect the event timezone handling: editing from a device in another timezone appears to replace the original event timezone even for a copy-only edit. Preserve the original event timezone and instant unless intentionally changed, explain invalid selections, associate server errors with fields and retain clear saved feedback. Reuse creation recovery patterns. Test a device in another timezone, all-level deselection, server errors and mobile keyboard recovery.

## Then: honest event-day connection state

After an initial successful chat load, polling failures leave old messages looking current. Failed message deletion is silently swallowed. Retain thread and draft, show a calm stale/connection state after a bounded failure threshold, allow retry, announce recovery and explain failed deletion. Preserve revoked-access behavior and avoid moving readers away from earlier messages. Test offline/reconnect, authorization loss and deletion failure.

Each completed slice needs relevant tests and typechecks, mobile/keyboard inspection, a concise HQ evidence update and an explicit next outcome. Separate local implementation from production release approval. Reprioritize from newly verified material defects; do not repeat completed audits simply to fill a cycle.
