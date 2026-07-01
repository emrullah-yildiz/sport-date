import { NextResponse } from "next/server";

import { reorderProfilePhotos } from "@/lib/photos";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

// Persist a member-chosen ordering of their own photos. `order` is the full list
// of photo ids in the desired sequence.
export async function PATCH(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const order = (body as { order?: unknown })?.order;
  if (!Array.isArray(order) || !order.every((id) => typeof id === "string")) {
    return NextResponse.json({ error: "Provide the photo order as a list of ids." }, { status: 400 });
  }

  const result = await reorderProfilePhotos(user.id, order as string[]);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true });
}
