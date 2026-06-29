import { NextResponse } from "next/server";

import { markEventUpdateSeen } from "@/lib/event-update-receipts";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ eventId: string; updateId: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const viewer = await getCurrentUser();
  if (!viewer) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { eventId, updateId } = await params;
  if (!UUID_PATTERN.test(eventId) || !UUID_PATTERN.test(updateId)) return NextResponse.json({ error: "Update not found." }, { status: 404 });

  if (!await markEventUpdateSeen(eventId, updateId, viewer.id)) {
    return NextResponse.json({ error: "Update cannot be marked seen." }, { status: 409 });
  }

  return NextResponse.json({ success: true, status: "seen" });
}
