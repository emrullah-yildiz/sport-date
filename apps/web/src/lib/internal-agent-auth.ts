import "server-only";

// Shared bearer-secret guard for the internal feedback agent/admin API
// (CX-20260704-feature-member-feedback-tracking-threads). Mirrors the cron
// pattern: authorise `Authorization: Bearer ${FEEDBACK_AGENT_SECRET}` and FAIL
// CLOSED when the secret is unset — a misconfigured deploy never exposes an
// unauthenticated write path, and a member (who never holds the secret) can
// never reach it to post as "team" or change a status.
export function isAuthorizedFeedbackAgent(request: Request): boolean {
  const secret = process.env.FEEDBACK_AGENT_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Same fail-closed guard for the internal photo-moderation actions
 * (CX-20260704-feature-image-moderation-nudity-block): approve/reject a photo
 * held for review. Bearer `MODERATION_AGENT_SECRET`; refuses when unset, so a
 * misconfigured deploy never exposes an unauthenticated moderation trigger and
 * members (who never hold the secret) can't approve or reject photos.
 */
export function isAuthorizedModerationAgent(request: Request): boolean {
  const secret = process.env.MODERATION_AGENT_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Same fail-closed guard for the internal social-content seed path
 * (CX-20260705-social-content-approval-queue): the CEO/growth agent POSTs post
 * ideas into the owner approval queue. Bearer `SOCIAL_AGENT_SECRET`; refuses
 * when unset, so a misconfigured deploy never exposes an unauthenticated write
 * path and members (who never hold the secret) can never seed the queue.
 */
export function isAuthorizedSocialAgent(request: Request): boolean {
  const secret = process.env.SOCIAL_AGENT_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Fail-closed guard for publishing the daily standup report (owner request
 * 2026-07-07: the report must land on /hq.html as soon as the routine
 * finishes, without a git push). Accepts the dedicated `STANDUP_AGENT_SECRET`
 * (held only by the cloud standup routine — its blast radius is one internal
 * ops page, nothing member-facing) OR `SOCIAL_AGENT_SECRET` so the local CEO
 * loop can publish a fallback report without new configuration. Refuses when
 * neither secret is set.
 */
export function isAuthorizedStandupPublisher(request: Request): boolean {
  const header = request.headers.get("authorization");
  if (!header) return false;
  const standup = process.env.STANDUP_AGENT_SECRET;
  if (standup && header === `Bearer ${standup}`) return true;
  return isAuthorizedSocialAgent(request);
}
