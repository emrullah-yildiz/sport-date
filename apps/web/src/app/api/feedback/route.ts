import { validateFeedbackTicket } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { createFeedbackTicket, getFeedbackTickets } from "@/lib/feedback";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const privateHeaders = { "Cache-Control": "no-store" };

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  return NextResponse.json({ tickets: await getFeedbackTickets(user.id) }, { headers: privateHeaders });
}

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403, headers: privateHeaders });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401, headers: privateHeaders });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400, headers: privateHeaders }); }
  const validation = validateFeedbackTicket(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400, headers: privateHeaders });
  const ticket = await createFeedbackTicket(user.id, validation.data);
  return NextResponse.json({ ticket }, { status: 201, headers: privateHeaders });
}
