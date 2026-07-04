export type TransactionalEmailProvider = "disabled" | "console" | "gmail";
export type EmailDeliveryEnvironment = Readonly<Record<string, string | undefined>>;

const GMAIL_REQUIRED_KEYS = [
  "GMAIL_CLIENT_ID",
  "GMAIL_CLIENT_SECRET",
  "GMAIL_REFRESH_TOKEN",
  "GMAIL_SENDER_EMAIL",
] as const;

function safeValue(value: string | undefined): boolean {
  return Boolean(value?.trim()) && !/[\r\n]/.test(value ?? "");
}

/** Fail closed unless the feature flag, provider, and every Gmail secret are present. */
export function resolveTransactionalEmailProvider(
  env: EmailDeliveryEnvironment = process.env,
): TransactionalEmailProvider {
  if (env.EMAIL_DELIVERY_ENABLED !== "true") return "disabled";
  if (env.EMAIL_DELIVERY_PROVIDER === "console") return "console";
  if (env.EMAIL_DELIVERY_PROVIDER !== "gmail") return "disabled";
  return GMAIL_REQUIRED_KEYS.every((key) => safeValue(env[key])) ? "gmail" : "disabled";
}
