import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { resolveTransactionalEmailProvider, type EmailDeliveryEnvironment } from "@/lib/email-provider";

export type JoinRequestDecision = "accepted" | "declined";

export type JoinRequestDecisionEmail = Readonly<{
  to: string;
  subject: string;
  text: string;
  html: string;
  actionUrl: string;
  decision: JoinRequestDecision;
}>;

type JoinRequestDecisionEmailInput = Readonly<{
  origin: string;
  eventId: string;
  decision: JoinRequestDecision;
  to: string;
  firstName: string;
  sport: string;
  areaLabel: string;
  city: string;
  whenLabel: string;
}>;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function eventUrl(origin: string, eventId: string, decision: JoinRequestDecision): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return decision === "accepted"
    ? `${base}/events/${encodeURIComponent(eventId)}/room`
    : `${base}/discover/events/${encodeURIComponent(eventId)}`;
}

/**
 * Builds a dignity-preserving decision email. It deliberately receives only the
 * public area: the exact meeting address stays behind authenticated room access.
 * Decline copy never reveals skip counts, reasons, or host activity.
 */
export function buildJoinRequestDecisionEmail(input: JoinRequestDecisionEmailInput): JoinRequestDecisionEmail {
  const actionUrl = eventUrl(input.origin, input.eventId, input.decision);
  const area = input.areaLabel && input.city && input.areaLabel.toLowerCase() !== input.city.toLowerCase()
    ? `${input.areaLabel}, ${input.city}`
    : input.areaLabel || input.city;
  const eventSummary = `${input.sport} · ${input.whenLabel}`;

  if (input.decision === "accepted") {
    return {
      to: input.to,
      decision: input.decision,
      subject: `You're in: ${eventSummary}`,
      actionUrl,
      text: [
        `Hi ${input.firstName},`,
        "",
        `Good news — your request to join ${input.sport} was approved.`,
        `When: ${input.whenLabel}`,
        `Approximate area: ${area}`,
        "",
        `Open the event room for the private meeting point and arrival details: ${actionUrl}`,
        "Please keep those private details within the accepted group.",
        "",
        `Questions? ${SUPPORT_EMAIL}`,
      ].join("\n"),
      html: [
        `<p>Hi ${escapeHtml(input.firstName)},</p>`,
        `<p>Good news — your request to join <strong>${escapeHtml(input.sport)}</strong> was approved.</p>`,
        `<p><strong>When:</strong> ${escapeHtml(input.whenLabel)}<br/><strong>Approximate area:</strong> ${escapeHtml(area)}</p>`,
        `<p><a href="${escapeHtml(actionUrl)}">Open the event room</a> for the private meeting point and arrival details.</p>`,
        "<p>Please keep those private details within the accepted group.</p>",
        `<p>Questions? <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a></p>`,
      ].join(""),
    };
  }

  return {
    to: input.to,
    decision: input.decision,
    subject: `Update on your ${input.sport} request`,
    actionUrl,
    text: [
      `Hi ${input.firstName},`,
      "",
      `Your request to join ${input.sport} is now closed, so you do not have a place at this event.`,
      `When: ${input.whenLabel}`,
      `Approximate area: ${area}`,
      "",
      "Hosts make choices for many practical reasons. We keep their reasons and request history private.",
      `View the request in ${BRAND_NAME}: ${actionUrl}`,
      "",
      `Questions? ${SUPPORT_EMAIL}`,
    ].join("\n"),
    html: [
      `<p>Hi ${escapeHtml(input.firstName)},</p>`,
      `<p>Your request to join <strong>${escapeHtml(input.sport)}</strong> is now closed, so you do not have a place at this event.</p>`,
      `<p><strong>When:</strong> ${escapeHtml(input.whenLabel)}<br/><strong>Approximate area:</strong> ${escapeHtml(area)}</p>`,
      "<p>Hosts make choices for many practical reasons. We keep their reasons and request history private.</p>",
      `<p><a href="${escapeHtml(actionUrl)}">View your request in ${escapeHtml(BRAND_NAME)}</a></p>`,
      `<p>Questions? <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a></p>`,
    ].join(""),
  };
}

export async function dispatchJoinRequestDecisionEmail(
  draft: JoinRequestDecisionEmail,
  options: {
    env?: EmailDeliveryEnvironment;
    send?: (draft: JoinRequestDecisionEmail) => Promise<void>;
    log?: (message: string, meta: Record<string, unknown>) => void;
  } = {},
): Promise<{ state: "disabled" | "simulated" | "sent"; provider: "disabled" | "console" | "gmail" }> {
  const env = options.env ?? process.env;
  const provider = resolveTransactionalEmailProvider(env);
  const log = options.log ?? ((message, meta) => console.info(message, meta));

  if (provider === "console") {
    log("Simulated join-request decision email", {
      to: draft.to,
      subject: draft.subject,
      decision: draft.decision,
      actionUrl: draft.actionUrl,
    });
    return { state: "simulated", provider };
  }
  if (provider === "gmail") {
    if (!options.send) throw new Error("Gmail join-request sender is unavailable.");
    await options.send(draft);
    return { state: "sent", provider };
  }
  log("Join-request decision email suppressed (email delivery is disabled)", {
    to: draft.to,
    decision: draft.decision,
  });
  return { state: "disabled", provider };
}
