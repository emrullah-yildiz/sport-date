import { NextResponse } from "next/server";

import { confirmEmailVerificationToken } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { authTokenConfirmRateLimitRules, enforceRateLimit } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  let token = "";
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token.trim() : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const limited = await enforceRateLimit(
    "auth:email-verification:confirm",
    authTokenConfirmRateLimitRules(request, token),
    "Too many verification attempts. Please wait before trying again.",
  );
  if (limited) return limited;

  try {
    const result = await confirmEmailVerificationToken(token);
    if (result.state === "verified") {
      return NextResponse.json({ success: true, state: "verified", message: "Email verified." });
    }
    if (result.state === "already_verified") {
      return NextResponse.json({ success: true, state: "already_verified", message: "Email was already verified." });
    }
    if (result.state === "expired") {
      return NextResponse.json({ state: "expired", error: "This verification link expired. Request a new one." }, { status: 410 });
    }
    return NextResponse.json({ state: "invalid", error: "This verification link is invalid." }, { status: 400 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ state: "unavailable", error: "Verification is not connected yet. Please try again later." }, { status: 503 });
    }
    console.error("Email verification confirm failed:", error);
    return NextResponse.json({ state: "error", error: "Email verification could not be completed." }, { status: 500 });
  }
}
