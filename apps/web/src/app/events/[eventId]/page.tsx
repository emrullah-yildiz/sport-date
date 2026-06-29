import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getHostEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export default async function HostEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const host = await getCurrentUser();
  if (!host) redirect("/login");
  const { eventId } = await params;
  const event = await getHostEvent(eventId, host.id);
  if (!event) notFound();
  const startsAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.startsAt));

  return (
    <main className="host-event-page">
      <nav className="profile-nav"><Link href="/profile" className="logo">Sport Date</Link><Link href="/events/new">Host another</Link></nav>
      <header className="host-event-hero"><p className="eyebrow">Published · {event.sport}</p><h1>{event.title}</h1><p>{event.description}</p><div className="event-facts"><span>{startsAt}</span><span>{event.durationMinutes} minutes</span><span>{event.capacity} total places</span><span>{event.minimumAge}–{event.maximumAge}</span><span>{event.language}</span></div></header>
      <section className="host-location-grid">
        <article className="host-location-card public"><p className="panel-label">Discovery sees</p><h2>{event.publicLocation.areaLabel}</h2><p>{event.publicLocation.city}, {event.publicLocation.countryCode}</p><small>No exact venue or address is included in public event data.</small></article>
        <article className="host-location-card private"><p className="panel-label">Accepted people see</p><h2>{event.privateLocation.venueName}</h2><p>{event.privateLocation.address}</p>{event.privateLocation.instructions ? <small>{event.privateLocation.instructions}</small> : null}</article>
      </section>
      <section className="host-next"><p className="panel-label">What happens next</p><h2>Requests will arrive here.</h2><p>The request queue is the next product slice. Until then, this event cannot accept real participants.</p></section>
    </main>
  );
}

