import Link from "next/link";
import { redirect } from "next/navigation";

import { buildDiscoveryGreeting, describeDiscoveryAvailability, describeDiscoveryResultsHeading, formatDiscoveryArea, formatDiscoveryDate, resolveDiscoveryArea, toDisplayCase } from "@/lib/discovery-card";
import { applyAdvancedFilters, ALL_RADIUS_OPTIONS_KM, resolveAdvancedFilters, SCHEDULE_WINDOWS } from "@/lib/discovery-advanced-filters";
import { coarsenCoordinates, filterEventsWithinRadius, parseRadiusKm, RADIUS_OPTIONS_KM, resolveDiscoveryCentre } from "@/lib/discovery-geo";
import { isPlus } from "@/lib/entitlements";
import { joinRequestStateHeadline } from "@/lib/join-request-policy";
import PrimaryNav from "@/components/PrimaryNav";
import RegionInterestSignal from "@/components/RegionInterestSignal";
import SiteFooter from "@/components/SiteFooter";
import UseMyLocationControl from "@/components/UseMyLocationControl";
import { getDiscoverableEvents, type DiscoveryEvent, type DiscoveryFilters } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

const SCHEDULE_LABELS: Record<(typeof SCHEDULE_WINDOWS)[number], string> = {
  morning: "Mornings (5am–12pm)",
  afternoon: "Afternoons (12–5pm)",
  evening: "Evenings (5–11pm)",
  weekend: "Weekends only",
};

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
  // Plus perk gate (CX-20260701-plus-perks-advanced-discovery-filters). ONE
  // entitlement check decides whether the advanced convenience filters (finer
  // radius bands, schedule/time-of-day, multi-language) apply. `resolveAdvancedFilters`
  // fails closed: a free / expired / unconfirmable member gets NO advanced facets, so
  // their discovery is exactly the baseline (all free filters, all eligible events,
  // nothing silently excluded). Safety/core discovery is never routed through here.
  const plus = isPlus(user);
  const advanced = resolveAdvancedFilters(plus, {
    radius: text(parameters.radius, 3),
    schedule: text(parameters.schedule, 12),
    languages: parameters.languages,
  });
  // The free radius set is 5/25/100; a Plus member may additionally pick a finer band.
  // A free member's radius is parsed only against the free set, so a finer band typed
  // into the URL by a non-Plus member is ignored (fails closed to their area default).
  const requestedRadiusKm = advanced.radiusKm ?? parseRadiusKm(text(parameters.radius, 3));
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
  const withinRadius: DiscoveryEvent[] =
    radiusActive && geoCentre ? filterEventsWithinRadius(fetched, geoCentre.coordinates, requestedRadiusKm!, centreCity) : fetched;
  // Advanced schedule + multi-language facets are applied in-process AFTER the
  // eligibility query and the radius filter. `advanced` is already fail-closed to
  // inactive for a free member, so this is a no-op for them. It only NARROWS at the
  // member's own request — never bypasses any eligibility/safety gate.
  const events: DiscoveryEvent[] = applyAdvancedFilters(withinRadius, advanced);
  const hasNarrowingFilters = Boolean(filters.city || filters.sport || filters.language || advanced.anyActive);
  // When a radius returns nothing, offer to widen to the next-larger option, or to
  // search everywhere if already at the widest. Preserves the current query params.
  // Widen to the next-larger band in the set the member is actually offered (Plus
  // members' finer bands are included so "widen" still moves up one real step).
  const radiusLadder = plus ? ALL_RADIUS_OPTIONS_KM : (RADIUS_OPTIONS_KM as readonly number[]);
  const nextRadiusKm = radiusActive ? radiusLadder.find((km) => km > requestedRadiusKm!) : undefined;
  const widenRadiusHref = (() => {
    const next = new URLSearchParams();
    for (const key of ["sport", "language", "days", "city", "lat", "lng", "schedule"]) {
      const value = text(parameters[key], 40);
      if (value) next.set(key, value);
    }
    for (const language of advanced.languages) next.append("languages", language);
    if (nextRadiusKm) {
      next.set("radius", String(nextRadiusKm));
      return `/discover?${next.toString()}`;
    }
    next.set("near", "all");
    next.delete("lat");
    next.delete("lng");
    return `/discover?${next.toString()}`;
  })();
  // Warm, personal, located arrival greeting — built only from the member's own first
  // name and approximate profile area (no new data/query, no precise location, no
  // fabricated traction). Replaces the static pre-signup marketing hero.
  // Display-only de-shouting: a member whose stored name/area is all-caps ("BUCHAREST")
  // shouldn't have it echoed back a dozen times. Never used for the DB query — that
  // still runs on area.effectiveCity (raw).
  const displayArea = toDisplayCase(area.memberArea);
  const greeting = buildDiscoveryGreeting(toDisplayCase(user.firstName), displayArea, { searchEverywhere });

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
            {geoCentre.source === "device" ? "your approximate current area" : <strong>{displayArea}</strong>}.
          </span>
          <Link href="/discover" className="discover-broaden">Back to my area</Link>
        </p>
      ) : area.isNearMeDefault ? (
        <p className="discover-area-note">
          <span>You&apos;re seeing events open near <strong>{displayArea}</strong>, your profile area, that you&apos;re eligible to join.</span>
          <Link href="/discover?near=all" className="discover-broaden">Search everywhere</Link>
        </p>
      ) : searchEverywhere && !requestedCity ? (
        <p className="discover-area-note">
          <span>You&apos;re seeing events open everywhere that you&apos;re eligible to join.</span>
          {displayArea ? <Link href="/discover" className="discover-broaden">Back to near {displayArea}</Link> : null}
        </p>
      ) : (
        <p className="discover-area-note">
          <span>You&apos;re seeing events you&apos;re eligible to join.</span>
        </p>
      )}
      <form className="discover-filters" method="get">
        <label>City<input name="city" defaultValue={requestedCity} placeholder={displayArea ? `Near ${displayArea}` : "Any city"} title="Leave blank to see events near your profile area" /></label>
        <label>Sport<input name="sport" defaultValue={filters.sport} placeholder="Any sport" title="Leave blank to see events for every sport; type one to narrow to it" /></label>
        <label>Language<input name="language" defaultValue={filters.language} placeholder="Any compatible" title="Defaults to any compatible language" /></label>
        <label>When<select name="days" defaultValue={String(filters.withinDays)}><option value="1">Next 24 hours</option><option value="7">Next 7 days</option><option value="30">Next 30 days</option></select></label>
        <label>Distance<select name="radius" defaultValue={requestedRadiusKm ? String(requestedRadiusKm) : ""} title={plus ? "Filter by how far you'll travel, with finer Plus distance bands." : "Filter by how far you'll travel. 'My area' keeps the profile-area default; 'Search everywhere' is on the note above."}>
          <option value="">My area</option>
          {(plus ? ALL_RADIUS_OPTIONS_KM : (RADIUS_OPTIONS_KM as readonly number[])).map((km) => <option key={km} value={String(km)}>{`Within ${km} km`}</option>)}
        </select></label>
        {plus ? (
          <label>Schedule<select name="schedule" defaultValue={advanced.schedule ?? ""} title="Plus: narrow to a time of day or weekends only.">
            <option value="">Any time</option>
            {SCHEDULE_WINDOWS.map((window) => <option key={window} value={window}>{SCHEDULE_LABELS[window]}</option>)}
          </select></label>
        ) : null}
        {plus ? (
          <label>More languages<input name="languages" defaultValue={advanced.languages.join(", ")} placeholder="e.g. English, Romanian" title="Plus: accept events in any of these languages (comma-separated). You still only see events you're eligible for." /></label>
        ) : null}
        {parameters.lat && parameters.lng ? <input type="hidden" name="lat" value={text(parameters.lat, 12)} /> : null}
        {parameters.lat && parameters.lng ? <input type="hidden" name="lng" value={text(parameters.lng, 12)} /> : null}
        <button type="submit">Find my events</button>
      </form>
      {plus ? null : (
        <p className="discover-plus-note">
          KeepItUp Plus adds finer distance bands, a schedule filter, and multi-language discovery. Your discovery here is already complete without it — these are just extra ways to narrow the search.{" "}
          <Link href="/profile" className="discover-plus-link">See what Plus adds</Link>
        </p>
      )}
      <UseMyLocationControl defaultRadiusKm={RADIUS_OPTIONS_KM[1]} />

      <section className="discovery-results" aria-live="polite">
        <div className="results-heading"><h2>{events.length === 0 ? "A quiet court—for now." : describeDiscoveryResultsHeading({ count: events.length, memberArea: displayArea, isNearMeDefault: area.isNearMeDefault, searchEverywhere })}</h2><p>Exact meeting points stay hidden until a host accepts a request.</p></div>
        {events.length === 0 ? (
          <div className="discovery-empty">
            {radiusActive ? (
              <>
                <p>Nothing&apos;s open within <strong>{requestedRadiusKm} km</strong> just yet. {nextRadiusKm ? `Try widening the distance to ${nextRadiusKm} km` : "Try searching everywhere"}, or start one close to home.</p>
                <Link href={widenRadiusHref}>{nextRadiusKm ? `Widen to ${nextRadiusKm} km` : "Search everywhere"}</Link>
                <Link href="/events/new">Host the first one</Link>
              </>
            ) : area.isNearMeDefault ? (
              <RegionInterestSignal area={displayArea} />
            ) : hasNarrowingFilters ? (
              <>
                <p>Nothing matches these filters right now. Try widening your search — clear the city, sport, or language filters, or look further ahead in time.</p>
                <Link href="/discover">Clear the filters</Link>
              </>
            ) : (
              <RegionInterestSignal area={displayArea} />
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
                  <p className="discovery-when"><time dateTime={when.machineDateTime}><span className="discovery-when-day">{when.day}</span><span className="discovery-when-time">{when.time}</span></time><span className={`discovery-availability${availability.isFull ? " is-full" : ""}`}>{availability.label}</span></p>
                </div>
                <div className="discovery-card-body">
                  <h3>{event.title}</h3>
                  <p className="discovery-description">{event.description}</p>
                </div>
                <div className="discovery-meta"><span>{event.language}</span><span>{event.experienceLevels.join(" / ")}</span><span>Ages {event.minimumAge}–{event.maximumAge}</span></div>
                <footer><span>{event.request ? joinRequestStateHeadline(event.request.status) : `Hosted by ${event.hostFirstName}`}</span><Link href={`/discover/events/${event.id}`}>{event.request && (event.request.status === "pending" || event.request.status === "accepted") ? "Manage request" : event.request ? "View request" : "See the invitation"}</Link></footer>
              </article>
            );
          })}</div>
        )}
      </section>
      <SiteFooter />
    </main>
  );
}
