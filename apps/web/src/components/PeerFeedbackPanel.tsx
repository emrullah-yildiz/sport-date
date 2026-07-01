"use client";

import { PEER_FEEDBACK_ANSWERS, type PeerFeedbackAnswer, peerFeedbackHasSubstance } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

export type PeerFeedbackTargetView = {
  userId: string;
  firstName: string;
  isHost: boolean;
  submitted: boolean;
  editable: boolean;
  given: { showedUp: PeerFeedbackAnswer; feltRespected: PeerFeedbackAnswer; feltSafe: PeerFeedbackAnswer; note: string | null } | null;
};

const ANSWER_LABELS: Record<PeerFeedbackAnswer, string> = {
  yes: "Yes",
  no: "No",
  prefer_not_to_say: "Prefer not to say",
};

const CONFIRMATIONS = [
  { key: "showedUp", label: "They showed up" },
  { key: "feltRespected", label: "I felt respected" },
  { key: "feltSafe", label: "I felt safe" },
] as const;

// "" is the unselected state: no radio is pre-checked, so a member who expands a
// person's <details> out of curiosity and submits without choosing is caught rather
// than silently filing a note. It never maps to a stored answer.
type AnswerChoice = PeerFeedbackAnswer | "";
type Answers = { showedUp: AnswerChoice; feltRespected: AnswerChoice; feltSafe: AnswerChoice };

function AnswerGroup({
  legend,
  name,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  value: AnswerChoice;
  onChange: (next: PeerFeedbackAnswer) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="peer-feedback-group">
      <legend>{legend}</legend>
      {PEER_FEEDBACK_ANSWERS.map((answer) => (
        <label key={answer}>
          <input
            type="radio"
            name={name}
            value={answer}
            checked={value === answer}
            disabled={disabled}
            onChange={() => onChange(answer)}
          />
          {ANSWER_LABELS[answer]}
        </label>
      ))}
    </fieldset>
  );
}

