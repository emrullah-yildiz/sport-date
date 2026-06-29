import { NextResponse } from "next/server";

import { getMemberEventSummaries } from "@/lib/events";
import { getMobileSession } from "@/lib/mobile-session";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({ events: await getMemberEventSummaries(session.user.id) }, { headers: { "Cache-Control": "no-store" } });
}

