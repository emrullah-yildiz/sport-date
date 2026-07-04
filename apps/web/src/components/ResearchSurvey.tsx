"use client";

import { useState } from "react";

import { SUPPORT_EMAIL } from "@/lib/brand";
import {
  Q11_FACTORS,
  SURVEY_ONE_QUESTIONS,
  SURVEY_TWO_QUESTIONS,
  type ResearchQuestion,
} from "@/lib/research-survey";

// The anonymous research survey flow (CX-20260704):
//
//   Survey 1 (Q1–Q6, Q8) → submit → "5 more minutes?" (optional Survey 2,
//   Q10–Q15) → separate contact screen (Q7, own consent checkbox) → thank you.
//
// Honesty and consent rules baked in:
// - EVERY question is skippable; submitting with any subset (even none) works.
// - Each screen can be skipped entirely; skipping changes nothing else.
// - The contact is a separate screen, a separate request, and a separate,
//   unlinked table server-side. Its consent checkbox gates the request.
// - No cookies, no auth, no identity: the only state is this component's.
// - Failure states are calm and recoverable (retry keeps typed answers; a
//   rate-limit 429 shows the server's message).

type Stage = "survey1" | "offerMore" | "survey2" | "contact" | "done";

type AnswerMap = Record<string, string | string[] | Record<string, number>>;

