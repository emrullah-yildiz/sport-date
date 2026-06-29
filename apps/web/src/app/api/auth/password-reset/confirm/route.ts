import { NextResponse } from "next/server";

import { confirmPasswordResetToken } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { authTokenConfirmRateLimitRules, enforceRateLimit } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  let token = "";
  let password = "";
  try {
    const body = await request.json();
    token = typeof body?.token === "string" ? body.token.trim() : "";
    password = typeof body?.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const limited = enforceRateLimit(
    "auth:password-reset:confirm",
    authTokenConfirmRateLimitRules(request, token),
    "Too many password reset attempts. Please wait before trying again.",
  );
  if (limited) return limited;

  try {
    const result = await confirmPasswordResetToken(token, password);
    if (result.state === "validation_error") {
      return NextResponse.json({ error: result.errors[0], errors: result.errors }, { status: 400 });
    }
    if (result.state === "reset") {
      return NextResponse.json({
        success: true,
        message: "Password updated. Other signed-in devices were signed out.",
      });
    }
    if (result.state === "expired") {
      return NextResponse.json({ error: "This reset link expired. Request a new one." }, { status: 410 });
    }
    return NextResponse.json({ error: "This reset link is invalid." }, { status: 400 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Password reset is not connected yet. Please try again later." }, { status: 503 });
    }
    console.error("Password reset confirm failed:", error);
    return NextResponse.json({ error: "Password reset could not be completed." }, { status: 500 });
  }
}
