"use client";

import type { DiscoveryRequest } from "@/lib/events";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { cancelJoinRequest } from "@/lib/cancel-join-request";
import { declinedJoinRequestMessage, joinRequestConfirmationMessage } from "@/lib/join-request-policy";

type Status = DiscoveryRequest["status"];

// Private, member-only reliability standing. Never rendered for hosts or other
// members — this component is on the member's own discovery view.
type ReliabilityNotice = {
  tone: "none" | "warning" | "paused";
  headline: string;
  body: string;
  liftsAt: string | null;
  timeZone: string;
};

export default function JoinRequestControls({
  eventId,
  request,
  reliability,
}: {
  eventId: string;
  request: DiscoveryRequest | null;
  reliability?: ReliabilityNotice;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
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

  function panel() {
    // Reliability cool-down: the ONLY consequence of the fair reliability rule is
    // a temporary pause on requesting NEW places. It is shown only to this member,
    // explains itself calmly, and states exactly when it lifts. It never appears
    // once a request already exists — leaving/attending an existing place is
    // always available and handled by the other branches above.
    if (pausedBody && status === null) {
      const liftLabel = formatLiftTime(pausedLiftsAt);
      return (
        <motion.div key="paused" className="join-state reliability-paused" role="status" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>New requests are paused for a short while.</strong>
          <p>{pausedBody}</p>
          {liftLabel ? <p className="reliability-lift">New requests reopen automatically on {liftLabel}.</p> : null}
        </motion.div>
      );
    }
    if (status === "accepted") {
      return (
        <motion.div key="accepted" className="join-state accepted" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>You have a place.</strong>
          <p>The exact meeting point is now visible below.</p>
          <button type="button" onClick={cancelRequest} disabled={submitting}>
            {submitting ? "Cancelling…" : "Cancel my place"}
          </button>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </motion.div>
      );
    }
    if (status === "pending") {
      return (
        <motion.div key="pending" className="join-state pending" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>Your request is with the host.</strong>
          <p>You can cancel quietly at any time. Skip counts stay private.</p>
          <button type="button" onClick={cancelRequest} disabled={submitting}>
            {submitting ? "Cancelling…" : "Cancel request"}
          </button>
          {error ? <p className="error-message" role="alert">{error}</p> : null}
        </motion.div>
      );
    }
    if (status === "declined") {
      return (
        <motion.div key="declined" className="join-state closed" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>Not this game.</strong>
          <p>{declinedJoinRequestMessage(request?.skipCount ?? 0)}</p>
        </motion.div>
      );
    }
    if (status === "cancelled") {
      // Reversible by design (CX-20260702): cancelling is low-stakes, so this is
      // never a dead end. The join form returns on request, matching the pending
      // promise that you can "cancel quietly at any time". Skip counts stay private.
      return (
        <motion.div key="cancelled" className="join-state closed" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>Request cancelled.</strong>
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
        </motion.div>
      );
    }
    return (
      <motion.div key="request" className="join-request-box" {...panelMotion}>
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
      </motion.div>
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
