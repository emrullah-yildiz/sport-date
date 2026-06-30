import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Staff area only - Sport Date",
  description: "The moderation area is limited to Sport Date safety staff.",
};

export default function ModerationNotFound() {
  return (
    <main className="auth-page">
      <div className="auth-card auth-flow-card">
        <div className="auth-flow-copy">
          <p className="eyebrow">Restricted staff area</p>
          <h1>This area is for safety staff</h1>
          <p className="auth-intro">
            The moderation tools are limited to Sport Date&apos;s safety staff. Nothing is wrong with
            your account &mdash; you have simply reached a page that is not part of your space.
          </p>
        </div>
        <div className="auth-flow-note">
          Access here is logged and kept separate from member profiles. If you believe you should
          have staff access, contact the safety team rather than retrying this link.
        </div>
        <div className="auth-flow-actions">
          <Link className="btn-primary" href="/profile">Back to your profile</Link>
          <Link className="btn-secondary" href="/discover">Discover events</Link>
        </div>
      </div>
    </main>
  );
}
