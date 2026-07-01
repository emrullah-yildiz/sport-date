import { SAFETY_REPORT_CATEGORIES } from "@sport-date/domain";
import { NextResponse } from "next/server";

import { reportProfilePhoto } from "@/lib/photos";
import { enforceRateLimit, safetyReportRateLimitRules } from "@/lib/rate-limit";
import { isTrustedBrowserMutation } from "@/lib/request-security";
import { getCurrentUser } from "@/lib/session";

export const runtime = "nodejs";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Report a member's profile photo. Routes into the EXISTING moderation queue for
// manual review/takedown (report-based moderation stance).
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedBrowserMutation(request)) return NextResponse.json({ error: "Cross-site request rejected." }, { status: 403 });
  const reporter = await getCurrentUser();
  if (!reporter) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

  const limited = await enforceRateLimit(
    "safety:reports",
    safetyReportRateLimitRules(request, reporter.id),
    "Too many reports in a short period. Please wait before submitting another.",
  );
  if (limited) return limited;

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const input = body as { category?: unknown; details?: unknown };
  const category = typeof input.category === "string" ? input.category : "";
  const details = typeof input.details === "string" ? input.details.trim() : "";
  const errors: string[] = [];
  if (!SAFETY_REPORT_CATEGORIES.includes(category as (typeof SAFETY_REPORT_CATEGORIES)[number])) {
    errors.push("Choose a valid reason.");
  }
  if (details.length < 20 || details.length > 2000) {
    errors.push("Describe the problem using 20 to 2000 characters.");
  }
  if (errors.length > 0) return NextResponse.json({ error: errors[0], errors }, { status: 400 });

  const result = await reportProfilePhoto(reporter.id, id, category, details);
  if (!result.ok) {
    if (result.reason === "self") return NextResponse.json({ error: "You cannot report your own photo." }, { status: 400 });
    return NextResponse.json({ error: "Photo not found." }, { status: 404 });
  }
  return NextResponse.json(
    { success: true, reportId: result.reportId, message: "Thanks — a moderator will review this photo." },
    { status: 201 },
  );
}
