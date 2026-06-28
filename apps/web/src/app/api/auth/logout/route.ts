import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { AUTH_COOKIE_NAME, clearSessionCookie, revokeSessionToken } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  const response = NextResponse.json({ success: true });
  clearSessionCookie(response);

  if (token) {
    try {
      await revokeSessionToken(token);
    } catch (error) {
      console.error("Unable to revoke session during logout:", error);
    }
  }
  return response;
}

