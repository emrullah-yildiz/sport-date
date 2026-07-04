import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import HostCancelEventControl from "@/components/HostCancelEventControl";
import HostEditEventForm from "@/components/HostEditEventForm";
import HostRequestDecision from "@/components/HostRequestDecision";
import ReportSafetyControls from "@/components/ReportSafetyControls";
import ShareEventLink from "@/components/ShareEventLink";
import { getEventRoom, getHostEvent, getHostJoinRequests, type HostJoinRequest } from "@/lib/events";
import { getEventAttendanceBreakdown } from "@/lib/attendance-confirmations";
import { isWithinReminderWindow } from "@/lib/attendance-confirmation";
import { resolveHostEventView } from "@/lib/host-event-view";
import { summarizeHostRequestQueue } from "@/lib/join-request-policy";
import { getCurrentUser } from "@/lib/session";

function getRecoveryGuidance(
  counts: { stillIn: number; unsure: number; cannotMake: number },
  pendingRequestCount: number,
) {
  if (counts.cannotMake === 0 && counts.unsure === 0) {
    return {
      title: "The critical change has not shaken the group yet.",
      body: "Keep watching the room and only make further edits if the plan materially changes again.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} still waiting if you later need to rebuild the group.` : null,
    };
  }

  if (counts.stillIn === 0 && counts.unsure === 0 && counts.cannotMake > 0) {
    return {
      title: "No accepted member currently plans to come.",
      body: "This invitation may no longer be real. Cancel early or move the plan to another day instead of hoping people still arrive.",
      replacement: pendingRequestCount > 0 ? `Even with ${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request" : "requests"}, only continue if you are ready to rebuild the plan honestly around a new group.` : null,
    };
  }

  if (counts.stillIn + counts.unsure < 2 && counts.cannotMake > 0) {
    return {
      title: "The group may have dropped below a viable size.",
      body: "Decide quickly whether to cancel, substantially reshape the plan, or host only if the remaining group is still honest and safe.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} available if you need replacements, but accept only people who still fit the changed plan.` : null,
    };
  }

  if (counts.cannotMake > 0) {
    return {
      title: "Some people dropped after the critical change.",
      body: "The event may still work, but treat the remaining group as the new reality. Do not lower capacity below accepted seats; wait for members to leave or accept replacements honestly.",
      replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} already in the funnel, so review those before widening the invitation again.` : "There are no pending requests waiting, so any rebuild depends on the current accepted group or future discovery.",
    };
  }

  return {
    title: "Some accepted members are unsure after the change.",
    body: "Use the room as your decision surface and avoid assuming attendance until the unsure members answer more clearly or the plan changes again.",
    replacement: pendingRequestCount > 0 ? `${pendingRequestCount} pending ${pendingRequestCount === 1 ? "request is" : "requests are"} available if the unsure group later falls through.` : null,
  };
}

function renderRequestCard(eventId: string, request: HostJoinRequest) {
  return (
    <article className={`host-request ${request.status}`} key={request.id}>
      <div>
        <strong>
          <Link href={`/discover/members/${request.requesterId}`} className="host-request-profile-link" aria-label={`View ${request.requester.firstName}'s profile`}>
            {request.requester.firstName}, {request.requester.age}
          </Link>
        </strong>
        <span>{request.requester.skillLevel} · {request.requester.languages.join(", ")}</span>
      </div>
      {request.requester.bio ? <p>{request.requester.bio}</p> : null}
      {request.introduction ? <blockquote>{request.introduction}</blockquote> : null}
      <footer>
        <span className="capitalize">{request.status}</span>
        {request.status === "pending" ? <HostRequestDecision eventId={eventId} requestId={request.id} skipCount={request.skipCount} requesterName={request.requester.firstName} /> : null}
      </footer>
      <ReportSafetyControls eventId={eventId} subjectUserId={request.requesterId} subjectName={request.requester.firstName} />
    </article>
  );
}

