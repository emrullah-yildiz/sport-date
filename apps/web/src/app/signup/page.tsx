import { connection } from "next/server";

import SignUpForm from "@/components/SignUpForm";
import { resolveTransactionalEmailProvider } from "@/lib/email-provider";

export const metadata = {
  title: "Sign Up",
  description: "Create a profile and meet people through sports. The early preview is open to adults — no invite needed.",
};

export default async function SignUpPage() {
  // Read the transactional-email provider at REQUEST time (not build time) so the
  // account-created success copy honestly reflects whether verification delivery is
  // actually live. `connection()` opts this segment into dynamic rendering, per the
  // Next.js runtime-env guidance, so toggling delivery needs no rebuild.
  await connection();
  const emailDeliveryLive = resolveTransactionalEmailProvider() === "gmail";
  return <main className="signup-page-main"><SignUpForm emailDeliveryLive={emailDeliveryLive} /></main>;
}

