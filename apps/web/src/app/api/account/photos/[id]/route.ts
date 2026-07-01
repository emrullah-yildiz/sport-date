import { NextResponse } from "next/server";

import { deleteProfilePhoto } from "@/lib/photos";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const deleted = await deleteProfilePhoto(user.id, id);
  if (!deleted) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  return NextResponse.json({ success: true });
}
