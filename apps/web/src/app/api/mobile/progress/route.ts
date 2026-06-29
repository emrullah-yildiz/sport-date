import { NextResponse } from "next/server";

import { getMobileSession } from "@/lib/mobile-session";
import { getMemberMovementProgress } from "@/lib/progress";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  const progress = await getMemberMovementProgress(session.user.id);
  return NextResponse.json({ progress }, { headers: { "Cache-Control": "no-store" } });
}

