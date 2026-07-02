import { redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import FeedbackWorkspace from "@/components/FeedbackWorkspace";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Share feedback" };

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="feedback-page">
      <PrimaryNav firstName={user.firstName} />
      <header className="feedback-header">
        <p className="eyebrow">Help shape the experience</p>
        <h1>Tell us how the rhythm feels.</h1>
        <p>
          Share an idea, a kind word, or something that didn&apos;t work. Anything that shapes the experience
          belongs here. Your note is private to the team and helps us make the next visit clearer.
        </p>
      </header>
      <FeedbackWorkspace />
    </main>
  );
}
