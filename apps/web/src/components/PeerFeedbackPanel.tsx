"use client";

import { PEER_FEEDBACK_ANSWERS, type PeerFeedbackAnswer } from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";

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

type Answers = { showedUp: PeerFeedbackAnswer; feltRespected: PeerFeedbackAnswer; feltSafe: PeerFeedbackAnswer };

function AnswerGroup({
  legend,
  name,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  name: string;
  value: PeerFeedbackAnswer;
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
  const [answers, setAnswers] = useState<Answers>({
    showedUp: target.given?.showedUp ?? "prefer_not_to_say",
    feltRespected: target.given?.feltRespected ?? "prefer_not_to_say",
    feltSafe: target.given?.feltSafe ?? "prefer_not_to_say",
  });
  const [note, setNote] = useState(target.given?.note ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [concern, setConcern] = useState(false);

  const locked = target.submitted && !target.editable;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const response = await fetch(`/api/events/${eventId}/peer-feedback/${target.userId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...answers, note: note.trim() || null }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Feedback could not be saved.");
      setMessage(result.message);
      setConcern(Boolean(result.safetyConcern));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Feedback could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <details className="peer-feedback-target">
      <summary>
        <strong>{target.firstName}</strong>
        <small>{target.isHost ? "host" : "co-attendee"}{target.submitted ? " · recorded privately" : ""}</small>
      </summary>
      {locked ? (
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
          <button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : target.submitted ? "Update private note" : "Record privately"}
          </button>
        </form>
      )}
      {message ? <p className="peer-feedback-message" role="status">{message}</p> : null}
      {concern ? (
        <p className="peer-feedback-safety-nudge">
          If something felt unsafe or disrespectful, please use the Report or Block controls for {target.firstName} above — this note does not reach the safety team as a report.
        </p>
      ) : null}
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
