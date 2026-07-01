import { validateProfileUpdate } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getDatabase } from "@/lib/db";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const validation = validateProfileUpdate(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  }

  const input = validation.data;
  const sportsJson = JSON.stringify(input.sports.map((sport) => ({
    name: sport.name, skill_level: sport.skillLevel, frequency: sport.frequency,
  })));
  const languagesJson = JSON.stringify(input.languages);
  const promptsJson = JSON.stringify(input.prompts.map((prompt) => ({ prompt: prompt.prompt, answer: prompt.answer })));
  const sql = getDatabase();
  const results = await sql.transaction((transaction) => [
    transaction`
      UPDATE users
      SET first_name = ${input.firstName}, last_name = ${input.lastName},
          location = ${input.location}, bio = ${input.bio},
          languages = ARRAY(SELECT jsonb_array_elements_text(${languagesJson}::jsonb)),
          personality_prompts = ${promptsJson}::jsonb,
          seeking = ${input.seeking}, updated_at = NOW()
      WHERE id = ${user.id} AND account_status = 'active'
      RETURNING id
    `,
    transaction`
      DELETE FROM user_sports
      WHERE user_id = ${user.id}
        AND EXISTS (SELECT 1 FROM users WHERE id = ${user.id} AND account_status = 'active')
    `,
    transaction`
      INSERT INTO user_sports (user_id, sport, skill_level, frequency)
      SELECT ${user.id}, selected.name, selected.skill_level, selected.frequency
      FROM jsonb_to_recordset(${sportsJson}::jsonb)
        AS selected(name TEXT, skill_level TEXT, frequency TEXT)
      WHERE EXISTS (SELECT 1 FROM users WHERE id = ${user.id} AND account_status = 'active')
    `,
  ]);

  if (results[0].length === 0) return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
