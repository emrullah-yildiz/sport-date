import "server-only";

import { getDatabase } from "@/lib/db";
import { getCurrentUser, type SessionUser } from "@/lib/session";

export type ModeratorSession = Readonly<{
  user: SessionUser;
  roles: ReadonlyArray<"moderator" | "safety_admin">;
}>;

export type ModerationQueueCase = Readonly<{
  id: string;
  category: string;
  details: string;
  status: "open" | "triaged" | "investigating" | "actioned" | "dismissed";
  priority: "standard" | "urgent" | "critical";
  createdAt: string;
  reporter: { id: string; firstName: string } | null;
  subject: { id: string; firstName: string } | null;
  event: { id: string; title: string; sport: string; city: string; area: string } | null;
}>;

type RoleRow = { role: ModeratorSession["roles"][number] };
type QueueRow = {
  id: string; category: string; details: string; status: ModerationQueueCase["status"];
  priority: ModerationQueueCase["priority"]; created_at: string;
  reporter_user_id: string | number | null; reporter_first_name: string | null;
  reported_user_id: string | number | null; subject_first_name: string | null;
  event_id: string | null; event_title: string | null; event_sport: string | null;
  public_city: string | null; public_area_label: string | null;
};

export async function getModeratorSession(): Promise<ModeratorSession | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT role FROM user_roles
    WHERE user_id = ${user.id} AND revoked_at IS NULL
      AND role IN ('moderator', 'safety_admin')
    ORDER BY role
  ` as unknown as RoleRow[];
  if (rows.length === 0) return null;
  return { user, roles: rows.map((row) => row.role) };
}

export async function getModerationQueue(moderator: ModeratorSession): Promise<ModerationQueueCase[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT report.id, report.category, report.details, report.status, report.priority, report.created_at,
      report.reporter_user_id, reporter.first_name AS reporter_first_name,
      report.reported_user_id, subject.first_name AS subject_first_name,
      events.id AS event_id, events.title AS event_title, events.sport AS event_sport,
      events.public_city, events.public_area_label
    FROM safety_reports AS report
    LEFT JOIN users AS reporter ON reporter.id = report.reporter_user_id
    LEFT JOIN users AS subject ON subject.id = report.reported_user_id
    LEFT JOIN events ON events.id = report.event_id
    WHERE EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = ${moderator.user.id} AND revoked_at IS NULL
        AND role IN ('moderator', 'safety_admin')
    )
    ORDER BY
      CASE report.status WHEN 'open' THEN 0 WHEN 'triaged' THEN 1 WHEN 'investigating' THEN 2 ELSE 3 END,
      CASE report.priority WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
      report.created_at
    LIMIT 100
  ` as unknown as QueueRow[];
  return rows.map((row) => ({
    id: row.id, category: row.category, details: row.details, status: row.status,
    priority: row.priority, createdAt: row.created_at,
    reporter: row.reporter_user_id && row.reporter_first_name
      ? { id: String(row.reporter_user_id), firstName: row.reporter_first_name }
      : null,
    subject: row.reported_user_id && row.subject_first_name
      ? { id: String(row.reported_user_id), firstName: row.subject_first_name }
      : null,
    event: row.event_id && row.event_title && row.event_sport && row.public_city && row.public_area_label
      ? { id: row.event_id, title: row.event_title, sport: row.event_sport, city: row.public_city, area: row.public_area_label }
      : null,
  }));
}
