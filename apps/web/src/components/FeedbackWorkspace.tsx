"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MEMBER_FEEDBACK_STATUS_INFO, normalizeMemberFeedbackStatus } from "@/lib/feedback-thread";

type Ticket = {
  id: string;
  category: string;
  surface: string;
  summary: string;
  details: string;
  currentPath: string;
  expectedOutcome: string;
  actualOutcome: string;
  severity: string;
  status?: string;
  createdAt: string;
  hasUnread?: boolean;
};

function statusLabel(status: string | undefined): string {
  return MEMBER_FEEDBACK_STATUS_INFO[normalizeMemberFeedbackStatus(status)].label;
}

type FormValues = Omit<Ticket, "id" | "status" | "createdAt">;

const EMPTY_FORM: FormValues = {
  category: "bug",
  surface: "web",
  summary: "",
  details: "",
  currentPath: "",
  expectedOutcome: "",
  actualOutcome: "",
  severity: "low",
};

const LABELS: Record<string, string> = {
  bug: "Something did not work",
  missing_feature: "Something is missing",
  usability: "Something was hard to use",
  accessibility: "Accessibility",
  performance: "Something was slow",
  content: "Words or information",
  suggestion: "An idea for improvement",
  other: "Something else",
  web: "Website",
  mobile: "Phone app",
  low: "Small friction",
  medium: "Blocked a task",
  high: "Could not continue",
  blocker: "Completely blocked",
};

