import "server-only";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { getDatabase } from "@/lib/db";
import { sendGmailEmail } from "@/lib/gmail-email-delivery";
import {
  buildJoinRequestDecisionEmail,
  dispatchJoinRequestDecisionEmail,
  type JoinRequestDecision,
} from "@/lib/join-request-notification";

type DecisionEmailRow = {
  email: string;
  first_name: string;
  sport: string;
  public_area_label: string;
  public_city: string;
  starts_at: string;
  time_zone: string;
};

function formatWhen(startsAt: string, timeZone: string): string {
  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "Event time available in the app";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone,
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
      timeZone: "UTC",
    }).format(date);
  }
}

/**
 * Best-effort post-commit notification. A provider failure never rolls back or
 * misreports the host's completed decision; the member's in-app state remains
 * authoritative. The query deliberately excludes event_private_locations.
 */
export async function notifyRequesterOfJoinDecision(
  eventId: string,
  requestId: string,
  decision: JoinRequestDecision,
): Promise<void> {
  try {
    const sql = getDatabase();
    const rows = await sql`
      SELECT requester.email, requester.first_name, event.sport,
        event.public_area_label, event.public_city, event.starts_at, event.time_zone
      FROM join_requests AS request
      JOIN users AS requester ON requester.id = request.requester_user_id
      JOIN events AS event ON event.id = request.event_id
      WHERE request.id = ${requestId}::uuid
        AND request.event_id = ${eventId}::uuid
        AND request.status = ${decision}
      LIMIT 1
    ` as unknown as DecisionEmailRow[];
    const row = rows[0];
    if (!row) return;

    const draft = buildJoinRequestDecisionEmail({
      origin: resolveAuthEmailOrigin() ?? "https://keepitup.social",
      eventId,
      decision,
      to: row.email,
      firstName: row.first_name,
      sport: row.sport,
      areaLabel: row.public_area_label,
      city: row.public_city,
      whenLabel: formatWhen(row.starts_at, row.time_zone),
    });
    await dispatchJoinRequestDecisionEmail(draft, {
      send: async (email) => { await sendGmailEmail(email); },
    });
  } catch (error) {
    console.error("Join-request decision notification failed (non-fatal):", error);
  }
}
