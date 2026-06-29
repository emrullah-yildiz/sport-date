"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
};

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
  open: "Shared",
  in_progress: "Being reviewed",
  resolved: "Addressed",
  closed: "Closed",
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

export default function FeedbackWorkspace() {
  const [values, setValues] = useState<FormValues>(EMPTY_FORM);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");

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
    setMessage("");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const result = await readJson(response);
      if (!response.ok) throw new Error(errorFrom(result, "Your feedback could not be shared."));
      setValues((current) => ({ ...EMPTY_FORM, surface: current.surface }));
      setMessage("Thank you. Your feedback is now with the team.");
      await loadTickets();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Your feedback could not be shared.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="feedback-layout">
      <section className="feedback-form-panel" aria-labelledby="feedback-form-title">
        <div>
          <p className="panel-label">New feedback</p>
          <h2 id="feedback-form-title">What happened?</h2>
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
            <input value={values.summary} onChange={(event) => update("summary", event.target.value)} minLength={10} maxLength={160} placeholder="I could not cancel my request" required />
          </label>
          <label>
            What were you trying to do?
            <textarea value={values.details} onChange={(event) => update("details", event.target.value)} minLength={20} maxLength={4000} rows={4} placeholder="Describe the steps you took, without including anyone's private information." required />
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
          {message ? <p className="feedback-message" role="status">{message}</p> : null}
        </form>
      </section>

      <section className="feedback-history" aria-labelledby="feedback-history-title" aria-busy={loading}>
        <header>
          <div><p className="panel-label">Your feedback</p><h2 id="feedback-history-title">What you&apos;ve shared</h2></div>
          {!loading && !loadError ? <span>{tickets.length}</span> : null}
        </header>
        {loading ? <p className="feedback-history-state">Loading your feedback...</p> : null}
        {loadError ? (
          <div className="feedback-history-state" role="alert"><p>{loadError}</p><button type="button" onClick={() => void loadTickets()}>Try again</button></div>
        ) : null}
        {!loading && !loadError && tickets.length === 0 ? (
          <div className="feedback-history-state"><strong>Nothing shared yet.</strong><p>When you send feedback, you can return here to see its status.</p></div>
        ) : null}
        {!loading && !loadError && tickets.length > 0 ? (
          <div className="feedback-ticket-list">
            {tickets.map((ticket) => (
              <article key={ticket.id} className="feedback-ticket">
                <header><span>{displayLabel(ticket.category)}</span><span>{displayLabel(ticket.status ?? "open")}</span></header>
                <h3>{ticket.summary}</h3>
                <p>{ticket.details}</p>
                <dl>
                  <div><dt>Surface</dt><dd>{displayLabel(ticket.surface)}</dd></div>
                  <div><dt>Impact</dt><dd>{displayLabel(ticket.severity)}</dd></div>
                  <div><dt>Page</dt><dd>{ticket.currentPath}</dd></div>
                  <div><dt>Shared</dt><dd>{new Date(ticket.createdAt).toLocaleDateString()}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}
