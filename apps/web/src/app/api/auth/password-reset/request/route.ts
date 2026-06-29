import { validateLogin } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { requestPasswordResetTokenForEmail } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { getRequestIp, normalizeRateLimitKeyPart, passwordResetRequestRateLimitRules, enforceRateLimit } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";

export const runtime = "nodejs";

const GENERIC_SUCCESS_MESSAGE = "If an account exists for that email, password reset instructions will be sent when delivery is configured.";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  let email = "";
  try {
    const body = await request.json();
    email = normalizeRateLimitKeyPart((body as Record<string, unknown>)?.email);
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const limited = enforceRateLimit(
    "auth:password-reset:request",
    passwordResetRequestRateLimitRules(request, email),
    GENERIC_SUCCESS_MESSAGE,
  );
  if (limited) return limited;

  const validation = validateLogin({ email, password: "temporary-placeholder" });
  if (!validation.valid && validation.errors[0] === "Enter a valid email address.") {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  try {
    await requestPasswordResetTokenForEmail(email, getRequestIp(request));
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE }, { status: 202 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE }, { status: 202 });
    }
    console.error("Password reset request failed:", error);
    return NextResponse.json({ success: true, message: GENERIC_SUCCESS_MESSAGE }, { status: 202 });
  }
}
