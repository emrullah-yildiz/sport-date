import type { Metadata } from "next";

import PasswordResetConfirmCard from "@/components/PasswordResetConfirmCard";
import { firstSearchParam } from "@/lib/auth-flow";

export const metadata: Metadata = {
  title: "Reset Password - Sport Date",
  description: "Choose a new Sport Date password from your secure recovery link.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const token = firstSearchParam(parameters.token);

  return (
    <main className="auth-page">
      <PasswordResetConfirmCard token={token} />
    </main>
  );
}
