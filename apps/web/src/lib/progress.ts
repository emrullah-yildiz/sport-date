import "server-only";

import { calculateMovementProgress, type MovementProgress } from "@sport-date/domain";

import { getDatabase } from "@/lib/db";

export type MemberMovementProgress = MovementProgress & Readonly<{
  hostedMoves: number;
  joinedMoves: number;
  recentMoves: ReadonlyArray<{ eventId: string; title: string; sport: string; startsAt: string; role: "host" | "participant" }>;
}>;

type ProgressCountRow = { attended_moves: number; hosted_moves: number; joined_moves: number };
type RecentMoveRow = { event_id: string; title: string; sport: string; starts_at: string; role: "host" | "participant" };

export async function getMemberMovementProgress(userId: string): Promise<MemberMovementProgress> {
  const sql = getDatabase();
  const countRows = await sql`
    SELECT
      COUNT(*)::integer AS attended_moves,
      COUNT(*) FILTER (WHERE events.host_user_id = ${userId})::integer AS hosted_moves,
      COUNT(*) FILTER (WHERE events.host_user_id <> ${userId})::integer AS joined_moves
    FROM event_reflections AS reflection
    JOIN events ON events.id = reflection.event_id
    WHERE reflection.user_id = ${userId} AND reflection.attendance = 'attended'
      AND reflection.qualified_for_progress = TRUE
  ` as unknown as ProgressCountRow[];
  const recentRows = await sql`
    SELECT events.id AS event_id, events.title, events.sport, events.starts_at,
      CASE WHEN events.host_user_id = ${userId} THEN 'host' ELSE 'participant' END AS role
    FROM event_reflections AS reflection
    JOIN events ON events.id = reflection.event_id
    WHERE reflection.user_id = ${userId} AND reflection.attendance = 'attended'
      AND reflection.qualified_for_progress = TRUE
    ORDER BY events.starts_at DESC LIMIT 3
  ` as unknown as RecentMoveRow[];
  const counts = countRows[0] ?? { attended_moves: 0, hosted_moves: 0, joined_moves: 0 };
  return {
    ...calculateMovementProgress(counts.attended_moves),
    hostedMoves: counts.hosted_moves,
    joinedMoves: counts.joined_moves,
    recentMoves: recentRows.map((row) => ({
      eventId: row.event_id, title: row.title, sport: row.sport,
      startsAt: row.starts_at, role: row.role,
    })),
  };
}
