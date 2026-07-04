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
