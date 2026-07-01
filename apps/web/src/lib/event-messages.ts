import "server-only";

import crypto from "node:crypto";

import { getDatabase } from "@/lib/db";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type EventMessage = Readonly<{
  id: string;
  senderUserId: string;
  senderFirstName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
}>;

type EventMessageRow = {
  id: string;
  sender_user_id: string | number;
  sender_first_name: string;
  body: string;
  created_at: string;
};

/**
 * Server-side room-chat authorization, mirroring `canAccessEventChat` in the
 * domain and the access rule in `getEventRoom`. A viewer may read or post in an
 * event's chat ONLY when they are the host of a published/completed event, or an
 * accepted participant of it (an `event_participants` row). Any other viewer —
 * pending/declined join request, or no relationship — is denied.
 *
 * The mutual-block guard mirrors `getEventRoom`: a non-host viewer who is in a
 * mutual block with the host loses access to the room entirely (the block
 * severs the relationship). Between two participants, block filtering is applied
 * per-message in the read query below, not as a whole-room denial.
 */
export async function canPostEventMessage(eventId: string, userId: string): Promise<boolean> {
  if (!UUID_PATTERN.test(eventId)) return false;
  const sql = getDatabase();
  const rows = await sql`
    SELECT 1
    FROM events
    WHERE events.id = ${eventId}::uuid
      AND events.status IN ('published', 'completed')
      AND (
        events.host_user_id = ${userId}
        OR EXISTS (
          SELECT 1 FROM event_participants
          WHERE event_id = events.id AND user_id = ${userId}
        )
      )
      AND (
        events.host_user_id = ${userId}
        OR NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = ${userId} AND blocked_user_id = events.host_user_id)
             OR (blocker_user_id = events.host_user_id AND blocked_user_id = ${userId})
        )
      )
    LIMIT 1
  `;
  return rows.length > 0;
}

/**
 * Read the chat thread for an event, oldest-first (so the newest sits at the
 * bottom of the rendered log). Returns null when the viewer is NOT authorized
 * (so the caller answers 403/404 without leaking whether messages exist).
 *
 * Block filtering, BOTH directions: a message is hidden from the viewer when the
 * viewer has blocked the sender OR the sender has blocked the viewer — so a
 * mutually-blocked pair never see each other's messages, regardless of who
 * blocked whom. (The sender's own messages are always visible to themselves.)
 */
export async function getEventMessages(eventId: string, userId: string): Promise<EventMessage[] | null> {
  if (!(await canPostEventMessage(eventId, userId))) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT message.id, message.sender_user_id, sender.first_name AS sender_first_name,
      message.body, message.created_at
    FROM event_messages AS message
    JOIN users AS sender ON sender.id = message.sender_user_id AND sender.account_status = 'active'
    WHERE message.event_id = ${eventId}::uuid
      AND (
        message.sender_user_id = ${userId}
        OR NOT EXISTS (
          SELECT 1 FROM user_blocks
          WHERE (blocker_user_id = ${userId} AND blocked_user_id = message.sender_user_id)
             OR (blocker_user_id = message.sender_user_id AND blocked_user_id = ${userId})
        )
      )
    ORDER BY message.created_at ASC, message.id ASC
    LIMIT 200
  ` as unknown as EventMessageRow[];
  return rows.map((row) => ({
    id: row.id,
    senderUserId: String(row.sender_user_id),
    senderFirstName: row.sender_first_name,
    body: row.body,
    createdAt: row.created_at,
    isMine: String(row.sender_user_id) === String(userId),
  }));
}

/**
 * Persist a chat message after re-checking authorization on the write path
 * (never trust that the caller already gated). Returns null when the viewer is
 * not authorized to post in this event. `body` MUST already be validated and
 * trimmed by the caller (`validateEventMessage`); the DB length CHECK is the
 * final backstop.
 */
export async function postEventMessage(
  eventId: string,
  userId: string,
  body: string,
): Promise<EventMessage | null> {
  if (!(await canPostEventMessage(eventId, userId))) return null;
  const sql = getDatabase();
  const id = crypto.randomUUID();
  const rows = await sql`
    WITH inserted AS (
      INSERT INTO event_messages (id, event_id, sender_user_id, body)
      VALUES (${id}::uuid, ${eventId}::uuid, ${userId}, ${body})
      RETURNING id, sender_user_id, body, created_at
    )
    SELECT inserted.id, inserted.sender_user_id, sender.first_name AS sender_first_name,
      inserted.body, inserted.created_at
    FROM inserted
    JOIN users AS sender ON sender.id = inserted.sender_user_id
  ` as unknown as EventMessageRow[];
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    senderUserId: String(row.sender_user_id),
    senderFirstName: row.sender_first_name,
    body: row.body,
    createdAt: row.created_at,
    isMine: true,
  };
}
