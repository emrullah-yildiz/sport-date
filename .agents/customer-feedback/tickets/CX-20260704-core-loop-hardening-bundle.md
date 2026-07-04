# CX-20260704-core-loop-hardening-bundle

- Status: `ready`
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
