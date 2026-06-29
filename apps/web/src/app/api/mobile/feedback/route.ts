import { validateFeedbackTicket } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { createFeedbackTicket, getFeedbackTickets } from "@/lib/feedback";
import { getMobileSession } from "@/lib/mobile-session";

const privateHeaders = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  return NextResponse.json({ tickets: await getFeedbackTickets(session.user.id) }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  const session = await getMobileSession(request);
  if (!session) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders }); }
  const validation = validateFeedbackTicket(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400, headers: privateHeaders });
  const ticket = await createFeedbackTicket(session.user.id, validation.data);
  return NextResponse.json({ ticket }, { status: 201, headers: privateHeaders });
}
