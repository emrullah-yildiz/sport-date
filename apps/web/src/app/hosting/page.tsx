import Link from "next/link";
import { redirect } from "next/navigation";

import AccountMenu from "@/components/AccountMenu";
import { getMemberEventSummaries, selectHostedEvents, summarizeHostCoordination, type HostedEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Your events — Sport Date" };

function formatWhen(event: HostedEvent) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.timeZone,
  }).format(new Date(event.startsAt));
}

function HostedEventCard({ event }: { event: HostedEvent }) {
  const statusLabel = event.hostedStatus === "upcoming" ? "Upcoming" : "Past";
  const coordination = event.hostCoordination ? summarizeHostCoordination(event.hostCoordination) : null;
  const isUpcoming = event.hostedStatus === "upcoming";
  return (
    <article className={`hosting-card ${event.hostedStatus}`}>
      <div className="hosting-card-top">
        <span>{event.sport}</span>
        <span className={`hosting-status ${event.hostedStatus}`}>{statusLabel}</span>
      </div>
      <h3>{event.title}</h3>
      <div className="hosting-meta">
        <span>{formatWhen(event)}</span>
        <span>{event.areaLabel}, {event.city}</span>
      </div>
      {coordination ? (
        <dl className="hosting-coordination">
          <div className={`hosting-coordination-item${isUpcoming && coordination.hasPending ? " waiting" : ""}`}>
            <dt>Join requests</dt>
            {isUpcoming ? (
              coordination.hasPending ? (
                <dd>
                  <Link href={`/events/${event.id}`} aria-label={`${coordination.pendingLabel} for ${event.title} — open to accept or decline`}>
                    {coordination.pendingLabel} <span aria-hidden="true">→</span>
                  </Link>
                </dd>
              ) : (
                <dd>{coordination.pendingLabel}</dd>
              )
            ) : (
              <dd>Requests are closed</dd>
            )}
          </div>
          <div className="hosting-coordination-item">
            <dt>Places</dt>
            <dd>{coordination.placesLabel}</dd>
          </div>
        </dl>
      ) : null}
      <footer>
        <Link href={`/events/${event.id}`} aria-label={`Manage ${event.title}`}>
          {event.hostedStatus === "upcoming" ? "Manage, edit or cancel" : "Review this event"} <span aria-hidden="true">→</span>
        </Link>
      </footer>
    </article>
  );
}

export default async function HostingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const justCancelled = (await searchParams).event === "cancelled";

  // Reuse the existing member-events data path; the hosting hub only renders the
  // events this member hosts, never another member's events.
  const hostedEvents = selectHostedEvents(await getMemberEventSummaries(user.id));
  const upcoming = hostedEvents.filter((event) => event.hostedStatus === "upcoming");
  const past = hostedEvents.filter((event) => event.hostedStatus === "past");

  return (
    <main className="hosting-page">
      <nav className="profile-nav">
        <Link href="/profile" className="logo">Sport Date</Link>
        <div className="nav-actions">
          <Link href="/events/new">Host an event</Link>
          <AccountMenu firstName={user.firstName} />
        </div>
      </nav>

      <header className="hosting-header">
        <p className="eyebrow">The events you run</p>
        <h1>Your events.</h1>
        <p>Everything you&apos;re hosting, in one place. Open any event to edit the plan or cancel it early if your situation changes — published events stay accurate this way.</p>
      </header>

      {justCancelled ? (
        <p className="hosting-banner" role="status">Event cancelled. Accepted places, room access, and join requests were closed, and it&apos;s no longer listed below.</p>
      ) : null}

      {hostedEvents.length === 0 ? (
        <section className="hosting-empty">
          <h2>You&apos;re not hosting anything yet.</h2>
          <p>When you publish an event it shows up here, so you can always return to edit the time or place, review join requests, or call it off safely.</p>
          <div className="hosting-empty-actions">
            <Link href="/events/new">Host your first event <span aria-hidden="true">→</span></Link>
            <Link href="/discover">Or discover one to join</Link>
          </div>
        </section>
      ) : (
        <section className="hosting-results" aria-live="polite">
          <section className="hosting-section" aria-labelledby="hosting-upcoming">
            <h2 id="hosting-upcoming">{upcoming.length === 0 ? "Nothing coming up" : `${upcoming.length} upcoming`}</h2>
            {upcoming.length === 0 ? (
              <p className="hosting-section-empty">No events on the horizon. <Link href="/events/new">Host a new one</Link> when you&apos;re ready.</p>
            ) : (
              <div className="hosting-grid">{upcoming.map((event) => <HostedEventCard key={event.id} event={event} />)}</div>
            )}
          </section>

          {past.length > 0 ? (
            <section className="hosting-section" aria-labelledby="hosting-past">
              <h2 id="hosting-past">{past.length} {past.length === 1 ? "past event" : "past events"}</h2>
              <div className="hosting-grid">{past.map((event) => <HostedEventCard key={event.id} event={event} />)}</div>
            </section>
          ) : null}
        </section>
      )}
    </main>
  );
}
