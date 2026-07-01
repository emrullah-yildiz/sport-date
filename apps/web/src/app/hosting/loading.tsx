import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";

export default function HostingLoading() {
  return (
    <main className="hosting-page">
      <PrimaryNav
        current="host"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link>}
      />
      <header className="hosting-header">
        <p className="eyebrow">The events you run</p>
        <h1>Your events.</h1>
        <p>Gathering the events you&apos;re hosting…</p>
      </header>
      <div className="hosting-grid" aria-hidden="true">
        <div className="hosting-card skeleton" />
        <div className="hosting-card skeleton" />
      </div>
      <p className="visually-hidden" role="status">Loading your hosted events.</p>
    </main>
  );
}
