import "server-only";

import type { AuthEmailDraft } from "@/lib/auth-email-content";
import { resolveTransactionalEmailProvider, type EmailDeliveryEnvironment } from "@/lib/email-provider";
import { sendGmailEmail } from "@/lib/gmail-email-delivery";

export type AuthEmailProvider = "disabled" | "console" | "gmail";
export type AuthEmailDispatchState = "disabled" | "simulated" | "sent";

export type AuthEmailDispatchResult = Readonly<{
  state: AuthEmailDispatchState;
  provider: AuthEmailProvider;
  messageId: string | null;
}>;

type AuthEmailEnvironment = EmailDeliveryEnvironment;

export function resolveAuthEmailProvider(env: AuthEmailEnvironment = process.env): AuthEmailProvider {
  return resolveTransactionalEmailProvider(env);
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
      expiresAt: draft.expiresAt,
      messageId,
    });
    return { state: "simulated", provider, messageId };
  }

  if (provider === "gmail") {
    const result = await sendGmailEmail(draft, { env });
    return { state: "sent", provider, messageId: result.messageId };
  }

  return { state: "disabled", provider: "disabled", messageId: null };
}
