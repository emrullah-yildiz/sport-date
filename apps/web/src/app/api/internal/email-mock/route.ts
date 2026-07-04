import { NextResponse } from "next/server";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { buildAttendanceReminderEmail } from "@/lib/attendance-confirmation";
import { sendGmailEmail } from "@/lib/gmail-email-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && request.headers.get("authorization") === `Bearer ${secret}`;
}

/** One-recipient operational mock. Disabled unless its recipient env exists. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const recipient = process.env.EMAIL_TEST_RECIPIENT?.trim();
  if (!recipient) {
    return NextResponse.json({ error: "Email mock is disabled." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }

  const base = buildAttendanceReminderEmail({
    origin: resolveAuthEmailOrigin() ?? "https://keepitup.social",
    eventId: "00000000-0000-4000-8000-000000000000",
    rawToken: "mock-only-not-a-real-attendance-token",
    to: recipient,
    firstName: "Emrullah",
    sport: "Tennis",
    areaLabel: "Floreasca",
    city: "Bucharest",
    whenLabel: "Today, 18:00",
  });
  const draft = {
    ...base,
    subject: `[Mockup] ${base.subject}`,
    text: `MOCKUP ONLY — these buttons do not change attendance.\n\n${base.text}`,
    html: `<p style="padding:10px 12px;border-radius:8px;background:#fff4ce;color:#5f4300"><strong>Mockup only:</strong> these buttons do not change attendance.</p>${base.html}`,
  };

  try {
    await sendGmailEmail(draft, {
      env: { ...process.env, EMAIL_DELIVERY_ENABLED: "true", EMAIL_DELIVERY_PROVIDER: "gmail" },
    });
    return NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const reason = error instanceof Error && error.message.includes("authorization")
      ? "gmail_authorization_failed"
      : "gmail_delivery_failed";
    console.error("Authorized email mock failed:", reason);
    return NextResponse.json({ error: "Mock email delivery failed.", reason }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
