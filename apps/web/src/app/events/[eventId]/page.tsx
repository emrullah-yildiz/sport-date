import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import HostRequestDecision from "@/components/HostRequestDecision";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import { getHostEvent, getHostJoinRequests } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export default async function HostEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const host = await getCurrentUser();
  if (!host) redirect("/login");
  const { eventId } = await params;
  const event = await getHostEvent(eventId, host.id);
  if (!event) notFound();
  const requests = await getHostJoinRequests(eventId, host.id);
  const startsAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.startsAt));

  return (
    <main className="host-event-page">
      <nav className="profile-nav"><Link href="/profile" className="logo">Sport Date</Link><Link href="/events/new">Host another</Link></nav>
      <header className="host-event-hero"><p className="eyebrow">Published · {event.sport}</p><h1>{event.title}</h1><p>{event.description}</p><div className="event-facts"><span>{startsAt}</span><span>{event.durationMinutes} minutes</span><span>{event.capacity} total places</span><span>{event.minimumAge}–{event.maximumAge}</span><span>{event.language}</span></div></header>
      <div className="host-room-link"><Link href={`/events/${event.id}/room`}>Open the event room →</Link></div>
      <section className="host-location-grid">
        <article className="host-location-card public"><p className="panel-label">Discovery sees</p><h2>{event.publicLocation.areaLabel}</h2><p>{event.publicLocation.city}, {event.publicLocation.countryCode}</p><small>No exact venue or address is included in public event data.</small></article>
        <article className="host-location-card private"><p className="panel-label">Accepted people see</p><h2>{event.privateLocation.venueName}</h2><p>{event.privateLocation.address}</p>{event.privateLocation.instructions ? <small>{event.privateLocation.instructions}</small> : null}</article>
      </section>
      <section className="host-next host-guidance">
        <p className="panel-label">Host boundary</p>
        <h2>Keep the invitation honest after it goes live.</h2>
        <p>Hosting here means protecting the exact location, responding without humiliation, and cancelling early if the format is no longer real. Host status is not safety certification.</p>
        <Link href="/hosting-guidelines">Review the Hosting Guidelines</Link>
      </section>
      <section className="host-requests"><p className="panel-label">Join requests</p><h2>{requests.length === 0 ? "The sideline is quiet." : `${requests.length} ${requests.length === 1 ? "person" : "people"} responded`}</h2>{requests.length === 0 ? <p>Compatible members can now discover this invitation and request a place.</p> : <div className="host-request-list">{requests.map((request) => <article className={`host-request ${request.status}`} key={request.id}><div><strong>{request.requester.firstName}, {request.requester.age}</strong><span>{request.requester.skillLevel} · {request.requester.languages.join(", ")}</span></div>{request.requester.bio ? <p>{request.requester.bio}</p> : null}{request.introduction ? <blockquote>{request.introduction}</blockquote> : null}<footer><span className="capitalize">{request.status}</span>{request.status === "pending" ? <HostRequestDecision eventId={event.id} requestId={request.id} skipCount={request.skipCount} /> : null}</footer><ReportSafetyControls eventId={event.id} subjectUserId={request.requesterId} subjectName={request.requester.firstName} /></article>)}</div>}</section>
    </main>
  );
}
