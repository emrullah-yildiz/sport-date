import { validateSafetyReport } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { getMobileSession } from "@/lib/mobile-session";
import { createSafetyReport } from "@/lib/safety-actions";

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateSafetyReport(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  if (validation.data.reportedUserId === session.user.id) return NextResponse.json({ error: "You cannot report yourself." }, { status: 400 });
  const created = await createSafetyReport(session.user.id, validation.data, validation.priority);
  if (!created) return NextResponse.json({ error: "The reported relationship could not be verified." }, { status: 403 });
  return NextResponse.json({
    success: true, ...created,
    message: created.priority === "critical"
      ? "Report recorded as critical. If anyone is in immediate danger, contact local emergency services now."
      : "Report recorded. Avoid further contact if that feels safer.",
  }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
