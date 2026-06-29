import { validateEventReflection } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { saveEventReflection } from "@/lib/reflections";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const { eventId } = await params;
  if (!UUID_PATTERN.test(eventId)) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateEventReflection(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });

  const saved = await saveEventReflection(eventId, user.id, validation.data);
  if (!saved) return NextResponse.json({ error: "Reflection opens after the event ends for hosts and accepted participants." }, { status: 409 });
  return NextResponse.json({
    success: true,
    attendance: saved.attendance,
    wouldJoinAgain: saved.wouldJoinAgain,
    qualifiedForProgress: saved.qualifiedForProgress,
  });
}
