"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { hostDecisionConfirmationMessage, hostSkipButtonLabel, type JoinRequestStatus } from "@/lib/join-request-policy";

export default function HostRequestDecision({
  eventId,
  requestId,
  skipCount,
  requesterName,
}: {
  eventId: string;
  requestId: string;
  skipCount: number;
  requesterName: string;
}) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Local mirror of the decision so the card resolves in place instead of a full
  // window.location.reload(). null = still awaiting a host decision (show buttons).
  const [resolved, setResolved] = useState<JoinRequestStatus | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const confirmationRef = useRef<HTMLElement | null>(null);
  // A ref (not state) so reading it never triggers a render: set true when a
  // decision resolves in this session so focus moves to the confirmation heading
  // (never left on <body>). It stays false on ordinary renders so we never steal
  // focus from a host who has not acted yet.
  const focusOnResolveRef = useRef(false);

  // Callback ref: fires when the confirmation heading actually attaches to the
  // DOM. Because AnimatePresence "wait" mounts the confirmation only after the
  // buttons exit, focusing here reliably lands focus on the freshly mounted
  // heading rather than leaving it on <body>.
  function attachConfirmation(node: HTMLElement | null) {
    confirmationRef.current = node;
    if (node && focusOnResolveRef.current) {
      focusOnResolveRef.current = false;
      node.focus();
    }
  }

  // Calm, purposeful swap marking the shift from deciding to decided. Under
  // prefers-reduced-motion it becomes an instant swap (no transform, zero
  // duration) — full reduced-motion parity.
  const panelMotion = reducedMotion
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 1 }, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -6 },
        transition: { duration: 0.24, ease: "easeOut" as const },
      };

  async function decide(action: "accept" | "skip") {
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/requests/${requestId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const result = (await response.json()) as { error?: string; status?: JoinRequestStatus };
      if (!response.ok) throw new Error(result.error || "Decision failed.");
      const nextStatus = result.status ?? (action === "accept" ? "accepted" : "pending");
      setResolved(nextStatus);
      setAnnouncement(hostDecisionConfirmationMessage(nextStatus, requesterName));
      focusOnResolveRef.current = true;
      // Accepting adds a participant and consumes a place, so the surrounding
      // server-rendered view (accepted section, pending/accepted counts) must
      // re-sync. router.refresh() preserves this component's local state and
      // scroll; re-assert focus after the RSC merge so a keyboard / screen-reader
      // host is never stranded on <body>.
      if (nextStatus === "accepted") {
        router.refresh();
        requestAnimationFrame(() => confirmationRef.current?.focus());
      }
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : "Decision failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function panel() {
    if (resolved === "accepted") {
      return (
        <motion.div key="accepted" className="host-decision host-decision-resolved" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>{requesterName.trim() || "This member"} is in the group.</strong>
          <p className="host-decision-note">They can now see the exact meeting point and open the event room.</p>
        </motion.div>
      );
    }
    if (resolved === "declined") {
      return (
        <motion.div key="declined" className="host-decision host-decision-resolved" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>Request closed quietly.</strong>
          <p className="host-decision-note">Nothing is shown to them, and skip counts stay private.</p>
        </motion.div>
      );
    }
    if (resolved === "pending") {
      return (
        <motion.div key="skipped" className="host-decision host-decision-resolved" {...panelMotion}>
          <strong tabIndex={-1} ref={attachConfirmation}>Request skipped for now.</strong>
          <p className="host-decision-note">Nothing is shown to them; skip counts stay private.</p>
        </motion.div>
      );
    }
    return (
      <motion.div key="deciding" className="host-decision" {...panelMotion}>
        <button className="skip-request" type="button" onClick={() => decide("skip")} disabled={submitting}>{hostSkipButtonLabel(skipCount)}</button>
        <button className="accept-request" type="button" onClick={() => decide("accept")} disabled={submitting}>Accept</button>
        {skipCount >= 2 ? <p className="host-decision-note">This next skip closes the request quietly.</p> : null}
        {error ? <p role="alert">{error}</p> : null}
      </motion.div>
    );
  }

  return (
    <div className="host-decision-controls">
      <AnimatePresence mode="wait" initial={false}>
        {panel()}
      </AnimatePresence>
      {/* Polite live region: announces the accept/skip outcome to keyboard and
          screen-reader hosts the moment it resolves in place, alongside focus
          moving to the confirmation heading above. */}
      <p role="status" aria-live="polite" className="visually-hidden">{announcement}</p>
    </div>
  );
}
