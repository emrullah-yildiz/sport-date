# CX-20260702-mobile-cancel-route-not-resilience-hardened

- Status: `ready`
- Severity: `low`
- Priority: `P3` — (Reach 2 × Impact 3 × Confidence 4) / Effort 2 = 12. Parity/hardening follow-up: the web cancel/leave DELETE route was hardened (calm JSON error, never raw empty-500) in `CX-20260702-cancel-join-request-500-member-stuck-cancelling` (verified), but the mobile route using the same `cancelEventJoinRequest` was out of that ticket's scope. No known live failure today (029 is applied to prod+dev), so this is defensive parity, not an active break.
- Customer journey: commit — cancel/leave (mobile surface)
- Surface: `web` (`apps/web/src/app/api/mobile/events/[eventId]/requests/[requestId]/route.ts`)
- Found by: Tester (four-agent loop) during verification of the web cancel-resilience ticket, 2026-07-02
- Related tickets: `CX-20260702-cancel-join-request-500-member-stuck-cancelling` (verified — hardened the WEB route + both web UI surfaces; this extends the same guarantee to the mobile route)

## What I observed

The mobile cancel/leave route `api/mobile/events/[eventId]/requests/[requestId]/route.ts` calls the same `cancelEventJoinRequest` as the web route, but was not part of the web resilience-hardening unit. If that function ever throws (e.g. a future missing-column/deploy-ordering hazard, or a transient DB error), the mobile route may return a raw/unshaped 500 rather than the calm JSON `{error}` contract the web route now guarantees, and any mobile client would have no readable recovery message.

## What I expected

The mobile cancel/leave route wraps its handler in the same try/catch and returns the same calm JSON error contract (503 for DatabaseNotConfigured, 500 otherwise) with no internals/IDs/stack leaked, so mobile clients get a readable, recoverable failure and the pattern can't drift between surfaces.

## Acceptance criteria

- [ ] The mobile cancel/leave DELETE route never returns a raw empty-body 500; on any throw it returns a calm JSON `{error}` with an appropriate status, logged server-side only (redacted — no event/request/user IDs, no stack).
- [ ] Success behaviour and any mobile auth/response contract are unchanged; graceful-exit reason/note passthrough preserved; anti-enumeration/security untouched.
- [ ] A route test covers the DB-error → readable-JSON (not empty-500) path. Repository checks pass incl. production build.
- [ ] Consider sharing a single error-wrapping helper between the web and mobile routes so the contract can't diverge (implementer's call).

## Duplicate check

- Search terms: `mobile`, `cancelEventJoinRequest`, `requests/[requestId]`, `cancel route`.
- Tickets reviewed: the verified web cancel-resilience ticket (web route + web UI only), the cancel-500 ticket, graceful-exit.
- Why new: no ticket covers the mobile route's error contract; the web hardening explicitly excluded it.

## Handoff and retest log

- 2026-07-02 - Filed by the Tester as an out-of-scope parity follow-up noted while verifying the web cancel-resilience ticket; status `ready`.
