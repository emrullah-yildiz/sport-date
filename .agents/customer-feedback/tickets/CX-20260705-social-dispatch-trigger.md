# CX-20260705-social-dispatch-trigger

- Status: `implemented`
- Severity: `medium`
- Priority: `P1` — owner-directed (2026-07-05): "add a trigger to the webpage for posts so that you can start immediately when I finish my review." A button on the approval page that signals the CEO to schedule the approved posts right away, instead of waiting for the periodic loop.
- Surface: `/social-approve.html` + a new owner-gated dispatch endpoint.
- Implementation owner: `agent`

## Goal

Give the owner a one-click "I'm done reviewing — publish my approved posts" trigger on the approval page. Clicking it records a dispatch request the CEO loop picks up on its next check (and can react to quickly), so scheduling starts promptly after review rather than on a fixed timer.

## Behavior

- **Page:** add a prominent primary button on `/social-approve.html` — "✅ Done reviewing — schedule my approved posts (N)" where N = count of `status='approved' AND scheduled_ref IS NULL`. Disabled (with a hint) when N=0. On click → POST the dispatch, then show a calm confirmation ("Sent — your CEO is scheduling your approved posts now.") and refresh counts. Owner-gated like the rest of the page (401/403 → sign-in note).
- **Endpoint `POST /api/social/dispatch`** — OWNER-GATED (same `OWNER_EMAILS` gate). Records a dispatch request: create a `social_dispatch_requests` row `(id uuid pk default gen_random_uuid(), requested_by text, requested_at timestamptz default now(), handled_at timestamptz)`. Return `{ ok:true, approvedUnscheduled: N }`.
- **Endpoint `GET /api/social/dispatch`** — INTERNAL, secret-guarded via `SOCIAL_AGENT_SECRET` (reuse `isAuthorizedSocialAgent`). Returns the latest UNHANDLED request (or null) so the CEO loop can detect "the owner clicked go." Also support `POST /api/social/dispatch/handled` (internal) OR a `?markHandled=<id>` to stamp `handled_at` — pick the cleaner shape and document it. Fail-closed if the secret is unset.

## DoD

- typecheck / lint / test / prod build green. Tests: owner-gating (non-owner 403), POST records a row + returns the approved-unscheduled count, internal GET returns latest unhandled + hides handled ones, internal secret fail-closed.
- Adds a migration → **commit but DO NOT push**; report the filename. `git pull --rebase` first. Do NOT touch other `public/*.html` beyond `social-approve.html`, or `docs/marketing/**`. Run the FULL web suite before finishing. Update this ticket's Handoff log + set Status `implemented` (leave the ticket edit unstaged).

## Handoff log

- 2026-07-05 | ceo | filed. Reuses OWNER_EMAILS + SOCIAL_AGENT_SECRET from the approval-queue work. Ready for Builder.
- 2026-07-05 | builder | implemented. Migration `040_social_dispatch_requests.sql` (id/requested_by/requested_at/handled_at + partial index on unhandled) — committed, NOT pushed. New data layer `src/lib/social-dispatch.ts` (countApprovedUnscheduled, recordDispatchRequest, latestUnhandledDispatch, markDispatchHandled). Routes under `src/app/api/social/dispatch/`: owner-gated `POST` (records request via getCurrentUser+OWNER_EMAILS, returns `{ok,approvedUnscheduled}`, 201), secret-guarded `GET` (isAuthorizedSocialAgent → latest unhandled or null), secret-guarded `POST /handled` ({id} → stamps handled_at; chose a dedicated route over ?markHandled= to keep the mutating internal call separate from the owner POST). All three fail closed when SOCIAL_AGENT_SECRET is unset. `social-approve.html`: full-width primary "✅ Done reviewing — schedule my approved posts (N)" banner above the filter bar — N = approved ideas with null scheduledRef (from the owner-gated ideas list), disabled at N=0 with a hint, POSTs on click, shows a calm confirmation that survives the auto-refresh; signed-out degradation unchanged. typecheck + full web suite (1037 passed / 12 skipped, incl. 15 new dispatch tests) + prod build all green. Committed with migration, NOT pushed — CEO orchestrates deploy.
