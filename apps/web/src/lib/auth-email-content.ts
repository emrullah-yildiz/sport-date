import { BRAND_NAME } from "@/lib/brand";

export type AuthEmailKind = "email_verification" | "password_reset";

export type AuthEmailDraft = Readonly<{
  kind: AuthEmailKind;
  to: string;
  subject: string;
  html: string;
  text: string;
  actionUrl: string;
  expiresAt: string;
  metadata: Readonly<{
    flow: AuthEmailKind;
    expiresAt: string;
  }>;
}>;

type AuthEmailEnvironment = Readonly<Record<string, string | undefined>>;

function normalizeOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function resolveAuthEmailOrigin(env: AuthEmailEnvironment = process.env): string | null {
  return (
    normalizeOrigin(env.APP_BASE_URL)
    ?? normalizeOrigin(env.NEXT_PUBLIC_APP_URL)
    ?? normalizeOrigin(env.SITE_URL)
  );
}

export function composeAuthActionUrl(origin: string, pathname: "/verify-email" | "/reset-password", token: string): string {
  const url = new URL(pathname, origin.endsWith("/") ? origin : `${origin}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

type BuildVerificationEmailArgs = Readonly<{
  origin: string;
  email: string;
  token: string;
  expiresAt: Date;
}>;

type BuildPasswordResetEmailArgs = Readonly<{
  origin: string;
  email: string;
  token: string;
  expiresAt: Date;
}>;

export function buildEmailVerificationDraft({ origin, email, token, expiresAt }: BuildVerificationEmailArgs): AuthEmailDraft {
  const actionUrl = composeAuthActionUrl(origin, "/verify-email", token);
  const expiresIso = expiresAt.toISOString();
  return {
    kind: "email_verification",
    to: email,
    subject: `Verify your ${BRAND_NAME} email`,
    actionUrl,
    expiresAt: expiresIso,
    metadata: {
      flow: "email_verification",
      expiresAt: expiresIso,
    },
    text: [
      `Verify your ${BRAND_NAME} email.`,
      "",
      `You received this message because a ${BRAND_NAME} account asked to confirm this inbox.`,
      `Verification link: ${actionUrl}`,
      `This link expires at ${expiresIso}.`,
      "",
      `If you did not create or update a ${BRAND_NAME} account, you can ignore this email.`,
    ].join("\n"),
    html: [
      `<p>Verify your ${BRAND_NAME} email.</p>`,
      `<p>You received this message because a ${BRAND_NAME} account asked to confirm this inbox.</p>`,
      `<p><a href="${actionUrl}">Verify email</a></p>`,
      `<p>This link expires at <strong>${expiresIso}</strong>.</p>`,
      `<p>If you did not create or update a ${BRAND_NAME} account, you can ignore this email.</p>`,
    ].join(""),
  };
}

export function buildPasswordResetDraft({ origin, email, token, expiresAt }: BuildPasswordResetEmailArgs): AuthEmailDraft {
  const actionUrl = composeAuthActionUrl(origin, "/reset-password", token);
  const expiresIso = expiresAt.toISOString();
  return {
    kind: "password_reset",
    to: email,
    subject: `Reset your ${BRAND_NAME} password`,
    actionUrl,
    expiresAt: expiresIso,
    metadata: {
      flow: "password_reset",
      expiresAt: expiresIso,
    },
    text: [
      `Reset your ${BRAND_NAME} password.`,
      "",
      `A password reset was requested for this ${BRAND_NAME} account.`,
      `Reset link: ${actionUrl}`,
      `This link expires at ${expiresIso}.`,
      "Nothing changes unless you complete the reset form from that link.",
      "",
      "If you did not request a reset, you can ignore this email.",
    ].join("\n"),
    html: [
      `<p>Reset your ${BRAND_NAME} password.</p>`,
      `<p>A password reset was requested for this ${BRAND_NAME} account.</p>`,
      `<p><a href="${actionUrl}">Choose a new password</a></p>`,
      `<p>This link expires at <strong>${expiresIso}</strong>.</p>`,
      "<p>Nothing changes unless you complete the reset form from that link.</p>",
      "<p>If you did not request a reset, you can ignore this email.</p>",
    ].join(""),
  };
}
