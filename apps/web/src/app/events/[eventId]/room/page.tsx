import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getEventRoom } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import EventReflectionForm from "@/components/EventReflectionForm";

export default async function EventRoomPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  const room = await getEventRoom(eventId, user.id);
  if (!room) notFound();
  const startsAt = new Intl.DateTimeFormat("en-GB", { dateStyle: "full", timeStyle: "short", timeZone: room.timeZone }).format(new Date(room.startsAt));

  return (
    <main className="room-page">
      <nav className="profile-nav"><Link href={room.isHost ? `/events/${room.id}` : `/discover/events/${room.id}`} className="logo">Sport Date</Link><span>{room.isHost ? "Host room" : "Accepted participant"}</span></nav>
      <header className="room-hero"><p className="eyebrow">{room.sport} · coordination room</p><h1>{room.title}</h1><p>{startsAt}</p></header>
      <section className="room-grid">
        <article className="room-meeting"><p className="panel-label">Where you are meeting</p><h2>{room.venueName}</h2><p>{room.address}</p>{room.instructions ? <blockquote>{room.instructions}</blockquote> : null}</article>
        <article className="room-people"><p className="panel-label">Who has a place</p><h2>{room.participants.length} {room.participants.length === 1 ? "person" : "people"} joining</h2><div>{room.participants.map((participant, index) => <span key={`${participant.firstName}-${index}`}><strong>{participant.firstName}</strong><small>{participant.skillLevel}</small>{participant.userId !== user.id ? <ReportSafetyControls eventId={room.id} subjectUserId={participant.userId} subjectName={participant.firstName} /> : null}</span>)}</div></article>
      </section>
      <section className="room-rhythm"><p className="panel-label">A calm arrival</p><div><article><span>01</span><h3>Before you go</h3><p>Check the time, equipment, and exact address. Keep coordination inside Sport Date when messaging arrives.</p></article><article><span>02</span><h3>When you arrive</h3><p>Meet in the stated public venue. You can leave at any time if the situation feels different from the invitation.</p></article><article><span>03</span><h3>If plans change</h3><p>Cancel your place so the host has an accurate group. Safety and reporting controls arrive before open chat.</p></article></div></section>
      {room.hasEnded ? <EventReflectionForm eventId={room.id} reflection={room.reflection} /> : null}
      <aside className="room-safety-note"><strong>Why there is no chat yet</strong><p>Open messaging will not launch before blocking, reporting, moderation evidence, and response operations are ready.</p></aside>
    </main>
  );
}
