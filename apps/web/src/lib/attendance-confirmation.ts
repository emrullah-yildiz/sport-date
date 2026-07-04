// Pure helpers for the T-2h attendance confirmation loop
// (CX-20260704-feature-event-attendance-confirmation).
//
// Kept free of `server-only` / DB / React imports so the token, window, email
// draft, and email-gate logic are all unit-testable in the node test env. The
// DB operations live in `attendance-confirmations.ts` (server-only), which
// imports these helpers.

import crypto from "node:crypto";

import { SUPPORT_EMAIL } from "@/lib/brand";
import { resolveTransactionalEmailProvider, type EmailDeliveryEnvironment } from "@/lib/email-provider";

/** How far ahead of an event start the confirmation loop opens. */
export const ATTENDANCE_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

export type AttendanceStatus = "pending" | "confirmed" | "cancelled";

/**
 * True when `startsAtIso` is in the future AND within the next 2 hours of `now`.
 * The reminder job selects events in this window; the in-app prompt shows and
 * the tokens act only while this holds (tokens additionally expire exactly at
 * start). A non-parseable date is never in-window.
 */
export function isWithinReminderWindow(startsAtIso: string, now: Date = new Date()): boolean {
  const start = new Date(startsAtIso).getTime();
  if (!Number.isFinite(start)) return false;
  const nowMs = now.getTime();
  return start > nowMs && start <= nowMs + ATTENDANCE_REMINDER_WINDOW_MS;
}

/** True once the event has started — every token is dead from this point. */
export function attendanceTokenExpired(startsAtIso: string, now: Date = new Date()): boolean {
  const start = new Date(startsAtIso).getTime();
  if (!Number.isFinite(start)) return true;
  return start <= now.getTime();
}

/**
 * Mint a single-purpose attendance token: a 32-byte URL-safe secret and its
 * SHA-256 hash. Only the hash is stored; the raw value travels in the email
 * link and is unguessable and non-enumerable. A token maps to exactly one
 * confirmation row (one membership), so it can only ever affect that membership.
 */
export function generateAttendanceToken(): { raw: string; hash: string } {
  const raw = crypto.randomBytes(32).toString("base64url");
  return { raw, hash: hashAttendanceToken(raw) };
}

export function hashAttendanceToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// ── Dark email gate (mirrors auth-email-delivery + photo-storage fail-closed) ──

export type AttendanceEmailProvider = "disabled" | "console" | "gmail";
type EmailEnvironment = EmailDeliveryEnvironment;

/**
 * Resolve the email provider. FAIL CLOSED: unless delivery is explicitly enabled
 * (`EMAIL_DELIVERY_ENABLED === "true"`) AND a provider is chosen, email is
 * `disabled` and no message ever leaves. Real delivery requires the owner to
 * provision an ESP and flip the flag — the same gate the auth emails use.
 */
export function resolveAttendanceEmailProvider(env: EmailEnvironment = process.env): AttendanceEmailProvider {
  return resolveTransactionalEmailProvider(env);
}

export function canSendAttendanceEmails(env: EmailEnvironment = process.env): boolean {
  return resolveAttendanceEmailProvider(env) !== "disabled";
}

export type AttendanceReminderDraft = Readonly<{
  to: string;
  subject: string;
  text: string;
  html: string;
  confirmUrl: string;
  cancelUrl: string;
}>;

export type AttendanceReminderInput = Readonly<{
  origin: string;
  eventId: string;
  rawToken: string;
  to: string;
  firstName: string;
  sport: string;
  areaLabel: string;
  city: string;
  /** Human, timezone-correct "when" string (already formatted by the caller). */
  whenLabel: string;
}>;

function attendanceActionUrl(origin: string, eventId: string, action: "confirm" | "cancel", rawToken: string): string {
  const base = origin.endsWith("/") ? origin.slice(0, -1) : origin;
  return `${base}/e/${eventId}/${action}?t=${encodeURIComponent(rawToken)}`;
}

/**
 * Build the plain, honest reminder email. Approximate area only — never the
 * exact venue (accepted members already have that in-app). No fake urgency: a
 * non-response simply stays pending. Approve/Cancel are one-click links; the
 * support address is the contact for questions.
 */
