import { NextResponse } from "next/server";

import { resolveTransactionalEmailProvider } from "@/lib/email-provider";

// Internal, secret-guarded diagnostic for email delivery. Reports WHY the
// transactional-email provider resolves the way it does (booleans + non-secret
// flags only), and — with `?send=1` — attempts ONE real Gmail send to the sender
// address to confirm live delivery + surface any Gmail API error. Never returns
// a secret value. Behind CRON_SECRET.
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

  let reason = "provider resolves to gmail — config looks correct";
  if (env.EMAIL_DELIVERY_ENABLED !== "true") {
    reason = `EMAIL_DELIVERY_ENABLED is not exactly "true" (raw: ${JSON.stringify(env.EMAIL_DELIVERY_ENABLED ?? null)})`;
  } else if (env.EMAIL_DELIVERY_PROVIDER !== "gmail" && env.EMAIL_DELIVERY_PROVIDER !== "console") {
    reason = `EMAIL_DELIVERY_PROVIDER is not "gmail" (raw: ${JSON.stringify(env.EMAIL_DELIVERY_PROVIDER ?? null)})`;
  } else if (env.EMAIL_DELIVERY_PROVIDER === "gmail") {
    const missing = gmailKeys.filter((k) => !present(k));
    if (missing.length > 0) reason = `these Gmail keys are missing or blank at runtime: ${missing.join(", ")}`;
  }

  const base = {
    provider,
    reason,
    flags: {
      EMAIL_DELIVERY_ENABLED: env.EMAIL_DELIVERY_ENABLED ?? null,
      EMAIL_DELIVERY_PROVIDER: env.EMAIL_DELIVERY_PROVIDER ?? null,
    },
    gmailKeysPresent: Object.fromEntries(gmailKeys.map((k) => [k, present(k)])),
    senderEmail: env.GMAIL_SENDER_EMAIL ?? null,
  };

  const wantSend = new URL(request.url).searchParams.get("send") === "1";
  if (!wantSend || provider !== "gmail") {
    return NextResponse.json(base, { status: 200, headers: { "cache-control": "no-store" } });
  }

  // Live send test: refresh -> access token -> gmail send to the sender address.
  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID ?? "",
        client_secret: env.GMAIL_CLIENT_SECRET ?? "",
        refresh_token: env.GMAIL_REFRESH_TOKEN ?? "",
        grant_type: "refresh_token",
      }),
    });
    const token = (await tokenRes.json()) as { access_token?: string; error?: string; error_description?: string; scope?: string };
    if (!token.access_token) {
      return NextResponse.json({ ...base, send: { ok: false, stage: "token", error: token.error ?? "no_access_token", detail: token.error_description ?? null } }, { status: 200 });
    }
    const sender = env.GMAIL_SENDER_EMAIL ?? "";
    const raw = [
      `From: KeepItUp <${sender}>`,
      `To: ${sender}`,
      "Subject: KeepItUp email self-test",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=UTF-8",
      "",
      "Live self-test: Gmail transactional delivery is working. Reminders + verification will send.",
    ].join("\r\n");
    const encoded = Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
      body: JSON.stringify({ raw: encoded }),
    });
    const sendJson = (await sendRes.json()) as { id?: string; error?: { message?: string; status?: string } };
    if (sendJson.id) {
      return NextResponse.json({ ...base, tokenScope: token.scope ?? null, send: { ok: true, messageId: sendJson.id, to: sender } }, { status: 200 });
    }
    return NextResponse.json({ ...base, tokenScope: token.scope ?? null, send: { ok: false, stage: "send", httpStatus: sendRes.status, error: sendJson.error?.message ?? "unknown", code: sendJson.error?.status ?? null } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ ...base, send: { ok: false, stage: "exception", error: error instanceof Error ? error.message : "unknown" } }, { status: 200 });
  }
}
