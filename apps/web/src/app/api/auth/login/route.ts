import { validateLogin } from "@sport-date/domain";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, hashSessionToken, verifyPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { browserAuthRateLimitRules, enforceRateLimit, normalizeRateLimitKeyPart } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { AUTH_COOKIE_NAME, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const DUMMY_PASSWORD_HASH = "$2b$12$Ad/rUVoyWWEHpeHc7A7mX.CJ5QzyE20ylxhB323v6GK1CvjyTuxMq";

type LoginUserRow = { id: string | number; email: string; password_hash: string; account_status: string };

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  try {
    const body = await request.json();
    const email = normalizeRateLimitKeyPart((body as Record<string, unknown>)?.email);
    const limited = await enforceRateLimit(
      "auth:login",
      browserAuthRateLimitRules(request, email),
      "Too many login attempts. Please wait before trying again.",
    );
    if (limited) return limited;
    const validation = validateLogin(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    const sql = getDatabase();
    const rows = await sql`
      SELECT id, email, password_hash, account_status
      FROM users
      WHERE email = ${validation.data.email}
      LIMIT 1
    ` as unknown as LoginUserRow[];
    const user = rows[0];
    const passwordMatches = await verifyPassword(
      validation.data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches || user.account_status !== "active") {
      return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    }

    const session = createSession();
    const previousToken = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
    const previousTokenHash = previousToken ? hashSessionToken(previousToken) : "";
    await sql.transaction((transaction) => [
      transaction`
        DELETE FROM sessions
        WHERE ${previousTokenHash} <> '' AND token_hash = ${previousTokenHash}
      `,
      transaction`
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        VALUES (${session.id}::uuid, ${user.id}, ${session.tokenHash}, ${session.expiresAt.toISOString()}::timestamptz)
      `,
    ]);

    const response = NextResponse.json({ success: true });
    setSessionCookie(response, session);
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Login is not connected yet. Please try again later." }, { status: 503 });
    }
    console.error("Login failed:", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
