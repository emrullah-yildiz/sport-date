"use client";

import {
  PEER_FEEDBACK_ANSWERS,
  PEER_FEEDBACK_STARS_MAX,
  PEER_FEEDBACK_STARS_MIN,
  type PeerFeedbackAnswer,
  peerFeedbackHasSubstance,
} from "@sport-date/domain";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";

export type PeerFeedbackTargetView = {
  userId: string;
  firstName: string;
  isHost: boolean;
  submitted: boolean;
  editable: boolean;
  given: {
    showedUp: PeerFeedbackAnswer;
    feltRespected: PeerFeedbackAnswer;
    feltSafe: PeerFeedbackAnswer;
    note: string | null;
    experienceStars?: number | null;
  } | null;
};

const STAR_VALUES = [1, 2, 3, 4, 5] as const;
// Plain-language meaning for each star value so the control is never colour- or
// shape-only: every option carries an accessible name a screen reader announces.
const STAR_LABELS: Record<(typeof STAR_VALUES)[number], string> = {
  1: "1 star — the meetup did not go well",
  2: "2 stars — some issues with how it went",
  3: "3 stars — a fine, respectful meetup",
  4: "4 stars — a good, reliable meetup",
  5: "5 stars — an excellent, respectful meetup",
};

// A keyboard-operable, labelled star input built on a native radio group: Tab moves
// focus in, arrow keys move between values, each value has a real accessible name
// and a visible numeric label (not colour-only). Optional — leaving it unset means
// "no star". It rates the EXPERIENCE of meeting up, never looks/desirability.
function ExperienceStarInput({
  name,
  value,
  onChange,
  disabled,
  personName,
}: {
  name: string;
  value: number | "";
  onChange: (next: number) => void;
  disabled: boolean;
  personName: string;
}) {
  return (
    <fieldset className="peer-feedback-stars">
      <legend>How was the experience of meeting up? (optional)</legend>
      <p className="peer-feedback-stars-help">
        Rate reliability, respect, and how the shared activity went with {personName} — <strong>not</strong> their looks or desirability.
      </p>
      <div className="peer-feedback-stars-options" role="radiogroup" aria-label={`Experience rating from ${PEER_FEEDBACK_STARS_MIN} to ${PEER_FEEDBACK_STARS_MAX} stars`}>
        {STAR_VALUES.map((star) => (
          <label key={star} className="peer-feedback-star-option" data-selected={value === star ? "true" : undefined}>
            <input
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              disabled={disabled}
              onChange={() => onChange(star)}
            />
            <span aria-hidden="true" className="peer-feedback-star-glyph">{"★".repeat(star)}</span>
            <span className="peer-feedback-star-name">{STAR_LABELS[star]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

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
  const [stars, setStars] = useState<number | "">(target.given?.experienceStars ?? "");
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
    experienceStars: stars === "" ? null : stars,
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
          experienceStars: stars === "" ? null : stars,
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
          <ExperienceStarInput
            name={`${baseId}-experience-stars`}
            value={stars}
            onChange={(next) => setStars(next)}
            disabled={submitting}
            personName={target.firstName}
          />
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
              Answer at least one question, or leave a private note or a star. Skipping this person is fine — nothing is recorded.
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
          Only for the people you actually met here. Your reliability and respect notes stay private, and the
          optional 1&ndash;5 star rating is about <strong>how the meetup went</strong> &mdash; reliability, respect, and the
          shared activity &mdash; never about looks or desirability. What you leave is never shown on anyone&apos;s profile
          and never as a public score. The person only ever sees an <em>average</em> of the stars they&apos;ve received, and
          only once at least three people have rated them &mdash; never who gave which star. You can leave feedback for
          each person, or none at all.
        </p>
      </div>
      <div className="peer-feedback-list">
        {targets.map((target) => (
          <TargetForm key={target.userId} eventId={eventId} target={target} />
        ))}
      </div>
      <small>
        This is not a substitute for reporting. If something was wrong &mdash; including a rating you believe was unfair or
        abusive &mdash; use the Report or Block controls above; a report reaches the safety team, and a rating never limits
        your ability to leave, block, or report.
      </small>
    </section>
  );
}
