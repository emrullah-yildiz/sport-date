import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import SportArtwork from "@/components/discovery/SportArtwork";
import styles from "@/components/discovery/detail.module.css";
import AcceptedMeetingPoint from "@/components/AcceptedMeetingPoint";
import InviteFriendButton from "@/components/InviteFriendButton";
import JoinRequestControls from "@/components/JoinRequestControls";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import ApproximateAreaMap from "@/components/ApproximateAreaMap";
import { approximateAreaCue } from "@/lib/approximate-location";
import { describeDiscoveryAvailability, formatDiscoveryDate } from "@/lib/discovery-card";
import { getAcceptedEventLocation, getDiscoverableEvent } from "@/lib/events";
import { getMemberReliabilityStanding } from "@/lib/join-requests";
import { getCurrentUser } from "@/lib/session";

export default async function DiscoveryEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  const event = await getDiscoverableEvent(user, eventId);
  if (!event) notFound();
  // The host viewing their own event never requests a place, and the exact meeting
  // point already lives on their own /events/{id} page — so we skip the
  // accepted-location lookup and the private reliability standing for them.
  const privateLocation = !event.viewerIsHost && event.request?.status === "accepted" ? await getAcceptedEventLocation(eventId, user.id) : null;
  // The member's OWN private reliability standing (warning or active cool-down).
  // Only ever shown to the member themselves — never to hosts or other members.
  const standing = event.viewerIsHost ? null : await getMemberReliabilityStanding(user.id);
  // Reuse the SAME pure helpers the verified feed card uses so the two scan-critical
  // facts — when it is, and whether a place remains — cannot drift in wording or
  // privacy posture between the feed and this shared-invitation landing.
  const when = formatDiscoveryDate(event.startsAt, event.timeZone);
  const availability = describeDiscoveryAvailability(event.placesRemaining);
  // Pre-acceptance approximate-area spatial cue (CX-20260630). Derived from COARSE data
  // only — the event's already-public approximate area (or an offline city-centre
  // geocode) and the viewer's own free-text profile area for a wide distance band. The
  // exact venue is never read here (it is not even joined into `event`), so nothing on
  // this pre-acceptance surface can leak the precise meeting point. The distance hint is
  // area-to-area and snapped to a wide band; it exposes neither party's precise point.
  const locationCue = approximateAreaCue({
    areaLabel: event.areaLabel,
    city: event.city,
    approximateLatitude: event.approximateLatitude,
    approximateLongitude: event.approximateLongitude,
    viewerArea: user.location,
  });

  return (
    <main className={`event-detail-page ${styles.page}`}>
      <PrimaryNav firstName={user.firstName} current="discover" />
      <div className={styles.shell}>
      <Link href="/discover" className={styles.back}>← Discover more plans</Link>
      <header className={styles.hero}>
        <div className={styles.art} data-tone={/climb|hik|yoga/i.test(event.sport) ? "warm" : /tennis|padel|swim/i.test(event.sport) ? "cool" : "lime"}>
          <SportArtwork sport={event.sport} /><span>{event.sport}</span><b>SHOW UP / SEE WHAT HAPPENS</b>
        </div>
        <div className={styles.invitation}>
          <p className={styles.when}><time dateTime={when.machineDateTime}>{when.day} · {when.time}</time><span>{event.timeZone.replaceAll("_", " ")}</span></p>
          <h1>{event.title}</h1>
          <p className={styles.area}>{event.areaLabel}, {event.city} <small>Approximate area</small></p>
          <dl className={styles.facts}><div><dt>Time together</dt><dd>{event.durationMinutes} min</dd></div><div><dt>Places</dt><dd>{availability.label}</dd></div><div><dt>Language &amp; level</dt><dd>{event.language} · {event.experienceLevels.join(" / ")}</dd></div><div><dt>Ages</dt><dd>{event.minimumAge}–{event.maximumAge}</dd></div></dl>
          <p className={styles.host}>Hosted by {event.hostFirstName}</p>
        </div>
      </header>
      <details className={styles.about}><summary>About this plan</summary><p>{event.description}</p></details>
      <section className={`event-detail-grid ${styles.actionGrid}`}><div className={styles.request}>{event.viewerIsHost ? (
        <div className="event-detail-manage">
          <strong>This is your event.</strong>
          <p>You are seeing the public invitation exactly as members do — the exact venue stays private until you accept a request. To edit details, review requests, or cancel, open your host page.</p>
          <div className="event-detail-manage-actions">
            <Link href={`/events/${event.id}`} className="event-detail-manage-primary">Manage this event <span aria-hidden="true">→</span></Link>
            <Link href="/hosting">All your events</Link>
          </div>
        </div>
      ) : (
        <><JoinRequestControls eventId={event.id} request={event.request} isFull={availability.isFull} eligibility={{ reason: event.eligibility, minimumAge: event.minimumAge, maximumAge: event.maximumAge, language: event.language }} reliability={{ tone: standing!.notice.tone, headline: standing!.notice.headline, body: standing!.notice.body, liftsAt: standing!.notice.liftsAt ? standing!.notice.liftsAt.toISOString() : null, timeZone: event.timeZone }} />{event.request?.status === "pending" ? <p className="event-detail-chat-locked">The private group chat with the host and other attendees opens once your request is accepted.</p> : null}</>
      )}</div><article><p className="panel-label">Approximate area</p><h2>{event.areaLabel}, {event.city}</h2><ApproximateAreaMap areaLabel={event.areaLabel} city={event.city} approximateLatitude={event.approximateLatitude} approximateLongitude={event.approximateLongitude} viewerArea={user.location} />{locationCue.distanceHint ? <p className="approx-area-distance">{locationCue.distanceHint}</p> : null}<p>{privateLocation ? "Your accepted meeting point is below." : "The exact meeting point opens after your request is accepted."}</p></article></section>
      {privateLocation ? <section className="accepted-location"><p className="panel-label">Your accepted meeting point</p><AcceptedMeetingPoint venueName={privateLocation.venueName} address={privateLocation.address} postalCode={privateLocation.postalCode} city={event.city} latitude={privateLocation.latitude} longitude={privateLocation.longitude} instructions={privateLocation.instructions} /><Link href={`/events/${event.id}/room`}>Enter the event room →</Link></section> : null}
      {!event.viewerIsHost ? <section className="event-invite-friend"><p className="panel-label">Know someone?</p><InviteFriendButton eventId={event.id} sport={event.sport} /></section> : null}
      <div className="event-safety"><ReportSafetyControls eventId={event.id} subjectUserId={event.hostUserId} subjectName={event.hostFirstName} /></div>
      </div>
    </main>
  );
}
