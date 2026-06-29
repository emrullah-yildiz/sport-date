import Link from "next/link";
import { redirect } from "next/navigation";

import FeedbackWorkspace from "@/components/FeedbackWorkspace";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Share feedback - Sport Date" };

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="feedback-page">
      <nav className="profile-nav" aria-label="Feedback navigation">
        <Link href="/profile" className="logo">Sport Date</Link>
        <Link href="/profile">Back to profile</Link>
      </nav>
      <header className="feedback-header">
        <p className="eyebrow">Help shape the experience</p>
        <h1>Tell us where the rhythm broke.</h1>
        <p>
          Share what you were trying to do and what happened instead. Your feedback is private to the team
          and helps us make the next visit clearer.
        </p>
      </header>
      <FeedbackWorkspace />
    </main>
  );
}
