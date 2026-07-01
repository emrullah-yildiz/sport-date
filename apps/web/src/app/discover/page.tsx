import Link from "next/link";
import { redirect } from "next/navigation";

import { describeDiscoveryAvailability, formatDiscoveryArea, formatDiscoveryDate, resolveDiscoveryArea } from "@/lib/discovery-card";
import AccountMenu from "@/components/AccountMenu";
import { Wordmark } from "@/lib/brand";
import SiteFooter from "@/components/SiteFooter";
import { getDiscoverableEvents, type DiscoveryFilters } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Discover events" };

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const parameters = await searchParams;
  const text = (value: string | string[] | undefined, maximum: number) => (typeof value === "string" ? value.trim().slice(0, maximum) : "");
  const requestedDays = Number(text(parameters.days, 2) || 7);
  const requestedCity = text(parameters.city, 100);
  // Broaden beyond the member's own area only when they explicitly ask to (an empty
  // `near` param keeps the near-my-area default). This is what makes discovery
  // centre on "around me" without the member having to type their city.
  const searchEverywhere = text(parameters.near, 3).toLowerCase() === "all";
  const area = resolveDiscoveryArea(user.location, requestedCity, searchEverywhere);
  const filters: DiscoveryFilters = {
    city: area.effectiveCity,
    sport: text(parameters.sport, 60),
    language: text(parameters.language, 35),
    withinDays: requestedDays === 1 || requestedDays === 30 ? requestedDays : 7,
  };
  const events = await getDiscoverableEvents(user, filters);
  const hasNarrowingFilters = Boolean(filters.city || filters.sport || filters.language);
  const profileMissingSports = user.sports.length === 0;

  return (
    <main className="discover-page">
      <nav className="profile-nav"><Link href="/profile" className="logo" aria-label="Rally — go to your profile"><Wordmark decorative /></Link><div className="nav-actions"><Link href="/hosting">Your events</Link><Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link><AccountMenu firstName={user.firstName} /></div></nav>
      <header className="discover-header"><p className="eyebrow">Events that fit your movement</p><h1>Something real to do. Someone new to meet.</h1><p>Only events compatible with your sports, experience, adult age range, and active blocks appear here.</p></header>
      {area.isNearMeDefault ? (
        <p className="discover-area-note">
          <span>Showing events near <strong>{area.memberArea}</strong>, your profile area.</span>
          <Link href="/discover?near=all" className="discover-broaden">Search everywhere</Link>
        </p>
      ) : searchEverywhere && !requestedCity ? (
        <p className="discover-area-note">
          <span>Showing events everywhere.</span>
          {area.memberArea ? <Link href="/discover" className="discover-broaden">Back to near {area.memberArea}</Link> : null}
        </p>
      ) : null}
      <form className="discover-filters" method="get">
        <label>City<input name="city" defaultValue={requestedCity} placeholder={area.memberArea ? `Near ${area.memberArea}` : "Any city"} title="Leave blank to see events near your profile area" /></label>
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
            ) : area.isNearMeDefault ? (
              <>
                <p>Nothing&apos;s open near <strong>{area.memberArea}</strong> just yet. Widen your search to see events in other areas, or start one close to home.</p>
                <Link href="/discover?near=all">Search everywhere</Link>
                <Link href="/events/new">Host the first one</Link>
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
            const when = formatDiscoveryDate(event.startsAt, event.timeZone);
            const area = formatDiscoveryArea(event.areaLabel, event.city);
            const availability = describeDiscoveryAvailability(event.placesRemaining);
            return (
              <article className="discovery-card" key={event.id}>
                <div className="discovery-card-scan">
                  <p className="discovery-identity"><span className="discovery-sport">{event.sport}</span><span className="discovery-area">{area}</span></p>
                  <p className="discovery-when"><time dateTime={event.startsAt}><span className="discovery-when-day">{when.day}</span><span className="discovery-when-time">{when.time}</span></time><span className={`discovery-availability${availability.isFull ? " is-full" : ""}`}>{availability.label}</span></p>
                </div>
                <div className="discovery-card-body">
                  <h3>{event.title}</h3>
                  <p className="discovery-description">{event.description}</p>
                </div>
                <div className="discovery-meta"><span>{event.language}</span><span>{event.experienceLevels.join(" / ")}</span><span>Ages {event.minimumAge}–{event.maximumAge}</span></div>
                <footer><span>{event.request ? `Request: ${event.request.status}` : `Hosted by ${event.hostFirstName}`}</span><Link href={`/discover/events/${event.id}`}>{event.request ? "View request" : "See the invitation"}</Link></footer>
              </article>
            );
          })}</div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
