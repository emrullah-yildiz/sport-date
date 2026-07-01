"use client";

import Link from "next/link";
import { useEffect } from "react";

import PrimaryNav from "@/components/PrimaryNav";

export default function HostingError({
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
    <main className="hosting-page">
      <PrimaryNav
        current="host"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link>}
      />
      <section className="hosting-empty" role="alert">
        <h2>We couldn&apos;t load your events.</h2>
        <p>This is on our side, not yours — your events are safe. Try again, or head back to your profile.</p>
        <div className="hosting-empty-actions">
          <button type="button" onClick={() => unstable_retry()}>Try again</button>
          <Link href="/profile">Back to your profile</Link>
        </div>
      </section>
    </main>
  );
}
