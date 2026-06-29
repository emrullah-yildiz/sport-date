import "server-only";

import type { AuthEmailDraft } from "@/lib/auth-email-content";

export type AuthEmailProvider = "disabled" | "console";
export type AuthEmailDispatchState = "disabled" | "simulated";

export type AuthEmailDispatchResult = Readonly<{
  state: AuthEmailDispatchState;
  provider: AuthEmailProvider;
  messageId: string | null;
}>;

type AuthEmailEnvironment = Readonly<Record<string, string | undefined>>;

export function resolveAuthEmailProvider(env: AuthEmailEnvironment = process.env): AuthEmailProvider {
  if (env.EMAIL_DELIVERY_ENABLED !== "true") return "disabled";
  return env.EMAIL_DELIVERY_PROVIDER === "console" ? "console" : "disabled";
}

export function canSendAuthEmails(env: AuthEmailEnvironment = process.env): boolean {
  return resolveAuthEmailProvider(env) !== "disabled";
}

export async function dispatchAuthEmail(
  draft: AuthEmailDraft,
  env: AuthEmailEnvironment = process.env,
): Promise<AuthEmailDispatchResult> {
  const provider = resolveAuthEmailProvider(env);

  if (provider === "console") {
    const messageId = `sim_${draft.kind}_${Date.now().toString(36)}`;
    console.info("Simulated auth email delivery", {
      provider,
      kind: draft.kind,
      to: draft.to,
      subject: draft.subject,
      actionUrl: draft.actionUrl,
      expiresAt: draft.expiresAt,
      messageId,
    });
    return { state: "simulated", provider, messageId };
  }

  return { state: "disabled", provider: "disabled", messageId: null };
}
