import "server-only";

import crypto from "node:crypto";

import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";
import { resolveTransactionalEmailProvider, type EmailDeliveryEnvironment } from "@/lib/email-provider";

export type TransactionalEmailDraft = Readonly<{
  to: string;
  subject: string;
  text: string;
  html?: string;
}>;

type GmailSendOptions = {
  env?: EmailDeliveryEnvironment;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
};

function header(value: string): string {
  if (!value.trim() || /[\r\n]/.test(value)) throw new Error("Invalid transactional email header.");
  return value.trim();
}

function base64Lines(value: string): string {
  return Buffer.from(value, "utf8").toString("base64").match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export function buildGmailRawMessage(
  draft: TransactionalEmailDraft,
  env: EmailDeliveryEnvironment,
): string {
  const senderEmail = header(env.GMAIL_SENDER_EMAIL ?? "");
  const senderName = header(env.GMAIL_SENDER_NAME || BRAND_NAME);
  const replyTo = header(env.GMAIL_REPLY_TO || SUPPORT_EMAIL);
  const to = header(draft.to);
  const subject = `=?UTF-8?B?${Buffer.from(header(draft.subject), "utf8").toString("base64")}?=`;
  const boundary = `keepitup_${crypto.randomUUID()}`;
  const html = draft.html ?? `<pre style="white-space:pre-wrap;font-family:inherit">${draft.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>`;
  return [
    `From: ${senderName} <${senderEmail}>`,
    `Reply-To: ${replyTo}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(draft.text),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    base64Lines(html),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

async function fetchWithTimeout(url: string, init: RequestInit, fetchImpl: typeof fetch, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Exchange the owner-authorized refresh token, then send with the narrow Gmail API adapter. */
export async function sendGmailEmail(
  draft: TransactionalEmailDraft,
  options: GmailSendOptions = {},
): Promise<{ messageId: string }> {
  const env = options.env ?? process.env;
  if (resolveTransactionalEmailProvider(env) !== "gmail") throw new Error("Gmail delivery is not configured.");
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 5_000;

  const tokenBody = new URLSearchParams({
    client_id: env.GMAIL_CLIENT_ID!,
    client_secret: env.GMAIL_CLIENT_SECRET!,
    refresh_token: env.GMAIL_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const tokenResponse = await fetchWithTimeout("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenBody,
  }, fetchImpl, timeoutMs);
  if (!tokenResponse.ok) throw new Error("Gmail authorization failed.");
  const tokenPayload = await tokenResponse.json() as { access_token?: unknown };
  if (typeof tokenPayload.access_token !== "string" || !tokenPayload.access_token) throw new Error("Gmail authorization failed.");

  const raw = Buffer.from(buildGmailRawMessage(draft, env), "utf8").toString("base64url");
  const sendResponse = await fetchWithTimeout("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${tokenPayload.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw }),
  }, fetchImpl, timeoutMs);
  if (!sendResponse.ok) throw new Error("Gmail delivery failed.");
  const sendPayload = await sendResponse.json() as { id?: unknown };
  if (typeof sendPayload.id !== "string" || !sendPayload.id) throw new Error("Gmail delivery returned no message id.");
  return { messageId: sendPayload.id };
}
