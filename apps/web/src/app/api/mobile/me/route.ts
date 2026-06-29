import { NextResponse } from "next/server";

import { getMobileSession } from "@/lib/mobile-session";

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json({
    member: {
      id: session.user.id,
      firstName: session.user.firstName,
      location: session.user.location,
      sports: session.user.sports,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