export function buildAttendanceReminderEmail(input: AttendanceReminderInput): AttendanceReminderDraft {
  const confirmUrl = attendanceActionUrl(input.origin, input.eventId, "confirm", input.rawToken);
  const cancelUrl = attendanceActionUrl(input.origin, input.eventId, "cancel", input.rawToken);
  const area = input.areaLabel && input.city && input.areaLabel.toLowerCase() !== input.city.toLowerCase()
    ? `${input.areaLabel}, ${input.city}`
    : input.areaLabel || input.city;
  const subject = `Still coming? ${input.sport} · ${input.whenLabel}`;
  const text = [
    `Hi ${input.firstName},`,
    "",
    `Your ${input.sport} meet-up is coming up soon:`,
    `When: ${input.whenLabel}`,
    `Approximate area: ${area}`,
    "",
    "Can you still make it? Choose one:",
    `Approve attendance: ${confirmUrl}`,
    `Cancel attendance (frees your spot): ${cancelUrl}`,
    "",
    "If you do nothing, your place is kept — this is just a friendly check.",
    `Questions? ${SUPPORT_EMAIL}`,
  ].join("\n");
  const html = [
    `<p>Hi ${escapeHtml(input.firstName)},</p>`,
    `<p>Your <strong>${escapeHtml(input.sport)}</strong> meet-up is coming up soon.</p>`,
    `<p><strong>When:</strong> ${escapeHtml(input.whenLabel)}<br/><strong>Approximate area:</strong> ${escapeHtml(area)}</p>`,
    "<p>Can you still make it? Choose one:</p>",
    '<table role="presentation" cellspacing="0" cellpadding="0"><tr>',
    `<td style="padding:0 12px 0 0"><a href="${escapeHtml(confirmUrl)}" style="display:inline-block;padding:12px 20px;border-radius:8px;background:#178f4b;color:#ffffff;text-decoration:none;font-weight:700">Approve</a></td>`,
    `<td><a href="${escapeHtml(cancelUrl)}" style="display:inline-block;padding:12px 20px;border:1px solid #6b7280;border-radius:8px;background:#ffffff;color:#1f2937;text-decoration:none;font-weight:700">Cancel</a></td>`,
    "</tr></table>",
    "<p>If you do nothing, your place is kept — this is just a friendly check.</p>",
    `<p>Questions? <a href="mailto:${escapeHtml(SUPPORT_EMAIL)}">${escapeHtml(SUPPORT_EMAIL)}</a></p>`,
  ].join("");
  return { to: input.to, subject, text, html, confirmUrl, cancelUrl };
}

export type AttendanceEmailDispatchResult = Readonly<{
  state: "disabled" | "simulated" | "sent";
  provider: AttendanceEmailProvider;
}>;

/**
 * Dispatch the reminder email through the gated seam. DARK by default:
 *   - `disabled` (the default, and whenever the owner has not enabled delivery):
 *     a logged no-op — the real `send` is NEVER invoked, so no mail leaves.
 *   - `console`: a simulated delivery logged to the server console; `send` is
 *     still not invoked (no ESP wired yet).
 * The real ESP `send` is injected (absent in the product today); when the owner
 * provisions one and flips the flag to a real provider, wire it here. Tests pass
 * a spy `send` and assert it is not called while the flag is off.
 */
export async function dispatchAttendanceReminderEmail(
  draft: AttendanceReminderDraft,
  options: {
    env?: EmailEnvironment;
    send?: (draft: AttendanceReminderDraft) => Promise<void>;
    log?: (message: string, meta: Record<string, unknown>) => void;
  } = {},
): Promise<AttendanceEmailDispatchResult> {
  const env = options.env ?? process.env;
  const log = options.log ?? ((message, meta) => console.info(message, meta));
  const provider = resolveAttendanceEmailProvider(env);

  if (provider === "console") {
    log("Simulated attendance reminder email (delivery is in console/dark mode)", {
      to: draft.to,
      subject: draft.subject,
      confirmUrl: draft.confirmUrl,
      cancelUrl: draft.cancelUrl,
    });
    return { state: "simulated", provider };
  }

  if (provider === "gmail") {
    if (!options.send) throw new Error("Gmail attendance sender is unavailable.");
    await options.send(draft);
    return { state: "sent", provider };
  }

  // provider === "disabled": fail closed — nothing is sent, nothing is simulated.
  log("Attendance reminder email suppressed (EMAIL_DELIVERY_ENABLED is not 'true')", { to: draft.to });
  return { state: "disabled", provider };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
