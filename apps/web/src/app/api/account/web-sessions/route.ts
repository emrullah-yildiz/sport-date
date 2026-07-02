import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser, AUTH_COOKIE_NAME } from "@/lib/session";
import { getWebSessions, revokeOtherWebSessions, touchWebSessionLastActive } from "@/lib/web-sessions";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  // Best-effort: refresh the coarse (≈daily-throttled) last-active anchor for
  // the current session. Never block the listing if it fails.
  try {
    await touchWebSessionLastActive(token);
  } catch {
    // ignore — last-active is a nicety, not required to list sessions.
  }
  return NextResponse.json(
    { sessions: await getWebSessions(user.id, token) },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Bulk action: "Sign out all other browsers." Ends every session for the
 * member EXCEPT the current one. Same-origin/CSRF-guarded and auth-required,
 * exactly like the single-session revoke. The current session is preserved by
 * `revokeOtherWebSessions` (it deletes `token_hash <> currentHash` only), so
 * this can never sign the member out of the browser they are using. Requires a
 * valid current token — without one nothing is deleted.
 */
export async function DELETE(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const revokedCount = await revokeOtherWebSessions(user.id, token);
  return NextResponse.json(
    { success: true, revokedCount },
    { headers: { "Cache-Control": "no-store" } },
  );
}
