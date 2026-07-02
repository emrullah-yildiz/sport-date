"use client";

// Scoped route-segment error boundary for the restricted moderation area. It
// wraps `/moderation` and its nested `reports/[reportId]` segment, so a
// transient failure of `getModerationQueue` / `getModerationCase` stays here as
// a calm staff retry instead of falling through to the app-wide
// `global-error.tsx`.
//
// Mirrors `hosting/error.tsx`: a Client Component receiving `{ error,
// unstable_retry }`. NOTHING internal (message, stack, `digest`, SQL, or column
// names) is shown — only a redacted, human message. Access here stays logged by
// the underlying flow; this fallback adds no data fetch of its own.

import Link from "next/link";
import { useEffect } from "react";

import { Wordmark } from "@/lib/brand";

export default function ModerationError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="moderation-page">
      <nav className="profile-nav">
        <Link href="/landing" className="logo" aria-label="Rally home"><Wordmark decorative /></Link>
        <Link href="/profile">Leave staff area</Link>
      </nav>
      <header className="moderation-header">
        <p className="eyebrow">Restricted staff area</p>
        <h1>The moderation queue didn&apos;t load.</h1>
        <p>This is a transient problem on our side. No case data has changed, and access here stays logged. Try again in a moment.</p>
      </header>
      <section className="moderation-list moderation-queue" aria-label="Moderation error">
        <article className="safety-case-empty" role="alert">
          <h2>Couldn&apos;t reach the queue</h2>
          <p>We hit a snag loading moderation cases. Retry to re-run the request; if it keeps failing, check back shortly rather than reloading repeatedly.</p>
          <div className="safety-guidance-pointer-actions">
            <button type="button" className="btn btn--accent" onClick={() => unstable_retry()}>Try again</button>
            <Link href="/profile" className="safety-guidance-link">Leave staff area</Link>
          </div>
        </article>
      </section>
    </main>
  );
}
