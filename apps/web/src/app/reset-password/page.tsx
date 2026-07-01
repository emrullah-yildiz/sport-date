import type { Metadata } from "next";

import { BRAND_NAME } from "@/lib/brand";
import PasswordResetConfirmCard from "@/components/PasswordResetConfirmCard";
import { firstSearchParam } from "@/lib/auth-flow";

export const metadata: Metadata = {
  title: "Reset Password",
  description: `Choose a new ${BRAND_NAME} password from your secure recovery link.`,
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