function TargetForm({ eventId, target }: { eventId: string; target: PeerFeedbackTargetView }) {
  const router = useRouter();
  const baseId = useId();
  // No pre-selected radio when there is no prior note: an idle expand + click can no
  // longer file an all-"prefer not to say" (content-free) row. A prior note re-seeds
  // its own answers so editing keeps them visible.
  const [answers, setAnswers] = useState<Answers>({
    showedUp: target.given?.showedUp ?? "",
    feltRespected: target.given?.feltRespected ?? "",
    feltSafe: target.given?.feltSafe ?? "",
  });
  const [note, setNote] = useState(target.given?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  // Set only on a successful save this session: swaps the mutable form for a
  // resolved "recorded privately" confirmation and moves focus to it.
  const [resolved, setResolved] = useState<{ message: string; concern: boolean } | null>(null);
  const confirmationRef = useRef<HTMLParagraphElement | null>(null);
  // A ref (not state) so reading it never triggers a render: true only right after a
  // save resolves, so the callback ref moves focus to the fresh confirmation instead
  // of leaving a keyboard / screen-reader member stranded on the submit button.
  const focusOnResolveRef = useRef(false);

  const locked = target.submitted && !target.editable;

  // Mirror the domain content-floor so submit is only enabled once the member has
  // actually said something (one substantive answer, or a note). This keeps parity
  // with validatePeerFeedback, which rejects the same empty payload server-side.
  const canSubmit = peerFeedbackHasSubstance({
    showedUp: answers.showedUp || "prefer_not_to_say",
    feltRespected: answers.feltRespected || "prefer_not_to_say",
    feltSafe: answers.feltSafe || "prefer_not_to_say",
    note: note.trim() || null,
  });

  // Callback ref: fires when the confirmation actually attaches to the DOM after the
  // form is swapped out, so focus lands reliably on the freshly mounted element
  // rather than on <body>. Same pattern as the shipped join-request confirmation.
  function attachConfirmation(node: HTMLParagraphElement | null) {
    confirmationRef.current = node;
    if (node && focusOnResolveRef.current) {
      focusOnResolveRef.current = false;
      node.focus();
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/events/${eventId}/peer-feedback/${target.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showedUp: answers.showedUp || "prefer_not_to_say",
          feltRespected: answers.feltRespected || "prefer_not_to_say",
          feltSafe: answers.feltSafe || "prefer_not_to_say",
          note: note.trim() || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      // Resolve in place to a clear "done" state and move focus to it; router.refresh()
      // re-syncs the server-rendered locked/submitted flags around it.
      focusOnResolveRef.current = true;
      setResolved({ message: result.message, concern: Boolean(result.safetyConcern) });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Feedback could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="peer-feedback-target" open={resolved ? true : undefined}>
      <summary>
        <strong>{target.firstName}</strong>
        <small>{target.isHost ? "host" : "co-attendee"}{target.submitted || resolved ? " · recorded privately" : ""}</small>
      </summary>
      {resolved ? (
        // Focus-managed success: the mutable form is gone, replaced by a confirmation
        // that announces itself (role="status") and receives focus. No timers/motion,
        // so it is identical under prefers-reduced-motion.
        <div className="peer-feedback-resolved">
          <p className="peer-feedback-recorded" role="status" tabIndex={-1} ref={attachConfirmation}>
            {resolved.message}
          </p>
          {resolved.concern ? (
            <p className="peer-feedback-safety-nudge">
              If something felt unsafe or disrespectful, please use the Report or Block controls for {target.firstName} above — this note does not reach the safety team as a report.
            </p>
          ) : null}
        </div>
      ) : locked ? (
        <p className="peer-feedback-locked" role="note">
          You already left a private note for {target.firstName}. The short edit window has passed, so it is now locked.
        </p>
      ) : (
        <form onSubmit={submit}>
          {CONFIRMATIONS.map((confirmation) => (
            <AnswerGroup
              key={confirmation.key}
              legend={confirmation.label}
              name={`${baseId}-${confirmation.key}`}
              value={answers[confirmation.key]}
              onChange={(next) => setAnswers((current) => ({ ...current, [confirmation.key]: next }))}
              disabled={submitting}
            />
          ))}
          <label className="peer-feedback-note">
            Optional private note to the safety team
            <textarea
              maxLength={1000}
              rows={3}
              value={note}
              disabled={submitting}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Anything trust & safety should know. Never shown to this person."
            />
          </label>
          {!canSubmit ? (
            <p className="peer-feedback-hint">
              Answer at least one question, or leave a private note. Skipping this person is fine — nothing is recorded.
            </p>
          ) : null}
          <button type="submit" disabled={submitting || !canSubmit}>
            {submitting ? "Saving…" : target.submitted ? "Update private note" : "Record privately"}
          </button>
          {error ? <p className="peer-feedback-message" role="alert">{error}</p> : null}
        </form>
      )}
    </details>
  );
}

export default function PeerFeedbackPanel({ eventId, targets }: { eventId: string; targets: PeerFeedbackTargetView[] }) {
  if (targets.length === 0) return null;
  return (
    <section className="peer-feedback" aria-labelledby="peer-feedback-title">
      <div>
        <p className="panel-label">Quiet trust</p>
        <h2 id="peer-feedback-title">A private word on who you met</h2>
        <p>
          Only for the people you actually met here. These reliability and respect notes are private,
          are never shown on anyone&apos;s profile, and are never a public score or rating. You can leave one for
          each person, or none at all — nothing changes if you skip it.
        </p>
      </div>
      <div className="peer-feedback-list">
        {targets.map((target) => (
          <TargetForm key={target.userId} eventId={eventId} target={target} />
        ))}
      </div>
      <small>This is not a substitute for reporting. If something was wrong, use the Report or Block controls above.</small>
    </section>
  );
}
