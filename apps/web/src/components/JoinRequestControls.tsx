"use client";

import type { DiscoveryRequest } from "@/lib/events";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { cancelJoinRequest } from "@/lib/cancel-join-request";
import { declinedJoinRequestMessage, joinRequestConfirmationMessage, joinRequestStateHeadline, showsFullJoinState } from "@/lib/join-request-policy";

type Status = DiscoveryRequest["status"];

// A no-op store subscription: `mounted` never changes after the first client
// render (false → true at hydration), so there is nothing to subscribe to.
function subscribeNoop() {
  return () => {};
}

// Private, member-only reliability standing. Never rendered for hosts or other
// members — this component is on the member's own discovery view.
type ReliabilityNotice = {
  tone: "none" | "warning" | "paused";
  headline: string;
  body: string;
  liftsAt: string | null;
  timeZone: string;
};

// Why a directly-opened invitation isn't requestable for this viewer, so the CTA
// can render an honest disabled state instead of a silently-failing "Request a
// place" (CX-20260704 core-loop-hardening item 1). "full" is handled by isFull;
// "eligible" renders the normal form.
type JoinEligibilityInfo = {
  reason: "eligible" | "age" | "language" | "full" | "past";
  minimumAge: number;
  maximumAge: number;
  language: string;
};

