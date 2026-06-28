import { validateRegistration } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { createSession, hashPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const validation = validateRegistration(await request.json());
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 },
      );
    }

    const input = validation.data;
    const passwordHash = await hashPassword(input.password);
    const session = createSession();
    const sql = getDatabase();
    const sportsJson = JSON.stringify(input.sports.map((sport) => ({
      name: sport.name,
      skill_level: sport.skillLevel,
      frequency: sport.frequency,
    })));

    const users = await sql`
      WITH new_user AS (
        INSERT INTO users (
          email, password_hash, date_of_birth, first_name, last_name,
          location, bio, seeking, accepted_terms_at, email_verified
        )
        VALUES (
          ${input.email}, ${passwordHash}, ${input.dateOfBirth}, ${input.firstName},
          ${input.lastName}, ${input.location}, ${input.bio}, ${input.seeking}, NOW(), FALSE
        )
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email
      ), new_sports AS (
        INSERT INTO user_sports (user_id, sport, skill_level, frequency)
        SELECT new_user.id, selected.name, selected.skill_level, selected.frequency
        FROM new_user
        CROSS JOIN jsonb_to_recordset(${sportsJson}::jsonb)
          AS selected(name TEXT, skill_level TEXT, frequency TEXT)
      ), new_session AS (
        INSERT INTO sessions (id, user_id, token_hash, expires_at)
        SELECT ${session.id}::uuid, new_user.id, ${session.tokenHash}, ${session.expiresAt.toISOString()}::timestamptz
        FROM new_user
      )
      SELECT id, email FROM new_user
    `;

    if (users.length === 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 });
    }

    const response = NextResponse.json(
      { success: true, user: { id: users[0].id, email: users[0].email } },
      { status: 201 },
    );
    response.cookies.set("auth_token", session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: session.expiresAt,
      path: "/",
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json(
        { error: "Registration is not connected yet. Please try again later." },
        { status: 503 },
      );
    }
    console.error("Registration failed:", error);
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
