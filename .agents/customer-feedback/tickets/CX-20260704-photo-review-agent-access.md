# CX-20260704-photo-review-agent-access

- Status: `ready`
- Severity: `medium`
- Priority: `P1` — makes the owner-requested photo-review AGENT (`.claude/agents/photo-moderator.md`) able to actually clear the pending photo queue. Without it, new photos are held pending with no reviewer, so they never become visible to others.
- Customer journey: a member uploads a photo → held pending by the nudity block → the AI photo-moderator agent views it and approves/rejects → clean photos become visible.
- Surface: internal moderation API (built for `CX-20260704-feature-image-moderation-nudity-block`)
- Environment and viewport/device: server
- Found by: Owner directive (2026-07-04) "create an agent to review and approve photos"
- Implementation owner: `agent`
- Builds on: the image-moderation seam (migration 035, `lib/image-moderation.ts`, the internal approve/reject route behind `MODERATION_AGENT_SECRET`).

## Task

Expose exactly enough of the internal moderation surface for an authenticated agent to review pending photos end-to-end, behind the existing `MODERATION_AGENT_SECRET` bearer (fail-closed).

## Acceptance criteria

- **List pending:** an internal `GET` returns the pending photo queue (ids + minimal metadata; no member PII beyond what moderation needs).
- **View the image:** the agent can retrieve the actual pending image bytes for review — either an **agent-authenticated** internal image endpoint (MODERATION_AGENT_SECRET bearer) or a **short-lived signed URL** per pending photo. Pending images must NOT be publicly viewable (the public serve route still gates on `approved`); only the secret-bearing agent can fetch them.
- **Approve / reject:** the existing internal approve/reject endpoint sets `moderation_status` and, on reject, ensures the image is not served + the member gets a calm, non-shaming notice; on approve, it becomes visible.
- All three require the secret; unauthorised → 401. No image bytes or member PII logged.
- typecheck/lint/test/prod build green; tests cover: secret-required on all three, view returns bytes only with the secret, approve→visible, reject→not served.
- Docs: document the agent-review contract (list → view → decide) in the moderation docs so the `photo-moderator` agent can follow it.

## Guardrails

- Pending images are sensitive: serve them ONLY to the secret-bearing internal caller, never publicly, never logged; short TTL on any signed URL.
- Automated review is assistive — keep the human queue/escalation path for "uncertain".

## Process

- Likely no migration. If needed → commit-not-push + report number. `git pull --rebase`. Full DoD. Don't touch `public/*.html` or `docs/marketing/**`.
