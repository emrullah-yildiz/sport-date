import type { Metadata } from "next";

import EmailVerificationConfirmCard from "@/components/EmailVerificationConfirmCard";
import { firstSearchParam } from "@/lib/auth-flow";

export const metadata: Metadata = {
  title: "Verify Email - Sport Date",
  description: "Confirm your Sport Date email address and keep your profile secure.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const token = firstSearchParam(parameters.token);

  return (
    <main className="auth-page">
      <EmailVerificationConfirmCard token={token} />
    </main>
  );
}
