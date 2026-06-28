import { validateLogin } from "@sport-date/domain";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createSession, hashSessionToken, verifyPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { AUTH_COOKIE_NAME, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

const DUMMY_PASSWORD_HASH = "$2b$12$Ad/rUVoyWWEHpeHc7A7mX.CJ5QzyE20ylxhB323v6GK1CvjyTuxMq";

type LoginUserRow = { id: string | number; email: string; password_hash: string };

export async function POST(request: Request) {
  try {
    const validation = validateLogin(await request.json());
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors[0] }, { status: 400 });
    }

    const sql = getDatabase();
    const rows = await sql`
      SELECT id, email, password_hash
      FROM users
      WHERE email = ${validation.data.email}
      LIMIT 1
    ` as unknown as LoginUserRow[];
    const user = rows[0];
    const passwordMatches = await verifyPassword(
      validation.data.password,
      user?.password_hash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
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
