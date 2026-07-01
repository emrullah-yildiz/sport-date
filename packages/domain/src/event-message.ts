// Pure domain rules for event-room chat messages
// (CX-20260702-event-room-chat-for-accepted-participants).
//
// These helpers carry the product rules that BOTH the API route and its tests
// depend on, with no I/O: what counts as a postable message (non-empty after
// trimming, within the length cap) and who is allowed to read/post in a room
// (only the host or an ACCEPTED participant — never pending, declined, or a
// non-participant). Keeping them here means the authorization predicate is
// unit-tested independently of the database, and the SQL guard in the lib
// mirrors this same rule so the two cannot drift.

export const EVENT_MESSAGE_MAX_LENGTH = 1000;

export type EventMessageValidation =
  | { valid: true; body: string }
  | { valid: false; error: string };

/**
 * Validate a chat message body. Rejects a non-string, an empty / whitespace-only
 * message, and anything longer than the length cap. Returns the trimmed body on
 * success so the stored value is minimal and consistent with the DB length check.
 */
export function validateEventMessage(raw: unknown): EventMessageValidation {
  const value = raw && typeof raw === "object" ? (raw as Record<string, unknown>).body : raw;
  const body = typeof value === "string" ? value.trim() : "";
  if (body.length === 0) return { valid: false, error: "Write a short message before sending." };
  if (body.length > EVENT_MESSAGE_MAX_LENGTH) {
    return { valid: false, error: `Keep messages to ${EVENT_MESSAGE_MAX_LENGTH} characters or fewer.` };
  }
  return { valid: true, body };
}

/**
 * The single room-chat authorization rule, mirrored by the SQL guard in
 * `@/lib/event-messages`. A viewer may read AND post in an event room's chat only
 * when they are the host of that event, or an accepted participant of it. Every
 * other relationship — a pending or declined join request, or no relationship at
 * all — is denied. (Block-filtering is applied separately, on top of this.)
 */
export type EventRoomChatRelationship = "host" | "accepted" | "pending" | "declined" | "none";

export function canAccessEventChat(relationship: EventRoomChatRelationship): boolean {
  return relationship === "host" || relationship === "accepted";
}
