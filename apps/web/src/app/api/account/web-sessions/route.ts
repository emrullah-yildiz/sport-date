import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getCurrentUser, AUTH_COOKIE_NAME } from "@/lib/session";
import { getWebSessions } from "@/lib/web-sessions";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  return NextResponse.json(
    { sessions: await getWebSessions(user.id, token) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
