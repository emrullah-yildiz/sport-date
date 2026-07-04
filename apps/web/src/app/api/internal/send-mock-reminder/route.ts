import { NextResponse } from "next/server";

// TEMPORARY, secret-guarded: sends one on-brand event-reminder MOCKUP email to a
// given address via the live Gmail credentials. Buttons link to the REAL
// confirm/cancel routes (with a preview token). Behind CRON_SECRET. Remove after use.
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  const header = request.headers.get("authorization");
  if (!secret || header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const to = new URL(request.url).searchParams.get("to");
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "provide a valid ?to= address" }, { status: 400 });
  }
  const env = process.env;

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
  const token = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!token.access_token) {
    return NextResponse.json({ ok: false, stage: "token", error: token.error ?? "no_access_token" }, { status: 200 });
  }

  const sender = env.GMAIL_SENDER_EMAIL ?? "support@keepitup.social";
  const eventId = "c5442954-84c3-4a03-a196-53a391bb8e0a"; // real "Tennis for Singles" event, preview token
  const confirmUrl = `https://www.keepitup.social/e/${eventId}/confirm?t=preview`;
  const cancelUrl = `https://www.keepitup.social/e/${eventId}/cancel?t=preview`;

  const btn = (href: string, label: string, primary: boolean): string =>
    `<td style="width:50%;${primary ? "padding-right:5px" : "padding-left:5px"}">` +
    `<a href="${href}" style="display:block;text-align:center;white-space:nowrap;font-size:14px;font-weight:${primary ? 800 : 700};` +
    `text-decoration:none;padding:13px 4px;border-radius:10px;` +
    (primary ? "background:#3BEA7E;color:#0c0f10" : "background:transparent;color:#F1F5F3;border:1px solid rgba(255,255,255,.25)") +
    `">${label}</a></td>`;

  const html = `<!doctype html><html><body style="margin:0;background:#14181c;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#F1F5F3;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#20262B;border:1px solid rgba(59,234,126,.25);border-radius:16px;padding:28px">
    <div style="color:#3BEA7E;font-weight:800;letter-spacing:.18em;font-size:12px;text-transform:uppercase">KeepItUp · Still coming?</div>
    <h1 style="font-size:24px;margin:10px 0 4px">Your event starts in 2 hours 🎾</h1>
    <p style="color:#c6d0cd;font-size:15px;line-height:1.5;margin:0 0 18px">Quick check so the group knows who to expect.</p>
    <div style="background:#242B31;border-radius:12px;padding:18px;margin-bottom:20px">
      <div style="font-size:12px;color:#8A9BA0;text-transform:uppercase;letter-spacing:.1em">Tennis · Intermediate</div>
      <div style="font-size:20px;font-weight:800;margin:4px 0 8px">Tennis for Singles</div>
      <div style="color:#c6d0cd;font-size:14px">Today · 2 hours from now · ~Herăstrău, Bucharest</div>
      <div style="color:#8A9BA0;font-size:13px;margin-top:6px">Exact meeting point unlocks for confirmed attendees.</div>
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%"><tr>
      ${btn(confirmUrl, "✓ I'm coming", true)}
      ${btn(cancelUrl, "✗ Can't make it", false)}
    </tr></table>
    <p style="color:#8A9BA0;font-size:12px;line-height:1.6;margin:20px 0 0">"Can't make it" frees your spot for someone else — no penalty. Questions? Just reply to this email.</p>
    <p style="color:#3BEA7E;font-size:12px;font-weight:700;margin:16px 0 0">keepitup.social — meet through movement</p>
    <p style="color:#5a666c;font-size:11px;margin:14px 0 0">Preview of the KeepItUp reminder. Real emails carry your secure one-tap confirm/cancel link.</p>
  </div></body></html>`;

  const raw = [
    `From: KeepItUp <${sender}>`,
    `To: ${to}`,
    `Reply-To: ${sender}`,
    "Subject: =?UTF-8?B?" + Buffer.from("Still coming? Your KeepItUp event starts in 2 hours 🎾", "utf8").toString("base64") + "?=",
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=UTF-8",
    "",
    html,
  ].join("\r\n");
  const encoded = Buffer.from(raw, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const sendRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { authorization: `Bearer ${token.access_token}`, "content-type": "application/json" },
    body: JSON.stringify({ raw: encoded }),
  });
  const sendJson = (await sendRes.json()) as { id?: string; error?: { message?: string } };
  if (sendJson.id) return NextResponse.json({ ok: true, messageId: sendJson.id, to, confirmUrl, cancelUrl }, { status: 200 });
  return NextResponse.json({ ok: false, stage: "send", httpStatus: sendRes.status, error: sendJson.error?.message ?? "unknown" }, { status: 200 });
}
