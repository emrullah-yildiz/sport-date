import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import EventReflectionForm from "@/components/EventReflectionForm";
import EventRoomChat from "@/components/EventRoomChat";
import EventUpdateAttendanceIntentControl from "@/components/EventUpdateAttendanceIntentControl";
import EventUpdateSeenPing from "@/components/EventUpdateSeenPing";
import FirstEventPreparationCard, { shouldShowFirstEventPreparation } from "@/components/FirstEventPreparationCard";
import PeerFeedbackPanel from "@/components/PeerFeedbackPanel";
import PostEventAfterglow from "@/components/PostEventAfterglow";
import PreArrivalSafetyBrief from "@/components/PreArrivalSafetyBrief";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import RoomLeaveControl from "@/components/RoomLeaveControl";
import ShareEventLink from "@/components/ShareEventLink";
import { BRAND_NAME } from "@/lib/brand";
import { EVENT_UPDATE_FIELD_LABELS, eventUpdateSeverityLabel } from "@/lib/event-updates";
import { getEventRoom } from "@/lib/events";
import { getPeerFeedbackTargets } from "@/lib/peer-feedback";
import { getCurrentUser } from "@/lib/session";

export default async function EventRoomPage({ params }: { params: Promise<{ eventId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { eventId } = await params;
  const room = await getEventRoom(eventId, user.id);
  if (!room) notFound();
  // Post-attendance peer signal: only meaningful once the event has ended and only
  // for the people the viewer actually co-attended with. The gate itself lives in
  // getPeerFeedbackTargets; here we just avoid the query before the event ends.
  const peerFeedbackTargets = room.hasEnded ? await getPeerFeedbackTargets(room.id, user.id) : [];

  const startsAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: room.timeZone,
  }).format(new Date(room.startsAt));
  const latestSeenCount = room.participants.filter((participant) => participant.seenLatestUpdate).length;
  // The pre-arrival safety brief is for an accepted participant heading to an
  // in-person meeting — not the host, and not once the event is over.
  const showPreArrivalBrief = !room.isHost && room.viewerRequest?.status === "accepted" && !room.hasEnded;
  // The first-event preparation card is the warmer, logistics/confidence sibling of
  // that safety brief: only for an accepted participant attending their FIRST event.
  // Room chat is for the people actually attending: the host, or an accepted
  // participant. The room itself is already gated to exactly these viewers by
  // getEventRoom, and the API re-checks server-side on every read/write; this
  // flag only decides whether to render the surface.
  const canUseChat = room.isHost || room.viewerRequest?.status === "accepted";
  const showFirstEventPrep = shouldShowFirstEventPreparation({
    isHost: room.isHost,
    hasEnded: room.hasEnded,
    viewerIsFirstTimer: room.viewerIsFirstTimer,
    viewerRequestStatus: room.viewerRequest?.status,
  });
  // The host lands here right after publishing. Before anyone has an accepted place
  // the people panel would otherwise read as a cold "0 people joining" over an empty
  // box — so give the host a warm, honest empty state (no fabricated traction) with a
  // calm next step: share the approximate-only public invitation or manage the event.
  const hostAwaitingFirstPlace = room.isHost && room.participants.length === 0;
  const publicInvitationPath = `/discover/events/${room.id}`;
  // An accepted, non-host attendee who is currently the only participant (just
  // themselves, alongside the host) gets a calm "you're the first" note rather than an
  // absence — never the "0 people joining" contradiction with their own presence.
  const viewerIsSoleAcceptedGuest =
    !room.isHost && room.viewerRequest?.status === "accepted" && room.participants.length === 1;
  const startsAtShort = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: room.timeZone,
  }).format(new Date(room.startsAt));

  return (
    <main className="room-page">
      <PrimaryNav
        firstName={user.firstName}
        current={room.isHost ? "host" : null}
        action={
          <Link href={room.isHost ? `/events/${room.id}` : `/discover/events/${room.id}`} className="primary-nav-link">
            {room.isHost ? "Back to your event" : "Back to the event"}
          </Link>
        }
      />
      <header className="room-hero">
        <p className="eyebrow">{room.sport} · coordination room</p>
        <h1>{room.title}</h1>
        <p>{startsAt}</p>
      </header>
      {showPreArrivalBrief ? (
        <div id="prearrival-brief">
          <PreArrivalSafetyBrief
            eventId={room.id}
            startsAt={room.startsAt}
            safetyControlsId="room-people"
            leaveControlId="room-leave"
          />
        </div>
      ) : null}
      {showFirstEventPrep ? (
        <FirstEventPreparationCard
          sport={room.sport}
          experienceLevels={room.experienceLevels}
          startsAtLabel={startsAtShort}
          areaLabel={room.areaLabel}
          hostFirstName={room.host.firstName}
          safetyBriefId={showPreArrivalBrief ? "prearrival-brief" : "room-leave"}
        />
      ) : null}
      {room.updates.length > 0 ? (
        <section className="room-updates">
          <p className="panel-label">Host updates</p>
          <h2>{room.updates[0].severity === "critical" ? "Critical host change" : room.updates[0].summary}</h2>
          <p>The room always shows the latest authoritative version of the plan. Accepted members can use this timeline to see what changed.</p>
          <ol>
            {room.updates.map((update) => (
              <li key={update.id}>
                <div>
                  <strong>{new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: room.timeZone }).format(new Date(update.createdAt))}</strong>
                  <p>{update.summary}</p>
                </div>
                <small>{eventUpdateSeverityLabel(update.severity)} · {update.changedFields.map((field) => EVENT_UPDATE_FIELD_LABELS[field]).join(" · ")}</small>
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
      {room.latestCriticalUpdateId ? (
        room.isHost ? (
          <section className="room-update-recovery">
            <p className="panel-label">After the critical change</p>
            <h2>Who still intends to come?</h2>
            <div>
              <article><strong>{room.criticalUpdateResponseCounts.stillIn}</strong><span>still in</span></article>
              <article><strong>{room.criticalUpdateResponseCounts.unsure}</strong><span>unsure</span></article>
              <article><strong>{room.criticalUpdateResponseCounts.cannotMake}</strong><span>cannot make it</span></article>
            </div>
          </section>
        ) : (
          <EventUpdateAttendanceIntentControl eventId={room.id} updateId={room.latestCriticalUpdateId} currentIntent={room.viewerCriticalUpdateIntent} />
        )
      ) : null}
      <section className="room-grid">
        <article className="room-meeting">
          <p className="panel-label">Where you are meeting</p>
          <h2>{room.venueName}</h2>
          <p>{room.address}</p>
          {room.instructions ? <blockquote>{room.instructions}</blockquote> : null}
        </article>
        <article className="room-people" id="room-people">
          <p className="panel-label">Who has a place</p>
          <h2>
            {hostAwaitingFirstPlace
              ? "No one has a place yet"
              : `${room.participants.length} ${room.participants.length === 1 ? "person" : "people"} joining`}
          </h2>
          {hostAwaitingFirstPlace ? (
            <div className="room-people-empty">
              <p className="room-people-empty-lede">
                Your event is live and people can find it in discovery right now. Requests to
                join a brand-new invitation usually take a little time to arrive — this is where
                accepted members will appear as they join.
              </p>
              <p className="room-people-empty-hint">Want to help it along? Share the invitation — it only ever reveals the approximate area, never the exact meeting point.</p>
              <ShareEventLink path={publicInvitationPath} />
              <div className="room-people-empty-actions">
                <Link href={publicInvitationPath} className="room-people-empty-primary">
                  View the public invitation <span aria-hidden="true">→</span>
                </Link>
                <Link href="/hosting">Manage your events</Link>
              </div>
            </div>
          ) : (
          <div>
            {viewerIsSoleAcceptedGuest ? (
              <p className="room-people-first-note">You&apos;re the first to join — others will appear here as the host accepts more requests.</p>
            ) : null}
            {!room.isHost ? (
              <span>
                <strong>
                  <Link href={`/discover/members/${room.host.userId}`} className="room-person-profile-link" aria-label={`View ${room.host.firstName}'s profile`}>
                    {room.host.firstName}
                  </Link>
                </strong>
                <small>host</small>
                <ReportSafetyControls eventId={room.id} subjectUserId={room.host.userId} subjectName={room.host.firstName} />
              </span>
            ) : null}
            {room.participants.map((participant, index) => (
              <span key={`${participant.firstName}-${index}`}>
                <strong>
                  {participant.userId !== user.id ? (
                    <Link href={`/discover/members/${participant.userId}`} className="room-person-profile-link" aria-label={`View ${participant.firstName}'s profile`}>
                      {participant.firstName}
                    </Link>
                  ) : (
                    participant.firstName
                  )}
                </strong>
                <small>
                  {room.isHost && room.latestCriticalUpdateId
                    ? participant.criticalUpdateIntent === "still_in"
                      ? "still in after change"
                      : participant.criticalUpdateIntent === "unsure"
                        ? "unsure after change"
                        : participant.criticalUpdateIntent === "cannot_make"
                          ? "cannot make it"
                          : "no response yet"
                    : room.isHost && room.latestUpdateId
                      ? (participant.seenLatestUpdate ? "opened latest update" : "latest update unseen")
                      : participant.skillLevel}
                </small>
                {participant.userId !== user.id ? <ReportSafetyControls eventId={room.id} subjectUserId={participant.userId} subjectName={participant.firstName} /> : null}
              </span>
            ))}
          </div>
          )}
        </article>
      </section>
      <section className="room-rhythm">
        <p className="panel-label">A calm arrival</p>
        <div>
          <article><span>01</span><h3>Before you go</h3><p>Check the time, equipment, exact address, and latest host updates. Use the room chat below to sort the practical details — keep coordination inside {BRAND_NAME}.</p></article>
          <article><span>02</span><h3>When you arrive</h3><p>Meet in the stated public venue. You can leave at any time if the situation feels different from the invitation.</p></article>
          <article><span>03</span><h3>If plans change</h3><p>Post in the room chat or cancel your place so the host has an accurate group. Every message can be reported, and blocking still hides you both ways.</p></article>
        </div>
      </section>
      {canUseChat ? <EventRoomChat eventId={room.id} timeZone={room.timeZone} /> : null}
      {!room.isHost && room.viewerRequest?.status === "accepted" ? <div id="room-leave"><RoomLeaveControl eventId={room.id} requestId={room.viewerRequest.id} safetyControlsId="room-people" /></div> : null}
      {room.hasEnded ? <PostEventAfterglow isHost={room.isHost} hasReflected={room.reflection !== null} /> : null}
      {room.hasEnded ? <EventReflectionForm eventId={room.id} reflection={room.reflection} /> : null}
      {room.hasEnded ? <PeerFeedbackPanel eventId={room.id} targets={peerFeedbackTargets} /> : null}
    </main>
  );
}
