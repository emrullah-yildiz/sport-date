import "server-only";

import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { createSession, hashSessionToken } from "@/lib/auth";
import { getDatabase } from "@/lib/db";

export const AUTH_COOKIE_NAME = "auth_token";

export type SessionUser = Readonly<{
  id: string;
  email: string;
  age: number;
  firstName: string;
  lastName: string;
  location: string;
  bio: string;
  languages: readonly string[];
  seeking: "dating" | "friendship" | "group";
  emailVerified: boolean;
  sports: ReadonlyArray<{
    name: string;
    skillLevel: "beginner" | "intermediate" | "advanced";
    frequency: "weekly" | "biweekly" | "monthly" | "casual";
  }>;
  prompts: ReadonlyArray<{ prompt: string; answer: string }>;
  // Membership entitlement state (CX-20260701-plus-tier-entitlement-model-and-gating).
  // The instant the member's Sport Date Plus access lapses, or null for a FREE
  // member (the default for everyone). Never trust this raw — always resolve tier
  // through the fail-closed helper in `@/lib/entitlements` (isPlus / canUse), which
  // treats null / missing / expired as FREE. No safety or core capability is ever
  // gated on it.
  plusUntil: string | null;
}>;

type SessionUserRow = {
  id: string | number;
  email: string;
  age: number;
  first_name: string;
  last_name: string;
  location: string;
  bio: string;
  languages: string[];
  seeking: SessionUser["seeking"];
  email_verified: boolean;
  sports: Array<{ name: string; skillLevel: SessionUser["sports"][number]["skillLevel"]; frequency: SessionUser["sports"][number]["frequency"] }>;
  prompts: Array<{ prompt: string; answer: string }> | null;
  plus_until: string | Date | null;
};

export function setSessionCookie(
  response: NextResponse,
  session: ReturnType<typeof createSession>,
): void {
  response.cookies.set(AUTH_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: session.expiresAt,
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  const sql = getDatabase();
  const rows = await sql`
    SELECT
      users.id, users.email,
      DATE_PART('year', AGE(CURRENT_DATE, users.date_of_birth))::integer AS age,
      users.first_name, users.last_name, users.location,
      users.bio, users.languages, users.seeking, users.email_verified,
      users.personality_prompts AS prompts,
      users.plus_until,
      COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'name', user_sports.sport,
            'skillLevel', user_sports.skill_level,
            'frequency', user_sports.frequency
          ) ORDER BY user_sports.created_at
        ) FILTER (WHERE user_sports.id IS NOT NULL),
        '[]'::jsonb
      ) AS sports
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    LEFT JOIN user_sports ON user_sports.user_id = users.id
    WHERE sessions.token_hash = ${hashSessionToken(token)}
      AND sessions.expires_at > NOW()
      AND users.account_status = 'active'
    GROUP BY users.id
    LIMIT 1
  ` as unknown as SessionUserRow[];

  const row = rows[0];
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    age: row.age,
    firstName: row.first_name,
    lastName: row.last_name,
    location: row.location,
    bio: row.bio,
    languages: row.languages,
    seeking: row.seeking,
    emailVerified: row.email_verified,
    sports: row.sports,
    prompts: Array.isArray(row.prompts) ? row.prompts : [],
    // Normalise to an ISO string (or null). Fail closed: anything unparseable
    // becomes null (= FREE) rather than a bogus non-null value.
    plusUntil: normalizePlusUntil(row.plus_until),
  };
}

function normalizePlusUntil(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

export async function revokeSessionToken(token: string): Promise<void> {
  const sql = getDatabase();
  await sql`DELETE FROM sessions WHERE token_hash = ${hashSessionToken(token)}`;
}