function displayLabel(value: string) {
  return LABELS[value] ?? value.replaceAll("_", " ");
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function ticketsFrom(result: unknown): Ticket[] {
  if (Array.isArray(result)) return result as Ticket[];
  if (!result || typeof result !== "object") return [];
  const record = result as { tickets?: unknown; feedback?: unknown };
  if (Array.isArray(record.tickets)) return record.tickets as Ticket[];
  if (Array.isArray(record.feedback)) return record.feedback as Ticket[];
  return [];
}

function errorFrom(result: unknown, fallback: string) {
  if (result && typeof result === "object" && "error" in result && typeof result.error === "string") {
    return result.error;
  }
  return fallback;
}

// Presentational success confirmation. Kept as a separate, prop-driven component
// (no fetch, no effects) so its markup — the focusable heading, the polite live
// region, and the forward-path links — can be asserted with renderToStaticMarkup.
// The container owns moving focus here on submit (via attachConfirmation); this
// piece only guarantees the heading is a keyboard/AT focus target.
export function FeedbackConfirmation({
  headingRef,
  onSeeHistory,
}: {
  headingRef?: (node: HTMLElement | null) => void;
  // Called when the member activates "See it in what you've shared". The
  // container moves keyboard/AT focus to the history heading so activation lands
  // where the link promises, not on <body>. Kept as a prop (not baked in) so this
  // presentational piece stays effect-free and server-renderable.
  onSeeHistory?: () => void;
}) {
  return (
    <div className="feedback-confirmation" role="status" aria-live="polite">
      <p className="panel-label">Shared</p>
      <h3 className="feedback-confirmation-title" tabIndex={-1} ref={headingRef}>
        We&apos;ve received this — you can track it and see replies here.
      </h3>
      <p>
        It&apos;s now in <strong>&ldquo;What you&apos;ve shared&rdquo;</strong> below, marked <strong>Received</strong>. Open it to
        follow its status and reply to the team as they respond. We can&apos;t promise a timeline, but nothing you send
        disappears into a void.
      </p>
      <div className="feedback-confirmation-actions">
        <a
          className="feedback-confirmation-link"
          href="#feedback-history-title"
          onClick={onSeeHistory}
        >
          See it in what you&apos;ve shared
        </a>
        <Link className="feedback-confirmation-link feedback-confirmation-link--quiet" href="/profile">
          Back to profile
        </Link>
      </div>
    </div>
  );
}

export default function FeedbackWorkspace() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  // Split the flat `message` into a distinct success state and error string.
  // Success renders a warm, focusable confirmation with a forward path; errors
  // stay an inline alert so the member keeps their typed note and can retry.
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  // A ref (not state) so consuming it never triggers a render: set true only when
  // a submit succeeds in this session, so we move focus to the confirmation
  // heading (never leaving a keyboard / screen-reader member on <body>). Ordinary
  // renders leave it false so we never steal focus.
  const focusOnConfirmRef = useRef(false);
  // The history landmark heading ("What you've shared"). Held in a ref so that
  // when the member activates the "See it in what you've shared" link we can move
  // keyboard/AT focus onto it — otherwise the in-page anchor scrolls the heading
  // into view but drops focus to <body>, so an AT member is read the top of the
  // document instead of the destination the link names.
  const historyHeadingRef = useRef<HTMLHeadingElement | null>(null);

  // Callback ref: fires when the confirmation heading attaches to the DOM after a
  // successful submit. Focusing here (rather than in an effect) reliably lands
  // focus on the freshly mounted heading the moment it exists.
  function attachConfirmation(node: HTMLElement | null) {
    if (node && focusOnConfirmRef.current) {
      focusOnConfirmRef.current = false;
      node.focus();
    }
  }

  // Move focus to the history heading when the forward-path link is activated.
  // The heading carries tabIndex={-1} so it is a valid focus target; focusing it
  // (not <body>) is what makes arrival keyboard/AT-perceivable, independent of the
  // scroll animation — so reduced-motion members land correctly too. The browser
  // still handles the anchor's own scroll (smooth per globals.css, honouring
  // prefers-reduced-motion). preventScroll isn't set: letting focus scroll is
  // harmless here and keeps a single, consistent arrival.
  function focusHistoryHeading() {
    historyHeadingRef.current?.focus();
  }

  async function loadTickets() {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/feedback", { cache: "no-store" });
      const result = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(result, "Your feedback could not be loaded."));
      setTickets(ticketsFrom(result));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Your feedback could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    fetch("/api/feedback", { cache: "no-store" })
      .then(async (response) => {
        const result = await readJson(response);
        if (!response.ok) throw new Error(errorFrom(result, "Your feedback could not be loaded."));
        return ticketsFrom(result);
      })
      .then((result) => {
        if (active) setTickets(result);
      })
      .catch((error: unknown) => {
        if (active) setLoadError(error instanceof Error ? error.message : "Your feedback could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  function update<Key extends keyof FormValues>(key: Key, value: FormValues[Key]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSubmitted(false);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(result, "Your feedback could not be shared."));
      setValues((current) => ({ ...EMPTY_FORM, surface: current.surface }));
      focusOnConfirmRef.current = true;
      setSubmitted(true);
      await loadTickets();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your feedback could not be shared.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback-layout">
      <section className="feedback-form-panel" aria-labelledby="feedback-form-title">
        <div>
          <p className="panel-label">New feedback</p>
          <h2 id="feedback-form-title">What&apos;s on your mind?</h2>
          <p>Plain language is perfect. A short, specific example is more useful than a polished report.</p>
        </div>

        <aside className="feedback-privacy-note" aria-label="Privacy reminder">
          <strong>Keep private details out.</strong>
          <span>Do not include exact addresses, contact or payment details, health information, or private messages.</span>
        </aside>

        <form className="feedback-form" onSubmit={submit}>
          <div className="feedback-form-row">
            <label>
              What kind of feedback is this?
              <select value={values.category} onChange={(event) => update("category", event.target.value)}>
                <option value="bug">Something did not work</option>
                <option value="missing_feature">Something is missing</option>
                <option value="usability">Something was hard to use</option>
                <option value="accessibility">Accessibility</option>
                <option value="performance">Something was slow</option>
                <option value="content">Words or information</option>
                <option value="suggestion">An idea for improvement</option>
                <option value="other">Something else</option>
              </select>
            </label>
            <label>
              Where did it happen?
              <select value={values.surface} onChange={(event) => update("surface", event.target.value)}>
                <option value="web">Website</option>
                <option value="mobile">Phone app</option>
              </select>
            </label>
          </div>

          <label>
            Short summary
            <input value={values.summary} onChange={(event) => update("summary", event.target.value)} minLength={10} maxLength={160} placeholder="An idea, a kind word, or what didn't work" required />
          </label>
          <label>
            Tell us more
            <textarea value={values.details} onChange={(event) => update("details", event.target.value)} minLength={20} maxLength={4000} rows={4} placeholder="Share your idea, note, or what happened — without including anyone's private information." required />
          </label>
          <label>
            Page or screen
            <input value={values.currentPath} onChange={(event) => update("currentPath", event.target.value)} maxLength={200} pattern="[^?#]+" title="Leave out query parameters and page fragments." placeholder="For example: Event room or /discover" required />
          </label>
          <div className="feedback-form-row">
            <label>
              What did you expect? (optional)
              <textarea value={values.expectedOutcome} onChange={(event) => update("expectedOutcome", event.target.value)} maxLength={1000} rows={3} />
            </label>
            <label>
              What happened instead? (optional)
              <textarea value={values.actualOutcome} onChange={(event) => update("actualOutcome", event.target.value)} maxLength={1000} rows={3} />
            </label>
          </div>
          <fieldset>
            <legend>How much did this affect you?</legend>
            <div className="feedback-severity-options">
              {(["low", "medium", "high", "blocker"] as const).map((severity) => (
                <label key={severity}>
                  <input type="radio" name="severity" value={severity} checked={values.severity === severity} onChange={() => update("severity", severity)} />
                  <span>{displayLabel(severity)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <p className="feedback-safety-route">
            This channel is for product experience. Member-specific or urgent safety concerns belong in the <Link href="/safety">Safety center</Link>. This service is not an emergency responder.
          </p>
          <button type="submit" disabled={submitting}>{submitting ? "Sharing..." : "Share feedback"}</button>
          {submitted ? <FeedbackConfirmation headingRef={attachConfirmation} onSeeHistory={focusHistoryHeading} /> : null}
          {error ? <p className="feedback-message feedback-message--error" role="alert">{error}</p> : null}
        </form>
      </section>

      <section className="feedback-history" aria-labelledby="feedback-history-title" aria-busy={loading}>
        <header>
          <div><p className="panel-label">Your feedback</p><h2 id="feedback-history-title" tabIndex={-1} ref={historyHeadingRef}>What you&apos;ve shared</h2></div>
          {!loading && !loadError ? <span>{tickets.length}</span> : null}
        </header>
        {loading ? <p className="feedback-history-state">Loading your feedback...</p> : null}
        {loadError ? (
          <div className="feedback-history-state" role="alert"><p>{loadError}</p><button type="button" onClick={() => void loadTickets()}>Try again</button></div>
        ) : null}
        {!loading && !loadError && tickets.length === 0 ? (
          <div className="feedback-history-state"><strong>Nothing shared yet — and that&apos;s fine.</strong><p>When something feels off, tell us on the left. Anything you send shows up here so you can follow where it lands.</p></div>
        ) : null}
        {!loading && !loadError && tickets.length > 0 ? (
          <div className="feedback-ticket-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className={`feedback-ticket${ticket.hasUnread ? " has-unread" : ""}`}>
                <header>
                  <span>{displayLabel(ticket.category)}</span>
                  <span className="feedback-ticket-status">{statusLabel(ticket.status)}</span>
                </header>
                <h3>
                  <Link href={`/feedback/${ticket.id}`} className="feedback-ticket-link">{ticket.summary}</Link>
                </h3>
                {ticket.hasUnread ? <p className="feedback-ticket-unread" role="status">Update from the KeepItUp team — open to read</p> : null}
                <p className="feedback-ticket-details">{ticket.details}</p>
                <dl>
                  <div><dt>Impact</dt><dd>{displayLabel(ticket.severity)}</dd></div>
                  <div><dt>Page</dt><dd>{ticket.currentPath}</dd></div>
                  <div><dt>Shared</dt><dd>{new Date(ticket.createdAt).toLocaleDateString()}</dd></div>
                </dl>
                <p className="feedback-ticket-track"><Link href={`/feedback/${ticket.id}`}>Open &amp; reply →</Link></p>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
