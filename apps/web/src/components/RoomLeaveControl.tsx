"use client";

import { MAX_GRACEFUL_EXIT_NOTE_LENGTH, exitReasonIsSafety, type GracefulExitReason } from "@sport-date/domain";
import { useEffect, useId, useRef, useState } from "react";

import { cancelJoinRequest } from "@/lib/cancel-join-request";

// Member-facing labels for the optional, PRIVATE reason. Calm and non-judgemental —
// no reason implies fault, and "prefer not to say" is a first-class choice.
const REASON_LABELS: Record<GracefulExitReason, string> = {
  unspecified: "I'd rather just leave",
  cant_make_it: "I can't make it",
  left_early: "I had to leave early",
  plans_changed: "My plans changed",
  felt_unsafe: "I didn't feel safe",
  prefer_not_to_say: "Prefer not to say",
};

// Order shown to the member. "unspecified" is the pre-selected, no-explanation option
// so recording a reason stays entirely optional.
const REASON_ORDER: GracefulExitReason[] = [
  "unspecified",
  "cant_make_it",
  "left_early",
  "plans_changed",
  "felt_unsafe",
  "prefer_not_to_say",
];

type Phase = "idle" | "confirming" | "leaving" | "done" | "error";

export default function RoomLeaveControl({
  eventId,
  requestId,
  // Anchor of the in-room safety controls (report / block), so a member leaving for
  // safety reasons is one clear, never-paywalled step away from them.
  safetyControlsId = "room-people",
}: {
  eventId: string;
  requestId: string;
  safetyControlsId?: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reason, setReason] = useState<GracefulExitReason>("unspecified");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const safetyPromptId = useId();

  const isSafetyReason = exitReasonIsSafety(reason);
  const submitting = phase === "leaving";

  // On a successful exit, move keyboard focus to the calm acknowledgement so a
  // keyboard/screen-reader member is taken to the confirmation and its next step.
  useEffect(() => {
    if (phase === "done") panelRef.current?.focus();
  }, [phase]);

  function openConfirm() {
    setPhase("confirming");
    setMessage("");
    // Move focus to the confirmation panel for keyboard and screen-reader users.
    requestAnimationFrame(() => panelRef.current?.focus());
  }

  function cancelExit() {
    setPhase("idle");
    setMessage("");
  }

  async function confirmLeave() {
    setPhase("leaving");
    setMessage("");
    // The shared helper owns the client-side timeout/abort, so a hung or slow
    // request can never strand this button on "Leaving…"; it always resolves.
    const result = await cancelJoinRequest(eventId, requestId, {
      // Optional private reason. The seat is removed regardless of what is sent;
      // this only records the member's own note, never shown to anyone else.
      exit: { reason, note: reason === "prefer_not_to_say" || reason === "unspecified" ? "" : note },
    });
    if (!result.ok) {
      // Re-enable the control (phase leaves "leaving") and show the calm,
      // recoverable message — the member's place is untouched.
      setMessage(result.message);
      setPhase("error");
      return;
    }
    setPhase("done");
  }

  // Calm acknowledgement after a successful exit. Reassures the member their choice
  // was fine and gives one clear next step — never a dead end, never shaming.
  if (phase === "done") {
    return (
      <aside className="room-leave-card room-leave-done" role="status" aria-labelledby={headingId} tabIndex={-1} ref={panelRef}>
        <strong id={headingId}>You&apos;ve left this event.</strong>
        <p>
          Your seat and exact-location access were removed right away, and the host now sees the real group size.
          Leaving whenever you need to — including to stay safe — is always okay. Nothing about this is shown to
          other members.
        </p>
        <div className="room-leave-actions">
          <a href="/discover" className="room-leave-primary">Find another event</a>
          <a href="/profile">Back to your profile</a>
        </div>
      </aside>
    );
  }

  return (
    <aside className="room-leave-card" aria-labelledby={headingId}>
      <strong id={headingId}>Need to step back?</strong>
      <p>
        You can leave any time, no explanation needed. Leaving to look after yourself is always the right call.
        We&apos;ll remove your seat and exact-location access right away so the host sees the real group size.
      </p>

      {phase === "idle" ? (
        <button type="button" className="room-leave-open" onClick={openConfirm}>
          Leave this event
        </button>
      ) : null}

      {phase === "confirming" || phase === "leaving" || phase === "error" ? (
        <div className="room-leave-confirm" ref={panelRef} tabIndex={-1} aria-label="Confirm leaving this event">
          <fieldset className="room-leave-reasons">
            <legend>If you&apos;d like, tell us why — just for you</legend>
            <p className="room-leave-reasons-note">
              This is optional and completely private. It is never shown to the host or other members, and it never
              becomes a score or count. You can leave without choosing anything.
            </p>
            <div className="room-leave-reason-list">
              {REASON_ORDER.map((value) => (
                <label key={value} className="room-leave-reason">
                  <input
                    type="radio"
                    name="room-leave-reason"
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    disabled={submitting}
                  />
                  <span>{REASON_LABELS[value]}</span>
                </label>
              ))}
            </div>

            {reason !== "unspecified" && reason !== "prefer_not_to_say" ? (
              <label className="room-leave-note">
                Add a private note (optional)
                <textarea
                  rows={2}
                  maxLength={MAX_GRACEFUL_EXIT_NOTE_LENGTH}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  disabled={submitting}
                  placeholder="Only you will ever see this."
                />
              </label>
            ) : null}
          </fieldset>

          {isSafetyReason ? (
            <div className="room-leave-safety" role="note" aria-labelledby={safetyPromptId}>
              <strong id={safetyPromptId}>Thank you for protecting yourself.</strong>
              <p>
                If someone made you feel unsafe, you can report or block them in one step — it&apos;s always free and
                takes only a moment. You can do that before or after you leave.
              </p>
              <a className="room-leave-safety-link" href={`#${safetyControlsId}`}>
                Go to report &amp; block options
              </a>
            </div>
          ) : null}

          <div className="room-leave-confirm-actions">
            <button type="button" className="room-leave-danger" onClick={confirmLeave} disabled={submitting}>
              {submitting ? "Leaving…" : "Confirm and leave"}
            </button>
            <button type="button" className="room-leave-stay" onClick={cancelExit} disabled={submitting}>
              Stay for now
            </button>
          </div>

          {phase === "error" && message ? (
            <p className="room-leave-error" role="alert">
              {message} You can try again or step back for now.
            </p>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
