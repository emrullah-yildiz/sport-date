import { NextResponse } from "next/server";

import { getCommunicationPreferences, updateProductUpdatesPreference } from "@/lib/communication-preferences";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const preferences = await getCommunicationPreferences(user.id);
  return NextResponse.json({ preferences }, { headers: { "Cache-Control": "no-store" } });
}

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

  if (typeof body !== "object" || !body || typeof (body as { productUpdatesOptIn?: unknown }).productUpdatesOptIn !== "boolean") {
    return NextResponse.json({ error: "Choose whether optional product updates are on or off." }, { status: 400 });
  }

  const preferences = await updateProductUpdatesPreference(user.id, (body as { productUpdatesOptIn: boolean }).productUpdatesOptIn);
  return NextResponse.json({ success: true, preferences }, { headers: { "Cache-Control": "no-store" } });
}
