import { validateSafetyReport } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { isTrustedBrowserMutation } from "@/lib/request-security";
import { enforceRateLimit, safetyReportRateLimitRules } from "@/lib/rate-limit";
import { createSafetyReport } from "@/lib/safety-actions";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: Request) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const reporter = await getCurrentUser();
  if (!reporter) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const limited = await enforceRateLimit(
    "safety:reports",
    safetyReportRateLimitRules(request, reporter.id),
    "Too many reports in a short period. Please wait before submitting another.",
  );
  if (limited) return limited;
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const validation = validateSafetyReport(body);
  if (!validation.valid) return NextResponse.json({ error: validation.errors[0], errors: validation.errors }, { status: 400 });
  if (validation.data.reportedUserId === reporter.id) return NextResponse.json({ error: "You cannot report yourself." }, { status: 400 });
  const created = await createSafetyReport(reporter.id, validation.data, validation.priority);
  if (!created) return NextResponse.json({ error: "The reported relationship could not be verified." }, { status: 403 });
  return NextResponse.json({
    success: true, ...created,
    message: created.priority === "critical"
      ? "Report recorded as critical. If anyone is in immediate danger, contact local emergency services now."
      : "Report recorded. Preserve any relevant evidence and avoid further contact if that feels safer.",
  }, { status: 201 });
}
