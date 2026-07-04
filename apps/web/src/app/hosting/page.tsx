import Link from "next/link";
import { redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import { BRAND_NAME } from "@/lib/brand";
import SiteFooter from "@/components/SiteFooter";
import { getMemberEventSummaries, selectHostedEvents, summarizeHostCoordination, summarizeHostReflection, type HostedEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Your events" };

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
  // Private host-side closure for a PAST event: a warm "you made this happen"
  // acknowledgement, plus either the host's own recorded outcome or a calm optional
  // invitation to reflect. Derived only from the host's own reflection — no counts,
  // no participant data, no pressure. (See summarizeHostReflection.)
  const outcome = isUpcoming ? null : summarizeHostReflection(event.reflection);
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
      {outcome ? (
        <div className="hosting-outcome" role="note" aria-label={`Your private reflection on ${event.title}`}>
          <p className="hosting-outcome-head">{outcome.heading}</p>
          <p className="hosting-outcome-body">{outcome.body}</p>
          {outcome.reflectPrompt ? (
            <Link
              className="hosting-outcome-reflect"
              href={`/events/${event.id}/room#event-reflection-title`}
              aria-label={`How did ${event.title} go? Add a private, optional reflection`}
            >
              {outcome.reflectPrompt} <span aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
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
      <PrimaryNav
        firstName={user.firstName}
        current="host"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host an event — create a new game">Host an event</Link>}
      />

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

      <section className="hosting-standards" id="standards" aria-labelledby="hosting-standards-title">
        <div className="hosting-standards-head">
          <p className="eyebrow">Hosting standards</p>
          <h2 id="hosting-standards-title">What {BRAND_NAME} expects from a host.</h2>
          <p>Hosting is real responsibility, not a trust badge. These standards keep events clear, calm, and safe — without implying host status is certification, employment, or emergency support. Open a section to read more.</p>
        </div>

        <details className="hosting-standard">
          <summary>What a host should make clear</summary>
          <ul>
            <li>Publish a real format with a clear start, end, level, language, capacity, and expected cost.</li>
            <li>Write the description so a cautious newcomer can tell whether the pace and mood fit.</li>
            <li>Keep the exact meeting point inside accepted-member access only.</li>
            <li>Cancel or update the invitation if the format, venue, or timing materially changes.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>Events are for real activity — not sexual encounters</summary>
          <ul>
            <li>Every event is built around a genuine shared activity. {BRAND_NAME} is for dating, friendship, or community through the game — it is not a hookup app.</li>
            <li>Do not organise events for sexual purposes, and do not use an event, profile, or the room chat for sexual solicitation.</li>
            <li>Dating here means meeting a person you might click with — not arranging sex. Wanting a romantic connection is welcome; a sexual-encounter listing is not.</li>
            <li>Events or profiles set up for sexual intent can be reported (&ldquo;Sexual or inappropriate intent&rdquo;) and moderators can hide or remove them.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>What host status does not mean</summary>
          <ul>
            <li>Host status is not identity verification, safety certification, or professional coaching authority.</li>
            <li>A host is not a moderator, employee, emergency responder, or guarantee that harm cannot happen.</li>
            <li>Email verification and profile completion do not prove host trustworthiness.</li>
            <li>The product does not currently issue public host badges or reliability scores.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>How to host without pressure</summary>
          <ul>
            <li>Welcome the advertised level without shaming slower, newer, or less confident participants.</li>
            <li>Do not pressure anyone into private transport, alcohol, off-platform contact, or romantic attention.</li>
            <li>Use accept and skip decisions to protect fit, not to create public ranking or humiliation.</li>
            <li>Respect that people may leave early, cancel, block, or report without retaliation.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>What to do when something goes wrong</summary>
          <ul>
            <li>If the event is no longer viable, cancel early so people are not travelling to uncertainty.</li>
            <li>If a member behaves badly, use in-product safety controls and preserve the facts rather than improvising punishment.</li>
            <li>If there is urgent danger, contact local emergency services first.</li>
            <li>Do not move safety complaints into casual chat or promise outcomes the moderation process cannot yet guarantee.</li>
          </ul>
        </details>

        <p className="hosting-standards-note">
          Read these alongside the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and the <Link href="/safety#guidelines">safety guidance</Link>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