export default async function HostEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const host = await getCurrentUser();
  if (!host) redirect("/login");

  const { eventId } = await params;
  const view = resolveHostEventView(eventId, await searchParams);
  const event = await getHostEvent(eventId, host.id);
  if (!event) notFound();

  const requests = await getHostJoinRequests(eventId, host.id);
  const room = await getEventRoom(eventId, host.id);
  const startsAt = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: event.timeZone,
  }).format(new Date(event.startsAt));

  const pendingRequests = requests.filter((request) => request.status === "pending");
  const acceptedRequests = requests.filter((request) => request.status === "accepted");
  const closedRequests = requests.filter((request) => request.status === "declined" || request.status === "cancelled");
  const requestQueue = summarizeHostRequestQueue(requests);
  const recovery = room?.latestCriticalUpdateId
    ? getRecoveryGuidance(room.criticalUpdateResponseCounts, requestQueue.pendingCount)
    : null;
  // T-2h attendance breakdown (CX-20260704): show the host a live confirmed/
  // pending/cancelled read-out once the event is inside the 2h confirmation
  // window. Host-only; no attendee identities, just honest counts.
  const attendanceBreakdown = isWithinReminderWindow(event.startsAt)
    ? await getEventAttendanceBreakdown(eventId, host.id)
    : null;

  return (
    <main className="host-event-page">
      <PrimaryNav
        firstName={host.firstName}
        current="host"
        action={<Link href="/events/new" className="nav-host-cta" aria-label="Host another event — create a new game">Host another</Link>}
      />

      {view.justPublished ? (
        <section className="host-published" role="status" aria-labelledby="host-published-heading">
          <p className="panel-label">It&apos;s live</p>
          <h2 id="host-published-heading">Your event is published.</h2>
          <p>Compatible members can now find it in discovery and request a place. The exact meeting point stays private until you accept a request.</p>
          <div className="host-published-actions">
            <Link href={view.publicInvitationPath} className="host-published-primary">View the public invitation <span aria-hidden="true">→</span></Link>
            <Link href={view.managePath}>Manage your events</Link>
          </div>
          <ShareEventLink path={view.shareInvitePath} />
        </section>
      ) : null}

      <header className="host-event-hero">
        <p className="eyebrow">Published · {event.sport}</p>
        <h1>{event.title}</h1>
        <p>{event.description}</p>
        <div className="event-facts">
          <span>{startsAt}</span>
          <span>{event.durationMinutes} minutes</span>
          <span>{event.capacity} total places</span>
          <span>{event.minimumAge}–{event.maximumAge}</span>
          <span>{event.language}</span>
        </div>
      </header>

      <div className="host-room-link">
        <Link href={`/events/${event.id}/room`}>Open the event room →</Link>
      </div>

      {attendanceBreakdown ? (
        <section className="host-attendance" aria-labelledby="host-attendance-heading">
          <p className="panel-label">Starting soon</p>
          <h2 id="host-attendance-heading">Who&apos;s confirmed</h2>
          <p>Each accepted attendee is being asked to confirm or release their place. Anyone still pending simply hasn&apos;t answered yet — no one is dropped automatically.</p>
          <div className="host-attendance-counts">
            <span><strong>{attendanceBreakdown.confirmed}</strong> confirmed</span>
            <span><strong>{attendanceBreakdown.pending}</strong> pending</span>
            <span><strong>{attendanceBreakdown.cancelled}</strong> released</span>
          </div>
        </section>
      ) : null}

      {event.status === "published" ? (
        <section className="host-share-card" aria-labelledby="host-share-heading">
          <p className="panel-label">Grow the group</p>
          <h2 id="host-share-heading">Share this invitation anywhere.</h2>
          <p>
            The public link works without an account and previews with a rich card in chats
            and social apps. It shows only the sport, level, approximate area, time, and
            places left — never the exact meeting point, your name, or any address.
          </p>
          <ShareEventLink path={view.shareInvitePath} />
          <Link href={view.shareInvitePath} className="host-share-preview">See the public invite page →</Link>
        </section>
      ) : null}

      {room?.latestCriticalUpdateId ? (
        <section className="host-recovery-card">
          <p className="panel-label">Recovery after a critical change</p>
          <h2>{recovery?.title}</h2>
          <p>{recovery?.body}</p>
          <div>
            <span>{room.criticalUpdateResponseCounts.stillIn} still in</span>
            <span>{room.criticalUpdateResponseCounts.unsure} unsure</span>
            <span>{room.criticalUpdateResponseCounts.cannotMake} cannot make it</span>
          </div>
          {recovery?.replacement ? <p>{recovery.replacement}</p> : null}
          <small>Use the room to watch responses, review pending requests before widening the invitation again, and cancel early if the plan no longer honestly exists.</small>
        </section>
      ) : null}

      <section className="host-location-grid">
        <article className="host-location-card public">
          <p className="panel-label">Discovery sees</p>
          <h2>{event.publicLocation.areaLabel}</h2>
          <p>{event.publicLocation.city}, {event.publicLocation.countryCode}</p>
          <small>No exact venue or address is included in public event data.</small>
        </article>
        <article className="host-location-card private">
          <p className="panel-label">Accepted people see</p>
          <h2>{event.privateLocation.venueName}</h2>
          <p>{event.privateLocation.address}</p>
          {event.privateLocation.instructions ? <small>{event.privateLocation.instructions}</small> : null}
        </article>
      </section>

      <section className="host-next host-guidance">
        <p className="panel-label">Host boundary</p>
        <h2>Keep the invitation honest after it goes live.</h2>
        <p>Hosting here means protecting the exact location, responding without humiliation, and cancelling early if the format is no longer real. Host status is not safety certification.</p>
        <Link href="/hosting#standards">Review the hosting standards</Link>
      </section>

      <HostEditEventForm event={event} />
      <HostCancelEventControl eventId={event.id} />

      <section className="host-requests">
        <p className="panel-label">Join requests</p>
        <h2>{requests.length === 0 ? "The sideline is quiet." : `${requests.length} ${requests.length === 1 ? "person" : "people"} responded`}</h2>

        {requests.length === 0 ? (
          <p>Compatible members can now discover this invitation and request a place.</p>
        ) : (
          <>
            <div className="host-request-summary">
              <span>{requestQueue.pendingCount} pending</span>
              <span>{requestQueue.acceptedCount} accepted</span>
              <span>{requestQueue.closedCount} closed</span>
            </div>

            <div className="host-request-sections">
              <section className="host-request-section">
                <div className="host-request-section-copy">
                  <h3>{requestQueue.pendingHeadline}</h3>
                  {requestQueue.pendingBody ? <p>{requestQueue.pendingBody}</p> : null}
                </div>

                {pendingRequests.length > 0
                  ? <div className="host-request-list">{pendingRequests.map((request) => renderRequestCard(event.id, request))}</div>
                  : <p className="host-request-empty">There is nothing waiting for a host decision right now.</p>}
              </section>

              {acceptedRequests.length > 0 ? (
                <section className="host-request-section">
                  <div className="host-request-section-copy">
                    <h3>Already in the group</h3>
                    <p>These people already have room access and precise meeting details.</p>
                  </div>
                  <div className="host-request-list">{acceptedRequests.map((request) => renderRequestCard(event.id, request))}</div>
                </section>
              ) : null}

              {closedRequests.length > 0 ? (
                <section className="host-request-section">
                  <div className="host-request-section-copy">
                    <h3>Already resolved</h3>
                    <p>Closed requests stay visible for context, but they no longer need host action.</p>
                  </div>
                  <div className="host-request-list">{closedRequests.map((request) => renderRequestCard(event.id, request))}</div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
