import Link from "next/link";
import { redirect } from "next/navigation";

import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Discover events — Sport Date" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parameters = await searchParams;
  const text = (value: string | string[] | undefined, maximum: number) => (typeof value === "string" ? value.trim().slice(0, maximum) : "");
  const requestedDays = Number(text(parameters.days, 2) || 7);
  const filters: DiscoveryFilters = {
    city: text(parameters.city, 100),
    sport: text(parameters.sport, 60),
    language: text(parameters.language, 35),
    withinDays: requestedDays === 1 || requestedDays === 30 ? requestedDays : 7,
  };
  const events = await getDiscoverableEvents(user, filters);
  const hasNarrowingFilters = Boolean(filters.city || filters.sport || filters.language);
  const profileMissingSports = user.sports.length === 0;

  return (
    <main className="discover-page">
      <nav className="profile-nav"><Link href="/profile" className="logo">Sport Date</Link><Link href="/events/new">Host an event</Link></nav>
      <header className="discover-header"><p className="eyebrow">Events that fit your movement</p><h1>Something real to do. Someone new to meet.</h1><p>Only events compatible with your sports, experience, adult age range, and active blocks appear here.</p></header>
      <form className="discover-filters" method="get">
        <label>City<input name="city" defaultValue={filters.city} placeholder={user.location} /></label>
        <label>Sport<input name="sport" defaultValue={filters.sport} placeholder="Any in your profile" title="Defaults to any sport in your profile" /></label>
        <label>Language<input name="language" defaultValue={filters.language} placeholder="Any compatible" title="Defaults to any compatible language" /></label>
        <label>When<select name="days" defaultValue={String(filters.withinDays)}><option value="1">Next 24 hours</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option></select></label>
        <button type="submit">Find my events</button>
      </form>

      <section className="discovery-results" aria-live="polite">
        <div className="results-heading"><h2>{events.length === 0 ? "A quiet court—for now." : `${events.length} ${events.length === 1 ? "invitation" : "invitations"}`}</h2><p>Exact meeting points stay hidden until a host accepts a request.</p></div>
        {events.length === 0 ? (
          <div className="discovery-empty">
            {profileMissingSports ? (
              <>
                <p>We match you to events by the sports in your profile, and your profile doesn&apos;t list any yet. Add a sport you play and your matches will start showing up here.</p>
                <Link href="/profile">Add a sport to your profile</Link>
              </>
            ) : hasNarrowingFilters ? (
              <>
                <p>Nothing matches these filters right now. Try widening your search — clear the city, sport, or language filters, or look further ahead in time.</p>
                <Link href="/discover">Clear the filters</Link>
              </>
            ) : (
              <>
                <p>No compatible events are open near you just yet. It can also help to add more sports and the languages you&apos;re comfortable with to your profile, so more events can match you. Or you can start one yourself.</p>
                <Link href="/profile">Update your profile</Link>
                <Link href="/events/new">Host the first one</Link>
              </>
            )}
          </div>
        ) : (
          <div className="discovery-grid">{events.map((event) => {
            const startsAt = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: event.timeZone }).format(new Date(event.startsAt));
            return <article className="discovery-card" key={event.id}><div className="discovery-card-top"><span>{event.sport}</span><span>{event.areaLabel}, {event.city}</span></div><h3>{event.title}</h3><p>{event.description}</p><div className="discovery-meta"><span>{startsAt}</span><span>{event.placesRemaining} places</span><span>{event.language}</span><span>{event.experienceLevels.join(" / ")}</span><span>Ages {event.minimumAge}–{event.maximumAge}</span></div><footer><span>{event.request ? `Request: ${event.request.status}` : `Hosted by ${event.hostFirstName}`}</span><Link href={`/discover/events/${event.id}`}>{event.request ? "View request" : "See the invitation"}</Link></footer></article>;
          })}</div>
        )}
      </section>
    </main>
  );
}
