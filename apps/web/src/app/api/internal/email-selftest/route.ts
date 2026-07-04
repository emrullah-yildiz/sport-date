import { NextResponse } from "next/server";

import { resolveTransactionalEmailProvider } from "@/lib/email-provider";

// Internal, secret-guarded diagnostic for email delivery. Reports WHY the
// transactional-email provider resolves the way it does — WITHOUT ever exposing
// a secret value. Only booleans (key present/absent) and the two non-secret
// flags (EMAIL_DELIVERY_ENABLED, EMAIL_DELIVERY_PROVIDER) + the sender address
// (which appears on every email anyway) are returned. Behind CRON_SECRET.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = process.env;
  const present = (key: string): boolean => Boolean((env[key] ?? "").trim());
  const gmailKeys = ["GMAIL_CLIENT_ID", "GMAIL_CLIENT_SECRET", "GMAIL_REFRESH_TOKEN", "GMAIL_SENDER_EMAIL"];
  const provider = resolveTransactionalEmailProvider(env);

  let reason = "provider resolves to gmail — config looks correct; a non-delivery is then a Gmail API error (scope / invalid_grant / alias)";
  if (env.EMAIL_DELIVERY_ENABLED !== "true") {
    reason = `EMAIL_DELIVERY_ENABLED is not exactly "true" (raw: ${JSON.stringify(env.EMAIL_DELIVERY_ENABLED ?? null)})`;
  } else if (env.EMAIL_DELIVERY_PROVIDER !== "gmail" && env.EMAIL_DELIVERY_PROVIDER !== "console") {
    reason = `EMAIL_DELIVERY_PROVIDER is not "gmail" (raw: ${JSON.stringify(env.EMAIL_DELIVERY_PROVIDER ?? null)})`;
  } else if (env.EMAIL_DELIVERY_PROVIDER === "gmail") {
    const missing = gmailKeys.filter((k) => !present(k));
    if (missing.length > 0) reason = `these Gmail keys are missing or blank at runtime: ${missing.join(", ")}`;
  }

  return NextResponse.json(
    {
      provider,
      reason,
      flags: {
        EMAIL_DELIVERY_ENABLED: env.EMAIL_DELIVERY_ENABLED ?? null,
        EMAIL_DELIVERY_PROVIDER: env.EMAIL_DELIVERY_PROVIDER ?? null,
      },
      gmailKeysPresent: Object.fromEntries(gmailKeys.map((k) => [k, present(k)])),
      senderEmail: env.GMAIL_SENDER_EMAIL ?? null,
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
