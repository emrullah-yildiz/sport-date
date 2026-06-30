import Link from "next/link";

export default function HostingLoading() {
  return (
    <main className="hosting-page">
      <nav className="profile-nav">
        <Link href="/profile" className="logo">Sport Date</Link>
        <Link href="/events/new">Host an event</Link>
      </nav>
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
