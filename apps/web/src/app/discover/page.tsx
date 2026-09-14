import Link from "next/link";
import EventStage from "@/components/discovery/EventStage";
import SportArtwork from "@/components/discovery/SportArtwork";
import styles from "@/components/discovery/discovery.module.css";
import { redirect } from "next/navigation";

import { describeDiscoveryAvailability, describeDiscoveryResultsHeading, formatDiscoveryArea, formatDiscoveryDate, resolveDiscoveryArea, toDisplayCase } from "@/lib/discovery-card";
import { applyAdvancedFilters, ALL_RADIUS_OPTIONS_KM, resolveAdvancedFilters, SCHEDULE_WINDOWS } from "@/lib/discovery-advanced-filters";
import { coarsenCoordinates, filterEventsWithinRadius, parseRadiusKm, RADIUS_OPTIONS_KM, resolveDiscoveryCentre } from "@/lib/discovery-geo";
import { isPlus } from "@/lib/entitlements";
import { isBillingConfigured } from "@/lib/stripe";
import { joinRequestStateHeadline } from "@/lib/join-request-policy";
import ClickTracking from "@/components/ClickTracking";
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


  return (
    <main className={styles.page}>
      {/* Anonymous funnel counter (CX-20260706): one "discover_viewed" tick per
          visit — no identity, no filters/query recorded, day granularity only. */}
      <ClickTracking pageEvent="discover_viewed" />
      <PrimaryNav
        firstName={user.firstName}
        current="discover"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link>}
      />
      <div className={styles.shell}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Less scrolling. More showing up.</p>
        <h1>Find your<br /><span>next move.</span></h1>
        <p className={styles.heroSub}>Local sport. New company.</p>
      </header>
      <div className={styles.searchBar}>
        <p className={styles.area}>
          {radiusActive && geoCentre ? <><strong>{requestedRadiusKm} km</strong> from {geoCentre.source === "device" ? "your approximate area" : displayArea}<Link href="/discover">My area</Link></>
            : requestedCity ? <><strong>{toDisplayCase(requestedCity)}</strong><Link href="/discover">My area</Link></>
            : area.isNearMeDefault ? <>Near <strong>{displayArea}</strong><Link href="/discover?near=all">Everywhere</Link></>
            : <>All areas{displayArea ? <Link href="/discover">Near {displayArea}</Link> : null}</>}
        </p>
        <details className={styles.filters}>
          <summary>Filters</summary>
      <form className="discover-filters" method="get">
        {searchEverywhere ? <input type="hidden" name="near" value="all" /> : null}
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
      <div className={styles.filterExtras}>
        <UseMyLocationControl defaultRadiusKm={RADIUS_OPTIONS_KM[1]} />
        {!plus && isBillingConfigured() ? <p><Link href="/settings#plus">Plus filters</Link> · More distance, schedule and language options.</p> : null}
      </div>
        </details>
      </div>

      <section className={styles.results}>
        <div className={styles.resultsHeader}><h2>{events.length === 0 ? "Your next plan starts here" : describeDiscoveryResultsHeading({ count: events.length, memberArea: displayArea, isNearMeDefault: area.isNearMeDefault, searchEverywhere })}</h2><p className={styles.privacy}>Approximate areas now. Meeting point after acceptance.</p></div>
        {events.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyArt}><SportArtwork sport="running" /></div>
            <div className={styles.emptyBody}><h3>A little quiet.<br />Room to start something.</h3>
          <div className="discovery-empty">
            {radiusActive ? (
              <>
                <p>Nothing&apos;s open within <strong>{requestedRadiusKm} km</strong> just yet. {nextRadiusKm ? `Try widening the distance to ${nextRadiusKm} km` : "Try searching everywhere"}, or start one close to home.</p>
                <Link href={widenRadiusHref}>{nextRadiusKm ? `Widen to ${nextRadiusKm} km` : "Search everywhere"}</Link>
                <Link href="/events/new">Host the first one</Link>
              </>
            ) : area.isNearMeDefault && !filters.sport && !filters.language && !advanced.anyActive && filters.withinDays === 7 ? (
              <RegionInterestSignal area={displayArea} />
            ) : hasNarrowingFilters ? (
              <>
                <p>Nothing matches these filters right now. Try widening your search — clear the city, sport, or language filters, or look further ahead in time.</p>
                <Link href="/discover">Clear the filters</Link>
              </>
            ) : (
              <RegionInterestSignal area={displayArea} />
            )}
          </div></div></div>
        ) : (
          <EventStage key={JSON.stringify(parameters)}>{events.map((event, index) => {
            const when = formatDiscoveryDate(event.startsAt, event.timeZone);
            const area = formatDiscoveryArea(event.areaLabel, event.city);
            const availability = describeDiscoveryAvailability(event.placesRemaining);
            return (
              <article className={styles.card} key={event.id} aria-labelledby={`invitation-${event.id}`}>
                <div className={styles.poster} data-tone={/climb|hik|yoga/i.test(event.sport) ? "warm" : /tennis|padel|swim/i.test(event.sport) ? "cool" : "lime"}>
                  <SportArtwork sport={event.sport} />
                  <span className={styles.sport}>{event.sport}</span>
                  <div className={styles.posterFoot}><span>MAKE A PLAN / MAKE A CONNECTION</span><b aria-hidden="true">{String(index + 1).padStart(2, "0")}</b></div>
                </div>
                <div className={styles.body}>
                  <p className={styles.when}><time dateTime={when.machineDateTime}>{when.day} · {when.time}</time><span>{event.timeZone.replaceAll("_", " ")}</span></p>
                  <h3 id={`invitation-${event.id}`}>{event.title}</h3>
                  <p className={styles.location}>{area}<small>Approximate area</small></p>
                  <div className={styles.meta}><span>{availability.label}</span><span>{event.language}</span><span>{event.experienceLevels.join(" / ")}</span><span>Ages {event.minimumAge}–{event.maximumAge}</span></div>
                  <footer className={styles.cardFooter}>
                    <p className={styles.host}>{event.request ? joinRequestStateHeadline(event.request.status) : `Hosted by ${event.hostFirstName}`}</p>
                    <Link className={styles.cta} href={`/discover/events/${event.id}`}>{event.request && (event.request.status === "pending" || event.request.status === "accepted") ? "Manage request" : event.request ? "View request" : "View the plan"}<span aria-hidden="true">↗</span></Link>
                    <p className={styles.requestNote}>{event.request ? "Check your request and next steps." : "Take a look first. Request a place when you're ready."}</p>
                  </footer>
                </div>
              </article>
            );
          })}</EventStage>
        )}
      </section>
      </div>
      <SiteFooter />
    </main>
  );
}
