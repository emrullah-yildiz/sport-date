// Pure helpers for tracked, two-way member feedback
// (CX-20260704-feature-member-feedback-tracking-threads).
//
// Kept free of `server-only` / DB / React imports so the honest status lifecycle,
// its labels, the legacy-status normalisation, and comment validation are all
// unit-testable in the node env and shared by the server lib, the routes, and the
// member UI. Product feedback ONLY — safety reports live on the moderation path.

/** The honest, member-visible status lifecycle. No fake "resolved". */
import { resolveTransactionalEmailProvider, type EmailDeliveryEnvironment } from "@/lib/email-provider";

export const MEMBER_FEEDBACK_STATUSES = [
  "received",
  "in_review",
  "planned",
  "in_progress",
  "resolved",
  "closed_not_planned",
] as const;

export type MemberFeedbackStatus = (typeof MEMBER_FEEDBACK_STATUSES)[number];

/** Short label + a plain, honest meaning shown to the member for each status. */
export const MEMBER_FEEDBACK_STATUS_INFO: Readonly<Record<MemberFeedbackStatus, { label: string; meaning: string }>> = {
  received: { label: "Received", meaning: "We have your feedback. No one has looked at it yet." },
  in_review: { label: "In review", meaning: "Someone on the team is reading and understanding it." },
  planned: { label: "Planned", meaning: "We've decided to act on this; it's on our list to build." },
  in_progress: { label: "In progress", meaning: "We're actively working on this now." },
  resolved: { label: "Resolved", meaning: "We've made a change in response to this." },
  closed_not_planned: { label: "Closed — not planned", meaning: "We read this but don't plan to act on it right now, and we'll say why." },
};

export function isMemberFeedbackStatus(value: unknown): value is MemberFeedbackStatus {
  return typeof value === "string" && (MEMBER_FEEDBACK_STATUSES as readonly string[]).includes(value);
}

/**
 * Normalise any stored status (including legacy `open`/`closed`/`in_progress`/
 * `resolved` from migration 012) to a member-visible lifecycle value, so a
 * member never sees a stale internal label. Unknown values fall back to
 * `received` (honest: "we have it, not looked yet").
 */
export function normalizeMemberFeedbackStatus(raw: unknown): MemberFeedbackStatus {
  if (isMemberFeedbackStatus(raw)) return raw;
  if (raw === "open") return "received";
  if (raw === "closed") return "closed_not_planned";
  return "received";
}

// ── Member update notification, built DARK (mirrors the auth/attendance gate) ──

export type FeedbackEmailProvider = "disabled" | "console" | "gmail";
type EmailEnvironment = EmailDeliveryEnvironment;

/**
 * FAIL CLOSED: unless `EMAIL_DELIVERY_ENABLED === "true"` with a provider chosen,
 * feedback-update email is `disabled` and no message ever leaves — only the
 * in-app "heard" indicator updates. Real delivery requires the owner to
 * provision an ESP and flip the flag.
 */
export function resolveFeedbackEmailProvider(env: EmailEnvironment): FeedbackEmailProvider {
  return resolveTransactionalEmailProvider(env);
}

export type FeedbackUpdateDraft = Readonly<{ to: string; subject: string; text: string; trackUrl: string }>;

export function buildFeedbackUpdateEmail(input: {
  origin: string;
  ticketId: string;
  to: string;
  firstName: string;
  summary: string;
  statusLabel: string;
}): FeedbackUpdateDraft {
  const base = input.origin.endsWith("/") ? input.origin.slice(0, -1) : input.origin;
  const trackUrl = `${base}/feedback/${input.ticketId}`;
  return {
    to: input.to,
    subject: `An update on your feedback: ${input.summary}`,
    text: [
      `Hi ${input.firstName},`,
      "",
      `There's an update on the feedback you shared ("${input.summary}").`,
      `Current status: ${input.statusLabel}.`,
      "",
      `See the reply and track it here: ${trackUrl}`,
      "",
      "Thanks for helping shape the experience.",
    ].join("\n"),
    trackUrl,
  };
}

export type FeedbackEmailDispatchResult = Readonly<{ state: "disabled" | "simulated" | "sent"; provider: FeedbackEmailProvider }>;

/**
 * Dispatch the member-update email through the gated seam. DARK by default: the
 * real `send` is NEVER invoked while delivery is off — a logged no-op — so no
 * mail leaves. `console` provider logs a simulation and still does not send.
 */
export async function dispatchFeedbackNotification(
  draft: FeedbackUpdateDraft,
  options: {
    env?: EmailEnvironment;
    send?: (draft: FeedbackUpdateDraft) => Promise<void>;
    log?: (message: string, meta: Record<string, unknown>) => void;
  } = {},
): Promise<FeedbackEmailDispatchResult> {
  const env = options.env ?? {};
  const log = options.log ?? (() => {});
  const provider = resolveFeedbackEmailProvider(env);
  if (provider === "console") {
    log("Simulated feedback-update email (delivery is in console/dark mode)", { to: draft.to, subject: draft.subject });
    return { state: "simulated", provider };
  }
  if (provider === "gmail") {
    if (!options.send) throw new Error("Gmail feedback sender is unavailable.");
    await options.send(draft);
    return { state: "sent", provider };
  }
  log("Feedback-update email suppressed (EMAIL_DELIVERY_ENABLED is not 'true')", { to: draft.to });
  return { state: "disabled", provider };
}

export const FEEDBACK_COMMENT_MAX_LENGTH = 4000;

export type FeedbackCommentValidation =
  | { valid: true; body: string }
  | { valid: false; error: string };

/**
 * Validate a thread reply body: a non-empty, trimmed string within the length
 * cap (mirrors the DB CHECK). Returns the trimmed body so the stored value is
 * minimal and consistent.
 */
export function validateFeedbackComment(raw: unknown): FeedbackCommentValidation {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>).body : raw;
  const body = typeof value === "string" ? value.trim() : "";
  if (body.length === 0) return { valid: false, error: "Write a short reply before sending." };
  if (body.length > FEEDBACK_COMMENT_MAX_LENGTH) {
    return { valid: false, error: `Keep replies to ${FEEDBACK_COMMENT_MAX_LENGTH} characters or fewer.` };
  }
  return { valid: true, body };
}