export default function JoinRequestControls({
  eventId,
  request,
  reliability,
  eligibility,
  isFull = false,
}: {
  eventId: string;
  request: DiscoveryRequest | null;
  reliability?: ReliabilityNotice;
  eligibility?: JoinEligibilityInfo;
  // The event has no places left (derived from the SAME availability helper the
  // hero "Fully booked" badge uses, so the two can't drift). Threaded in so a
  // capacity-full event replaces the open request form with an honest "full"
  // state instead of inviting a submission the server would 409
  // (CX-20260703-full-event-join-form-invites-doomed-request). Members who already
  // hold a request/place keep their own state — see showsFullJoinState.
  isFull?: boolean;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  // false on the server and on the first client paint, true only after
  // hydration. Gating the framer-motion wrapper on this makes the SSR HTML and
  // the first client render byte-identical (see `Panel` below). Implemented with
  // useSyncExternalStore — its server snapshot is false and its client snapshot
  // is true — so the mismatch-free first render needs no setState-in-effect.
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [introduction, setIntroduction] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Local mirror of the server-provided request so the box can resolve in place
  // without a full-document reload. router.refresh() re-syncs the rest of the
  // server-rendered page (e.g. the accepted meeting point) around it.
  const [status, setStatus] = useState<Status | null>(request?.status ?? null);
  const [requestId, setRequestId] = useState<string | null>(request?.id ?? null);
  const [announcement, setAnnouncement] = useState("");
  // Live paused state: seeded from the server-rendered standing, and re-set if a
  // new-join attempt returns 423 (a cool-down that began since page load).
  const [pausedBody, setPausedBody] = useState<string | null>(reliability?.tone === "paused" ? reliability.body : null);
  const [pausedLiftsAt, setPausedLiftsAt] = useState<string | null>(reliability?.tone === "paused" ? reliability.liftsAt : null);
  const confirmationRef = useRef<HTMLElement | null>(null);
  // A ref (not state) so consuming it never triggers a render: set true when a
  // commitment resolves in this session so we move focus to the new confirmation
  // heading (never leaving focus on <body>). Ordinary page loads leave it false
  // so we do not steal focus.
  const focusOnResolveRef = useRef(false);

  // Callback ref: fires when the confirmation heading actually attaches to the
  // DOM. Because AnimatePresence "wait" mounts the new panel only after the old
  // one exits, focusing here (rather than in an effect keyed on status) reliably
  // lands focus on the freshly mounted heading instead of leaving it on <body>.
  function attachConfirmation(node: HTMLElement | null) {
    confirmationRef.current = node;
    if (node && focusOnResolveRef.current) {
      focusOnResolveRef.current = false;
      node.focus();
    }
  }

  // Motion is purposeful but calm: a small fade/rise marking the shift from
  // deciding to committed. Under prefers-reduced-motion it becomes an instant
  // swap (no transform, zero duration) — full reduced-motion parity.
  const panelMotion = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 8 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -8 },
        transition: { duration: 0.28, ease: "easeOut" as const },
      };

  // Progressive enhancement to avoid a React hydration mismatch
  // (CX-20260702-join-controls-reduced-motion-hydration-mismatch): a
  // framer-motion `motion.div` serializes its resolved inline style differently
  // on the server vs the client (e.g. the server emits `transform:none` that the
  // client's post-mount render omits), which React "won't patch up". Before
  // hydration (`mounted === false` — the server pass and the first client paint)
  // we render each panel as a plain `<div>` with NO motion props and NO inline
  // opacity/transform, so both passes are byte-identical in every motion
  // setting. After mount we swap in the `motion.div` so the calm reveal still
  // plays client-side only on subsequent state changes. AnimatePresence's
  // `initial={false}` means the first mounted panel does not animate its
  // entrance, so nothing visibly changes at hydration — only later in-place
  // resolutions (request → pending/accepted/cancelled) get the gentle swap.
  function Panel({ className, role, children }: { className: string; role?: string; children: ReactNode }) {
    if (!mounted) {
      return <div className={className} role={role}>{children}</div>;
    }
    return (
      <motion.div className={className} role={role} {...panelMotion}>
        {children}
      </motion.div>
    );
  }

  async function createRequest() {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ introduction }),
      });
      const result = (await response.json()) as { error?: string; requestId?: string; status?: Status; paused?: boolean; liftsAt?: string | null };
      // A reliability cool-down began since page load: show the calm private
      // explanation in place instead of a generic error, and keep the typed note.
      if (response.status === 423 && result.paused) {
        setPausedBody(result.error ?? "New requests are paused for a short while.");
        setPausedLiftsAt(result.liftsAt ?? null);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Request failed.");
      const nextStatus = result.status ?? "pending";
      setStatus(nextStatus);
      setRequestId(result.requestId ?? null);
      setAnnouncement(joinRequestConfirmationMessage(nextStatus));
      focusOnResolveRef.current = true;
      // A new pending request adds no server-rendered content to this page (the
      // meeting point stays gated), so local state alone resolves it in place —
      // no router.refresh(), which keeps focus on the confirmation.
    } catch (caught) {
      // Keep the member's typed note; surface the failure in place as an alert.
      setError(caught instanceof Error ? caught.message : "Request failed.");
    } finally {
      setSubmitting(false);
    }
  }

  async function cancelRequest() {
    if (!requestId) return;
    setSubmitting(true);
    setError("");
    // The shared helper owns the client-side timeout/abort so a hung or slow
    // request can never leave this button stuck on "Cancelling…"; it always
    // resolves, so `submitting` is reliably cleared below.
    const result = await cancelJoinRequest(eventId, requestId);
    if (!result.ok) {
      // Re-enable the control and surface the calm, recoverable message. The
      // member's request/place is untouched — never a dead end.
      setError(result.message);
      setSubmitting(false);
      return;
    }
    const nextStatus = (result.status as Status) ?? "cancelled";
    const wasAccepted = status === "accepted";
    setStatus(nextStatus);
    setAnnouncement(joinRequestConfirmationMessage(nextStatus));
    focusOnResolveRef.current = true;
    setSubmitting(false);
    // Only cancelling an accepted place changes server-rendered content (the
    // exact meeting-point section must disappear), so re-sync the RSC tree in
    // that case. router.refresh() preserves this component's local state and
    // browser scroll; re-assert focus afterwards so the async merge can't
    // strand a keyboard / screen-reader member on <body>.
    if (wasAccepted) {
      router.refresh();
      requestAnimationFrame(() => confirmationRef.current?.focus());
    }
  }

  function formatLiftTime(iso: string | null): string | null {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat("en-GB", {
        dateStyle: "full",
        timeStyle: "short",
        timeZone: reliability?.timeZone,
      }).format(new Date(iso));
    } catch {
      return null;
    }
  }

  // A calm, real next step shared by the full-event states: back to discovery to
  // find a game with room. A plain informational link (never a coral alarm or a
  // scarcity nudge), 44px target and visible focus handled in CSS.
  const browseOtherGames = (
    <Link href="/discover" className="join-full-browse">Browse other games <span aria-hidden="true">→</span></Link>
  );

  function panel() {
    // Directly-opened invitation the join gate would reject for THIS viewer (age
    // outside range / language mismatch / already started). Only replaces the
    // pre-request form (status === null) — a member who already holds a request or
    // place keeps their own state below. "full" falls through to the honest full
    // state; "eligible" renders the normal form. Placed first so a member-specific
    // hard block is never masked by a generic "full" message
    // (CX-20260704 core-loop-hardening item 1: the CTA never silently no-ops).
    if (status === null && eligibility && (eligibility.reason === "age" || eligibility.reason === "language" || eligibility.reason === "past")) {
      const copy = eligibility.reason === "past"
        ? "This game has already started, so requests are closed. There are other games coming up."
        : eligibility.reason === "age"
          ? `This game welcomes ages ${eligibility.minimumAge}–${eligibility.maximumAge}, so it isn't open for you to request a place. There are other games looking for players.`
          : `This game is run in ${eligibility.language}, which isn't one of the languages on your profile, so it isn't open for you to request. You can add languages in your profile, or find other games.`;
      return (
        <Panel key="ineligible" className="join-state closed" role="status">
          <strong tabIndex={-1} ref={attachConfirmation}>You can&apos;t request a place here.</strong>
          <p>{copy}</p>
          {browseOtherGames}
        </Panel>
      );
    }
    // Fully booked + no request of one's own: the event has no place to ask for, so
    // show an honest "full" state with a calm next step INSTEAD of the open request
    // form the server capacity guard would 409
    // (CX-20260703-full-event-join-form-invites-doomed-request). Placed before the
    // reliability-pause branch: when the event is full the real, permanent blocker
    // is capacity, so "requests are paused for a short while" (which implies you
    // could ask once it lifts) would be the less honest thing to say. Members who
    // already hold a request/place fall through to their own state below — this only
    // replaces the pre-request form (status === null), never an existing request.
    if (showsFullJoinState(isFull, status)) {
      return (
        <Panel key="full" className="join-state closed">
          <strong tabIndex={-1} ref={attachConfirmation}>This game is full.</strong>
          <p>Every place is taken, so there isn&apos;t an open spot to request right now. Places sometimes open up if someone cancels — and there are other games looking for players.</p>
          {browseOtherGames}
        </Panel>
      );
    }
    // Reliability cool-down: the ONLY consequence of the fair reliability rule is
    // a temporary pause on requesting NEW places. It is shown only to this member,
    // explains itself calmly, and states exactly when it lifts. It never appears
    // once a request already exists — leaving/attending an existing place is
    // always available and handled by the other branches above.
    if (pausedBody && status === null) {
      const liftLabel = formatLiftTime(pausedLiftsAt);
      return (
        <Panel key="paused" className="join-state reliability-paused" role="status">
          <strong tabIndex={-1} ref={attachConfirmation}>New requests are paused for a short while.</strong>
          <p>{pausedBody}</p>
          {liftLabel ? <p className="reliability-lift">New requests reopen automatically on {liftLabel}.</p> : null}
        </Panel>
      );
    }
    if (status === "accepted") {
      return (
        <Panel key="accepted" className="join-state accepted">
          <strong tabIndex={-1} ref={attachConfirmation}>{joinRequestStateHeadline("accepted")}</strong>
          <p>The exact meeting point is now visible below.</p>
          <button type="button" onClick={cancelRequest} disabled={submitting}>
            {submitting ? "Cancelling…" : "Cancel my place"}
          </button>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </Panel>
      );
    }
    if (status === "pending") {
      return (
        <Panel key="pending" className="join-state pending">
          <strong tabIndex={-1} ref={attachConfirmation}>{joinRequestStateHeadline("pending")}</strong>
          <p>You can cancel quietly at any time. Skip counts stay private.</p>
          <button type="button" onClick={cancelRequest} disabled={submitting}>
            {submitting ? "Cancelling…" : "Cancel request"}
          </button>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </Panel>
      );
    }
    if (status === "declined") {
      return (
        <Panel key="declined" className="join-state closed">
          <strong tabIndex={-1} ref={attachConfirmation}>{joinRequestStateHeadline("declined")}</strong>
          <p>{declinedJoinRequestMessage(request?.skipCount ?? 0)}</p>
        </Panel>
      );
    }
    if (status === "cancelled") {
      // Reversible by design (CX-20260702): cancelling is low-stakes, so this is
      // never a dead end. The join form returns on request, matching the pending
      // promise that you can "cancel quietly at any time". Skip counts stay private.
      // BUT if the game filled up since the member cancelled, re-requesting would be
      // doomed (the server 409s a full event), so we don't offer that button — we
      // say so honestly and point to other games instead
      // (CX-20260703-full-event-join-form-invites-doomed-request).
      return (
        <Panel key="cancelled" className="join-state closed">
          <strong tabIndex={-1} ref={attachConfirmation}>{joinRequestStateHeadline("cancelled")}</strong>
          {isFull ? (
            <>
              <p>This game has since filled up, so there isn&apos;t an open place to ask for right now. No pressure — there are other games looking for players. Skip counts stay private.</p>
              {browseOtherGames}
            </>
          ) : (
            <>
              <p>No pressure either way. If you change your mind, you can ask again while this game still has room. Skip counts stay private.</p>
              <button
                type="button"
                onClick={() => {
                  // Return to the join form. Re-requesting reopens the member's own
                  // cancelled row server-side, honouring every join guard and any
                  // active reliability pause.
                  setError("");
                  setStatus(null);
                  focusOnResolveRef.current = true;
                }}
              >
                Request a place again
              </button>
            </>
          )}
        </Panel>
      );
    }
    return (
      <Panel key="request" className="join-request-box">
        {reliability?.tone === "warning" && !pausedBody ? (
          <p className="reliability-warning" role="status">{reliability.body}</p>
        ) : null}
        <label htmlFor="join-introduction">A short note to the host <span>optional</span></label>
        <textarea
          id="join-introduction"
          // Lands focus here when the member chooses to ask again from the
          // cancelled state, so a keyboard / screen-reader member is never
          // stranded on <body> when the join form returns.
          ref={attachConfirmation}
          maxLength={500}
          rows={4}
          value={introduction}
          onChange={(event) => setIntroduction(event.target.value)}
          placeholder="What would help the host welcome you well?"
        />
        <div>
          <small>{introduction.length}/500</small>
          <button type="button" onClick={createRequest} disabled={submitting}>
            {submitting ? "Sending…" : "Request a place"}
          </button>
        </div>
        {error ? <p className="error-message" role="alert">{error}</p> : null}
      </Panel>
    );
  }

  return (
    <div className="join-controls">
      <AnimatePresence mode="wait" initial={false}>
        {panel()}
      </AnimatePresence>
      {/* Polite live region: announces the commitment result to keyboard and
          screen-reader members the moment it resolves in place, since focus
          also moves to the confirmation heading above. */}
      <p role="status" aria-live="polite" className="visually-hidden">{announcement}</p>
    </div>
  );
}
