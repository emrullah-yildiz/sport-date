import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import JoinRequestControls from "@/components/JoinRequestControls";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import { getAcceptedEventLocation, getDiscoverableEvent } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export default async function DiscoveryEventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  const event = await getDiscoverableEvent(user, eventId);
  if (!event) notFound();
  const privateLocation = event.request?.status === "accepted" ? await getAcceptedEventLocation(eventId, user.id) : null;
  const start = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: event.timeZone }).format(new Date(event.startsAt));

  return (
    <main className="event-detail-page">
      <nav className="profile-nav"><Link href="/discover" className="logo">Sport Date</Link><Link href="/discover">Back to discovery</Link></nav>
      <header className="event-detail-hero"><div><p className="eyebrow">{event.sport} · {event.areaLabel}</p><h1>{event.title}</h1><p>{event.description}</p></div><div className="event-detail-facts"><strong>{start}</strong><span>{event.durationMinutes} minutes</span><span>{event.placesRemaining} of {event.capacity} places remain</span><span>{event.language} · {event.experienceLevels.join(" / ")}</span><span>Ages {event.minimumAge}–{event.maximumAge}</span><span>Hosted by {event.hostFirstName}</span></div></header>
      <section className="event-detail-grid"><article><p className="panel-label">Before acceptance</p><h2>{event.areaLabel}, {event.city}</h2><p>This is deliberately approximate. The exact venue is not included in this page or its data.</p></article><JoinRequestControls eventId={event.id} request={event.request} /></section>
      {privateLocation ? <section className="accepted-location"><p className="panel-label">Your accepted meeting point</p><h2>{privateLocation.venueName}</h2><p>{privateLocation.address}</p>{privateLocation.instructions ? <small>{privateLocation.instructions}</small> : null}<Link href={`/events/${event.id}/room`}>Enter the event room →</Link></section> : null}
      <div className="event-safety"><ReportSafetyControls eventId={event.id} subjectUserId={event.hostUserId} subjectName={event.hostFirstName} /></div>
    </main>
  );
}
