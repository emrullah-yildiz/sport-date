import Link from "next/link";
import { redirect } from "next/navigation";

import { buildDiscoveryGreeting, describeDiscoveryAvailability, describeDiscoveryResultsHeading, formatDiscoveryArea, formatDiscoveryDate, resolveDiscoveryArea } from "@/lib/discovery-card";
import { coarsenCoordinates, filterEventsWithinRadius, parseRadiusKm, RADIUS_OPTIONS_KM, resolveDiscoveryCentre } from "@/lib/discovery-geo";
import PrimaryNav from "@/components/PrimaryNav";
import SiteFooter from "@/components/SiteFooter";
import UseMyLocationControl from "@/components/UseMyLocationControl";
import { getDiscoverableEvents, type DiscoveryEvent, type DiscoveryFilters } from "@/lib/events";
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

  // Distance-radius filter (CX-20260701-discover-geo-radius-and-use-my-location).
  // A radius is opt-in: with no `radius` param we keep the existing area-label
  // behaviour untouched. When a radius IS chosen we resolve a COARSE centre — an
  // opt-in device position (client-coarsened `lat`/`lng` params, used for this search
  // only, never stored) if present, else the member's profile area geocoded offline —
  // and match by real distance. Because the radius spans nearby cities, we drop the
  // exact-city label constraint from the DB query and filter by distance in-process
  // (an event we cannot geocode falls back to a same-city label match, so the radius
  // is purely additive and never hides an event the old behaviour would have shown).
  const requestedRadiusKm = parseRadiusKm(text(parameters.radius, 3));
  const deviceCoordinates = coarsenCoordinates(text(parameters.lat, 12), text(parameters.lng, 12));
  const geoCentre = requestedRadiusKm ? resolveDiscoveryCentre({ deviceCoordinates, profileArea: user.location }) : null;
  const radiusActive = Boolean(requestedRadiusKm && geoCentre);

  const filters: DiscoveryFilters = {
    // When a radius is active the distance filter owns location; a specific typed city
    // still narrows to that city, but the near-me default city is cleared so nearby
    // areas within the radius are fetched.
    city: radiusActive && !requestedCity ? "" : area.effectiveCity,
    sport: text(parameters.sport, 60),
    language: text(parameters.language, 35),
    withinDays: requestedDays === 1 || requestedDays === 30 ? requestedDays : 7,
  };
  const fetched = await getDiscoverableEvents(user, filters);
  const centreCity = requestedCity || area.memberArea;
  const events: DiscoveryEvent[] =
    radiusActive && geoCentre ? filterEventsWithinRadius(fetched, geoCentre.coordinates, requestedRadiusKm!, centreCity) : fetched;
  const hasNarrowingFilters = Boolean(filters.city || filters.sport || filters.language);
  // When a radius returns nothing, offer to widen to the next-larger option, or to
  // search everywhere if already at the widest. Preserves the current query params.
  const nextRadiusKm = radiusActive ? RADIUS_OPTIONS_KM.find((km) => km > requestedRadiusKm!) : undefined;
  const widenRadiusHref = (() => {
    const next = new URLSearchParams();
    for (const key of ["sport", "language", "days", "city", "lat", "lng"]) {
      const value = text(parameters[key], 40);
      if (value) next.set(key, value);
    }
    if (nextRadiusKm) {
      next.set("radius", String(nextRadiusKm));
      return `/discover?${next.toString()}`;
    }
    next.set("near", "all");
    next.delete("lat");
    next.delete("lng");
    return `/discover?${next.toString()}`;
  })();
  const profileMissingSports = user.sports.length === 0;
  // Warm, personal, located arrival greeting — built only from the member's own first
  // name and approximate profile area (no new data/query, no precise location, no
  // fabricated traction). Replaces the static pre-signup marketing hero.
  const greeting = buildDiscoveryGreeting(user.firstName, area.memberArea, { searchEverywhere });

  return (
    <main className="discover-page">
      <PrimaryNav
        firstName={user.firstName}
        current="discover"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link>}
      />
      <header className="discover-header"><h1>{greeting.heading}</h1><p className="discover-greeting-sub">{greeting.subheading}</p></header>
      {radiusActive && geoCentre ? (
        <p className="discover-area-note">
          <span>
            You&apos;re seeing events within <strong>{requestedRadiusKm} km</strong> of{" "}
            {geoCentre.source === "device" ? "your approximate current area" : <>near <strong>{area.memberArea}</strong></>}.
          </span>
          <Link href="/discover" className="discover-broaden">Back to my area</Link>
        </p>
      ) : area.isNearMeDefault ? (
        <p className="discover-area-note">
          <span>You&apos;re seeing events that fit your sports and age range near <strong>{area.memberArea}</strong>, your profile area.</span>
          <Link href="/discover?near=all" className="discover-broaden">Search everywhere</Link>
        </p>
      ) : searchEverywhere && !requestedCity ? (
        <p className="discover-area-note">
          <span>You&apos;re seeing events that fit your sports and age range, everywhere.</span>
          {area.memberArea ? <Link href="/discover" className="discover-broaden">Back to near {area.memberArea}</Link> : null}
        </p>
      ) : (
        <p className="discover-area-note">
          <span>You&apos;re seeing events that fit your sports and age range.</span>
        </p>
      )}
      <form className="discover-filters" method="get">
        <label>City<input name="city" defaultValue={requestedCity} placeholder={area.memberArea ? `Near ${area.memberArea}` : "Any city"} title="Leave blank to see events near your profile area" /></label>
        <label>Sport<input name="sport" defaultValue={filters.sport} placeholder="Any in your profile" title="Defaults to any sport in your profile" /></label>
        <label>Language<input name="language" defaultValue={filters.language} placeholder="Any compatible" title="Defaults to any compatible language" /></label>
        <label>When<select name="days" defaultValue={String(filters.withinDays)}><option value="1">Next 24 hours</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option></select></label>
        <label>Distance<select name="radius" defaultValue={requestedRadiusKm ? String(requestedRadiusKm) : ""} title="Filter by how far you'll travel. 'My area' keeps the profile-area default; 'Search everywhere' is on the note above.">
          <option value="">My area</option>
          {RADIUS_OPTIONS_KM.map((km) => <option key={km} value={String(km)}>{`Within ${km} km`}</option>)}
        </select></label>
        {parameters.lat && parameters.lng ? <input type="hidden" name="lat" value={text(parameters.lat, 12)} /> : null}
        {parameters.lat && parameters.lng ? <input type="hidden" name="lng" value={text(parameters.lng, 12)} /> : null}
        <button type="submit">Find my events</button>
      </form>
      <UseMyLocationControl defaultRadiusKm={RADIUS_OPTIONS_KM[1]} />

      <section className="discovery-results" aria-live="polite">
        <div className="results-heading"><h2>{events.length === 0 ? "A quiet court—for now." : describeDiscoveryResultsHeading({ count: events.length, memberArea: area.memberArea, isNearMeDefault: area.isNearMeDefault, searchEverywhere })}</h2><p>Exact meeting points stay hidden until a host accepts a request.</p></div>
        {events.length === 0 ? (
          <div className="discovery-empty">
            {profileMissingSports ? (
              <>
                <p>We match you to events by the sports in your profile, and your profile doesn&apos;t list any yet. Add a sport you play and your matches will start showing up here.</p>
                <Link href="/profile">Add a sport to your profile</Link>
              </>
            ) : radiusActive ? (
              <>
                <p>Nothing&apos;s open within <strong>{requestedRadiusKm} km</strong> just yet. {nextRadiusKm ? `Try widening the distance to ${nextRadiusKm} km` : "Try searching everywhere"}, or start one close to home.</p>
                <Link href={widenRadiusHref}>{nextRadiusKm ? `Widen to ${nextRadiusKm} km` : "Search everywhere"}</Link>
                <Link href="/events/new">Host the first one</Link>
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
