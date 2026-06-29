import { NextResponse } from "next/server";

import { issueEmailVerificationTokenForUser } from "@/lib/auth-email";
import { DatabaseNotConfiguredError } from "@/lib/db";
import { enforceRateLimit, verificationRequestRateLimitRules } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) {
    return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const limited = await enforceRateLimit(
    "auth:email-verification:request",
    verificationRequestRateLimitRules(request, user.id),
    "Too many verification email requests. Please wait before trying again.",
  );
  if (limited) return limited;

  try {
    const result = await issueEmailVerificationTokenForUser(user.id, user.email);
    if (result.state === "already_verified") {
      return NextResponse.json({ success: true, message: "This email address is already verified." });
    }
    return NextResponse.json({
      success: true,
      delivery: result.delivery.state,
      message:
        result.delivery.state === "simulated"
          ? "A verification flow has been prepared and simulated delivery is enabled for development."
          : result.delivery.state === "ready"
            ? "A verification flow has been prepared and the delivery payload is ready for a transactional provider."
          : "A verification flow has been prepared. Delivery remains disabled until an approved email provider is configured.",
    }, { status: 202 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return NextResponse.json({ error: "Verification is not connected yet. Please try again later." }, { status: 503 });
    }
    console.error("Email verification request failed:", error);
    return NextResponse.json({ error: "Email verification could not be started." }, { status: 500 });
  }
}
