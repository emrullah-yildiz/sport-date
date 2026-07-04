import { validateRegistration } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { createSession, hashPassword } from "@/lib/auth";
import { DatabaseNotConfiguredError, getDatabase } from "@/lib/db";
import { deriveDeviceLabel } from "@/lib/device-label";
import { browserRegistrationRateLimitRules, enforceRateLimit, normalizeRateLimitKeyPart } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  try {
    const body = await request.json();
    const email = normalizeRateLimitKeyPart((body as Record<string, unknown>)?.email);
    const limited = await enforceRateLimit(
      "auth:register",
      browserRegistrationRateLimitRules(request, email),
      "Too many signup attempts. Please wait before trying again.",
    );
    if (limited) return limited;
    const validation = validateRegistration(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors[0], errors: validation.errors },
        { status: 400 },
      );
    }

    const input = validation.data;
    const passwordHash = await hashPassword(input.password);
    const session = createSession();
    // Coarse, honest "Browser on OS" hint (see login route / device-label.ts):
    // derived family label only, never the raw UA / IP / location.
    const deviceLabel = deriveDeviceLabel(request.headers.get("user-agent"));
    const sql = getDatabase();
    const sportsJson = JSON.stringify(input.sports.map((sport) => ({
      name: sport.name,
      skill_level: sport.skillLevel,
      frequency: sport.frequency,
    })));
    // Optional, GDPR-careful identity fields (CX-20260704). The domain sanitizer
    // has already dropped an orientation value that lacked explicit consent, so
    // `input.sexualOrientation` is non-null ONLY when consent was given; we stamp
    // the consent moment accordingly (the DB additionally CHECKs this pairing).
    const genderSelfDescribe = input.genderSelfDescribe || null;
    const orientationSelfDescribe = input.orientationSelfDescribe || null;
    const orientationConsentAt = input.sexualOrientation ? new Date().toISOString() : null;

    const users = await sql`
      WITH new_user AS (
        INSERT INTO users (
          email, password_hash, date_of_birth, first_name, last_name,
          location, bio, seeking, accepted_terms_at, email_verified,
          gender, gender_self_describe, gender_visible,
          sexual_orientation, orientation_self_describe, orientation_consent_at, orientation_visible
        )
        VALUES (
          ${input.email}, ${passwordHash}, ${input.dateOfBirth}, ${input.firstName},
          ${input.lastName}, ${input.location}, ${input.bio}, ${input.seeking}, NOW(), FALSE,
          ${input.gender}, ${genderSelfDescribe}, ${input.genderVisible},
          ${input.sexualOrientation}, ${orientationSelfDescribe}, ${orientationConsentAt}, ${input.orientationVisible}
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
        INSERT INTO sessions (id, user_id, token_hash, expires_at, device_label, last_active_at)
        SELECT ${session.id}::uuid, new_user.id, ${session.tokenHash}, ${session.expiresAt.toISOString()}::timestamptz, ${deviceLabel}, NOW()
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
    setSessionCookie(response, session);
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