function ChoiceQuestion({
  question,
  index,
  value,
  onChange,
}: {
  question: ResearchQuestion;
  index: number;
  value: AnswerMap[string] | undefined;
  onChange: (id: string, value: string | string[] | undefined) => void;
}) {
  const multi = question.kind === "multi";
  const selected = multi ? (Array.isArray(value) ? value : []) : typeof value === "string" ? value : "";

  function toggle(option: string) {
    if (multi) {
      const list = selected as string[];
      onChange(question.id, list.includes(option) ? list.filter((entry) => entry !== option) : [...list, option]);
    } else {
      // Tapping the chosen option again clears it — "skip any question" stays
      // true even after an accidental tap.
      onChange(question.id, selected === option ? undefined : option);
    }
  }

  return (
    <fieldset className="research-question">
      <legend>
        <span className="research-question-number" aria-hidden="true">{index}</span>
        {question.text}
        {question.optional ? <span className="research-optional"> (optional)</span> : null}
      </legend>
      <div className="research-options" role="group">
        {question.options!.map((option) => {
          const active = multi ? (selected as string[]).includes(option) : selected === option;
          return (
            <button
              type="button"
              key={option}
              className={`research-option${active ? " is-selected" : ""}`}
              aria-pressed={active}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TextQuestion({
  question,
  index,
  value,
  onChange,
}: {
  question: ResearchQuestion;
  index: number;
  value: AnswerMap[string] | undefined;
  onChange: (id: string, value: string | undefined) => void;
}) {
  const inputId = `research-${question.id}`;
  return (
    <div className="research-question">
      <label htmlFor={inputId}>
        <span className="research-question-number" aria-hidden="true">{index}</span>
        {question.text}
        {question.optional ? <span className="research-optional"> (optional)</span> : null}
      </label>
      <textarea
        id={inputId}
        rows={3}
        maxLength={600}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(question.id, event.target.value || undefined)}
      />
    </div>
  );
}

function RatingQuestion({
  question,
  index,
  value,
  onChange,
}: {
  question: ResearchQuestion;
  index: number;
  value: AnswerMap[string] | undefined;
  onChange: (id: string, value: Record<string, number> | undefined) => void;
}) {
  const ratings = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, number>) : {};
  function rate(factor: string, rating: number) {
    const next = { ...ratings };
    if (next[factor] === rating) delete next[factor]; // tap again to clear — still skippable
    else next[factor] = rating;
    onChange(question.id, Object.keys(next).length > 0 ? next : undefined);
  }
  return (
    <fieldset className="research-question">
      <legend>
        <span className="research-question-number" aria-hidden="true">{index}</span>
        {question.text}
      </legend>
      <div className="research-ratings">
        {Q11_FACTORS.map((factor) => (
          <div className="research-rating-row" key={factor} role="group" aria-label={`${factor}: rate 1 (not important) to 5 (very important)`}>
            <span className="research-rating-factor">{factor}</span>
            <span className="research-rating-scale">
              {[1, 2, 3, 4, 5].map((rating) => (
                <button
                  type="button"
                  key={rating}
                  className={`research-rating${ratings[factor] === rating ? " is-selected" : ""}`}
                  aria-pressed={ratings[factor] === rating}
                  aria-label={`${factor}: ${rating} of 5`}
                  onClick={() => rate(factor, rating)}
                >
                  {rating}
                </button>
              ))}
            </span>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

function OtherText({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: AnswerMap[string] | undefined;
  onChange: (id: string, value: string | undefined) => void;
}) {
  return (
    <div className="research-other">
      <label htmlFor={`research-${id}`}>{label}</label>
      <input
        id={`research-${id}`}
        type="text"
        maxLength={600}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(id, event.target.value || undefined)}
      />
    </div>
  );
}

function QuestionList({
  questions,
  answers,
  setAnswer,
  startNumber,
}: {
  questions: readonly ResearchQuestion[];
  answers: AnswerMap;
  setAnswer: (id: string, value: AnswerMap[string] | undefined) => void;
  startNumber: number;
}) {
  return (
    <>
      {questions.map((question, index) => {
        const number = startNumber + index;
        return (
          <div key={question.id}>
            {question.kind === "text" ? (
              <TextQuestion question={question} index={number} value={answers[question.id]} onChange={setAnswer} />
            ) : question.kind === "rate" ? (
              <RatingQuestion question={question} index={number} value={answers[question.id]} onChange={setAnswer} />
            ) : (
              <ChoiceQuestion question={question} index={number} value={answers[question.id]} onChange={setAnswer} />
            )}
            {question.otherKey ? (
              <OtherText
                id={question.otherKey}
                label={question.id === "q12" ? "If it depends — on what?" : "If other — tell us more (optional)"}
                value={answers[question.otherKey]}
                onChange={setAnswer}
              />
            ) : null}
          </div>
        );
      })}
    </>
  );
}

async function postResearch(payload: Record<string, unknown>): Promise<{ ok: boolean; status: number; body: Record<string, unknown> }> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    // non-JSON error body — the generic message below covers it
  }
  return { ok: response.ok, status: response.status, body };
}

export default function ResearchSurvey() {
  const [stage, setStage] = useState<Stage>("survey1");
  const [answersOne, setAnswersOne] = useState<AnswerMap>({});
  const [answersTwo, setAnswersTwo] = useState<AnswerMap>({});
  const [responseId, setResponseId] = useState<string | null>(null);
  const [contact, setContact] = useState("");
  const [consent, setConsent] = useState(false);
  const [contactStored, setContactStored] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const setOne = (id: string, value: AnswerMap[string] | undefined) =>
    setAnswersOne((current) => {
      const next = { ...current };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  const setTwo = (id: string, value: AnswerMap[string] | undefined) =>
    setAnswersTwo((current) => {
      const next = { ...current };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });

  async function submit(payload: Record<string, unknown>, onSuccess: (body: Record<string, unknown>) => void) {
    setBusy(true);
    setError("");
    try {
      const result = await postResearch(payload);
      if (!result.ok) {
        setError(typeof result.body.error === "string" ? result.body.error : "Something went wrong. Your answers are still here — please try again.");
        return;
      }
      onSuccess(result.body);
    } catch {
      setError("We couldn't reach the server. Your answers are still here — check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const submitSurveyOne = () =>
    submit({ action: "answers", answers: answersOne }, (body) => {
      setResponseId(typeof body.responseId === "string" ? body.responseId : null);
      setStage("offerMore");
    });

  const submitSurveyTwo = () =>
    submit({ action: "extend", responseId, answers: answersTwo }, () => setStage("contact"));

  const submitContact = () =>
    submit({ action: "contact", contact, consent }, () => {
      setContactStored(true);
      setStage("done");
    });

  if (stage === "done") {
    return (
      <section className="research-panel" role="status">
        <h2>Thank you.</h2>
        <p>
          Your answers help us understand how adults actually find people to be active with —
          nothing here signed you up to anything.
        </p>
        {contactStored ? (
          <p>
            We stored the contact you left only to schedule the research conversation, and we
            delete it once the study is scheduled or complete. To have it deleted sooner, email{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </p>
        ) : null}
      </section>
    );
  }

  if (stage === "offerMore") {
    return (
      <section className="research-panel">
        <h2>Thank you — that&rsquo;s submitted.</h2>
        <p>
          Up for about 5 more minutes? A few deeper questions — intentions, what you&rsquo;d need to
          know before committing, and how you feel about paying for something like this. Entirely
          optional and just as anonymous.
        </p>
        <div className="research-actions">
          <button type="button" className="research-primary" onClick={() => setStage("survey2")}>
            Continue with the longer questions
          </button>
          <button type="button" className="research-secondary" onClick={() => setStage("contact")}>
            No thanks — finish up
          </button>
        </div>
      </section>
    );
  }

  if (stage === "contact") {
    return (
      <section className="research-panel">
        <h2>One last, fully optional thing</h2>
        <p>
          Would you be open to a 20-30 minute research conversation? If yes, leave a contact.
          It is collected separately from your answers, used only to schedule this study, and
          deleted once the study is scheduled or complete. Your survey answers stay anonymous
          either way — the two are stored apart and never linked.
        </p>
        <div className="research-question">
          <label htmlFor="research-contact">Email or other contact (optional)</label>
          <input
            id="research-contact"
            type="text"
            autoComplete="email"
            maxLength={200}
            value={contact}
            onChange={(event) => setContact(event.target.value)}
          />
        </div>
        <label className="research-consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            I agree that this contact may be stored and used only to schedule a research
            conversation, and deleted afterwards. I can request deletion any time at{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
          </span>
        </label>
        {error ? <p className="research-error" role="alert">{error}</p> : null}
        <div className="research-actions">
          <button
            type="button"
            className="research-primary"
            onClick={submitContact}
            disabled={busy || !consent || contact.trim().length < 3}
          >
            {busy ? "Sending…" : "Leave my contact"}
          </button>
          <button type="button" className="research-secondary" onClick={() => setStage("done")} disabled={busy}>
            Skip — stay fully anonymous
          </button>
        </div>
      </section>
    );
  }

  const isSurveyTwo = stage === "survey2";
  return (
    <section className="research-panel">
      {isSurveyTwo ? (
        <p className="research-progress">The longer set — every question is still optional.</p>
      ) : null}
      <QuestionList
        questions={isSurveyTwo ? SURVEY_TWO_QUESTIONS : SURVEY_ONE_QUESTIONS}
        answers={isSurveyTwo ? answersTwo : answersOne}
        setAnswer={isSurveyTwo ? setTwo : setOne}
        startNumber={1}
      />
      {error ? <p className="research-error" role="alert">{error}</p> : null}
      <div className="research-actions">
        <button
          type="button"
          className="research-primary"
          onClick={isSurveyTwo ? submitSurveyTwo : submitSurveyOne}
          disabled={busy}
        >
          {busy ? "Sending…" : isSurveyTwo ? "Submit these answers" : "Submit answers"}
        </button>
        {isSurveyTwo ? (
          <button type="button" className="research-secondary" onClick={() => setStage("contact")} disabled={busy}>
            Skip the rest
          </button>
        ) : null}
      </div>
      <p className="research-skippable-note">
        Answer as much or as little as you like — skipped questions are simply not recorded.
      </p>
    </section>
  );
}
