import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser, AUTH_COOKIE_NAME, clearSessionCookie } from "@/lib/session";
import { revokeWebSession } from "@/lib/web-sessions";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Web session not found." }, { status: 404 });

  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const result = await revokeWebSession(user.id, id, token);
  if (!result.revoked) return NextResponse.json({ error: "Web session is already ended or unavailable." }, { status: 404 });

  const response = NextResponse.json({ success: true, signedOut: result.wasCurrent });
  if (result.wasCurrent) clearSessionCookie(response);
  return response;
}
