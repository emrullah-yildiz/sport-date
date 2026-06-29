import "server-only";

import { getDatabase } from "@/lib/db";

export type MobileDeviceSession = Readonly<{
  id: string; deviceName: string; accessExpiresAt: string; refreshExpiresAt: string;
  lastUsedAt: string; createdAt: string; revokedAt: string | null; current: boolean; active: boolean;
}>;

type DeviceRow = {
  id: string; device_name: string; access_expires_at: string; refresh_expires_at: string;
  last_used_at: string; created_at: string; revoked_at: string | null; current: boolean; active: boolean;
};

export async function getMobileDeviceSessions(userId: string, currentSessionId?: string): Promise<MobileDeviceSession[]> {
  const sql = getDatabase();
  const rows = await sql`
    SELECT id, device_name, access_expires_at, refresh_expires_at, last_used_at,
      created_at, revoked_at, COALESCE(id = NULLIF(${currentSessionId ?? ""}, '')::uuid, FALSE) AS current,
      (revoked_at IS NULL AND refresh_expires_at > NOW()) AS active
    FROM mobile_sessions WHERE user_id = ${userId}
    ORDER BY (revoked_at IS NULL AND refresh_expires_at > NOW()) DESC, last_used_at DESC
    LIMIT 50
  ` as unknown as DeviceRow[];
  return rows.map((row) => ({
    id: row.id, deviceName: row.device_name, accessExpiresAt: row.access_expires_at,
    refreshExpiresAt: row.refresh_expires_at, lastUsedAt: row.last_used_at,
    createdAt: row.created_at, revokedAt: row.revoked_at, current: row.current, active: row.active,
  }));
}

export async function revokeMobileDeviceSession(userId: string, sessionId: string): Promise<boolean> {
  const sql = getDatabase();
  const rows = await sql`
    UPDATE mobile_sessions SET revoked_at = NOW()
    WHERE id = ${sessionId}::uuid AND user_id = ${userId} AND revoked_at IS NULL
    RETURNING id
  `;
  return rows.length > 0;
}
