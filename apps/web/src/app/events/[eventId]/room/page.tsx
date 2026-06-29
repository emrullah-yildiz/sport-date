import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import EventReflectionForm from "@/components/EventReflectionForm";
import EventUpdateSeenPing from "@/components/EventUpdateSeenPing";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import RoomLeaveControl from "@/components/RoomLeaveControl";
import { EVENT_UPDATE_FIELD_LABELS } from "@/lib/event-updates";
import { getEventRoom } from "@/lib/events";
import { getCurrentUser } from "@/lib/session";

export default async function EventRoomPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  const room = await getEventRoom(eventId, user.id);
  if (!room) notFound();

  const startsAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: room.timeZone,
  }).format(new Date(room.startsAt));
  const latestSeenCount = room.participants.filter((participant) => participant.seenLatestUpdate).length;

  return (
    <main className="room-page">
      <nav className="profile-nav">
        <Link href={room.isHost ? `/events/${room.id}` : `/discover/events/${room.id}`} className="logo">Sport Date</Link>
        <span>{room.isHost ? "Host room" : "Accepted participant"}</span>
      </nav>
      <header className="room-hero">
        <p className="eyebrow">{room.sport} · coordination room</p>
        <h1>{room.title}</h1>
        <p>{startsAt}</p>
      </header>
      {room.updates.length > 0 ? (
        <section className="room-updates">
          <p className="panel-label">Host updates</p>
          <h2>{room.updates[0].summary}</h2>
          <p>The room always shows the latest authoritative version of the plan. Accepted members can use this timeline to see what changed.</p>
          <ol>
            {room.updates.map((update) => (
              <li key={update.id}>
                <div>
                  <strong>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: room.timeZone }).format(new Date(update.createdAt))}</strong>
                  <p>{update.summary}</p>
                </div>
                <small>{update.changedFields.map((field) => EVENT_UPDATE_FIELD_LABELS[field]).join(" · ")}</small>
              </li>
            ))}
          </ol>
          {room.isHost
            ? <small>{latestSeenCount} of {room.participants.length} accepted {room.participants.length === 1 ? "member has" : "members have"} opened the newest update.</small>
            : room.latestUpdateId
              ? <EventUpdateSeenPing eventId={room.id} updateId={room.latestUpdateId} alreadySeen={room.viewerHasSeenLatestUpdate} />
              : null}
        </section>
      ) : null}
      <section className="room-grid">
        <article className="room-meeting">
          <p className="panel-label">Where you are meeting</p>
          <h2>{room.venueName}</h2>
          <p>{room.address}</p>
          {room.instructions ? <blockquote>{room.instructions}</blockquote> : null}
        </article>
        <article className="room-people">
          <p className="panel-label">Who has a place</p>
          <h2>{room.participants.length} {room.participants.length === 1 ? "person" : "people"} joining</h2>
          <div>
            {!room.isHost ? (
              <span>
                <strong>{room.host.firstName}</strong>
                <small>host</small>
                <ReportSafetyControls eventId={room.id} subjectUserId={room.host.userId} subjectName={room.host.firstName} />
              </span>
            ) : null}
            {room.participants.map((participant, index) => (
              <span key={`${participant.firstName}-${index}`}>
                <strong>{participant.firstName}</strong>
                <small>{room.isHost && room.latestUpdateId ? (participant.seenLatestUpdate ? "opened latest update" : "latest update unseen") : participant.skillLevel}</small>
                {participant.userId !== user.id ? <ReportSafetyControls eventId={room.id} subjectUserId={participant.userId} subjectName={participant.firstName} /> : null}
              </span>
            ))}
          </div>
        </article>
      </section>
      <section className="room-rhythm">
        <p className="panel-label">A calm arrival</p>
        <div>
          <article><span>01</span><h3>Before you go</h3><p>Check the time, equipment, exact address, and latest host updates. Keep coordination inside Sport Date when messaging arrives.</p></article>
          <article><span>02</span><h3>When you arrive</h3><p>Meet in the stated public venue. You can leave at any time if the situation feels different from the invitation.</p></article>
          <article><span>03</span><h3>If plans change</h3><p>Cancel your place so the host has an accurate group. Safety and reporting controls arrive before open chat.</p></article>
        </div>
      </section>
      {!room.isHost && room.viewerRequest?.status === "accepted" ? <RoomLeaveControl eventId={room.id} requestId={room.viewerRequest.id} /> : null}
      {room.hasEnded ? <EventReflectionForm eventId={room.id} reflection={room.reflection} /> : null}
      <aside className="room-safety-note"><strong>Why there is no chat yet</strong><p>Open messaging will not launch before blocking, reporting, moderation evidence, and response operations are ready.</p></aside>
    </main>
  );
}
