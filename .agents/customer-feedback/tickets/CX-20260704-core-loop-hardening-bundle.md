# CX-20260704-core-loop-hardening-bundle

- Status: `implemented`
- Severity: `medium`
- Priority: `P3` — a bundle of small, high-confidence hardening fixes from the core-path audit (2026-07-04). Do together; each is low-risk.
- Implementation owner: `agent`

## Items

1. **Public invite: show eligibility, don't silently no-op "Request a place."** `getDiscoverableEvent` (`events.ts:261-304`) gates only on published+block, but `createEventJoinRequest` (`join-requests.ts:93-108`) still enforces age/language/capacity. A directly-opened `/discover/events/{id}` link for an age-excluded or full event renders "Request a place" that returns `null` on tap. Fix: compute + return an `eligibility` reason (age / full / language) on the direct view and render a disabled state with clear copy — the CTA never silently fails.

2. **Rate-limit the public attendance token endpoint + tighten the token.** `api/attendance/route.ts` has no `enforceRateLimit` (unlike `api/auth/*`), and the token rides in `?t=` (referrer/history/log exposure). Fix: add a modest per-IP/per-token rate limit; consider invalidating the token after a successful CANCEL (confirm stays idempotent). Entropy already makes enumeration infeasible — this is bounded hardening.

3. **GDPR export completeness.** `api/account/export/route.ts` omits the member's own `event_attendance_confirmations` (their confirm/cancel history) and their reliability fields (`late_cancellation_streak*`, `reliability_paused_until` on `users`). Both are the member's own personal data (Art. 15). Fix: add both to the export payload. (Erasure already cascades — fine.)

4. **Discovery: don't surface a full event a member can't re-request.** `events.ts:211-214` keeps a full event visible whenever `member_request.id IS NOT NULL` regardless of status, but re-request needs `COUNT(*) < capacity`. A member who cancelled a pending request on an event that then filled sees it but can't re-join. Fix: scope the capacity exemption to `status IN ('pending','accepted')`.

## DoD
- typecheck/lint/test/prod build green; add/adjust tests per item (eligibility reason, rate-limit path, export includes the new datasets, stale-request discovery). Likely no migration. `git pull --rebase`. Commit AND push. Don't touch public/*.html or docs/marketing/**.

## Handoff log

- 2026-07-04 | build | picked up, status → `in-progress` (Experience Build Agent).
- 2026-07-04 | build | implemented, status → `implemented`. Item 1: added `computeJoinEligibility` (pure mirror of the createEventJoinRequest silent-bar reasons: past/age/language/full) + `JoinEligibility` on `DiscoveryEventView`; `getDiscoverableEvent` now SELECTs candidate.languages and returns the reason (host is always "eligible" — they manage, never request); `JoinRequestControls` renders an honest disabled "You can't request a place here" state for age/language/past (full still handled by the existing isFull state) so the CTA never silently no-ops. Item 2: `/api/attendance` now calls `enforceRateLimit` with a new `attendanceActionRateLimitRules` (20/IP-hr + 10/token-hr); JSON gets 429+Retry-After, the no-JS form redirects back to the landing page. Deliberately did NOT null the token on cancel — the cancelled row is terminal and confirm-on-cancelled is already rejected, so nulling would only break idempotent re-cancels for no security gain (documented in code); the per-token limit is the token-tightening. Item 3: GDPR export now includes the member's own `event_attendance_confirmations` (event_id/status/reminded_at/responded_at/created_at — never the token hash) and their private reliability fields (late_cancellation_streak + started_at + reliability_paused_until) under `account.reliability`. Item 4: discovery capacity exemption scoped from `member_request.id IS NOT NULL` to `member_request.status IN ('pending','accepted')`, so a full event no longer dangles a doomed re-request to a member who cancelled/was-declined. Checks: typecheck/lint (pre-existing warnings only)/test (web 994 pass/12 skip; +14 tests: computeJoinEligibility unit set, direct-view eligibility, capacity-scope, attendance 429, export completeness)/production build green. No migration. Pushed to origin/main.
