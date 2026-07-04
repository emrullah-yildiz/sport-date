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
