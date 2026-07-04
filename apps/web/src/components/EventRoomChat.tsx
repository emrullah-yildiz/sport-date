"use client";

import { EVENT_MESSAGE_MAX_LENGTH, SAFETY_REPORT_CATEGORIES, type SafetyReportCategory } from "@sport-date/domain";
import { useCallback, useEffect, useRef, useState } from "react";

import { BRAND_NAME } from "@/lib/brand";

type ChatMessage = {
  id: string;
  senderUserId: string;
  senderFirstName: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  deleted: boolean;
};

type LoadState = "loading" | "ready" | "error";

const categoryLabels: Record<SafetyReportCategory, string> = {
  harassment: "Harassment", hate: "Hate or discrimination", sexual_misconduct: "Sexual misconduct",
  violence_threat: "Violence or threat", stalking: "Stalking or unwanted following", scam: "Scam",
  impersonation: "Impersonation", suspected_underage: "Suspected underage member",
  unsafe_event: "Unsafe event or location", no_show: "No-show", other: "Something else",
};

// Poll the thread on a calm 12s cadence. This is a coordination surface, not a
// live-chat firehose; slow polling keeps it fresh without a socket or an
// engagement-maximising real-time loop.
const POLL_INTERVAL_MS = 12_000;

function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

export default function EventRoomChat({ eventId, timeZone }: { eventId: string; timeZone: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [reportFor, setReportFor] = useState<ChatMessage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  // Fetch the thread. Returns the messages on success and null on failure so the
  // caller decides how to reflect an error; state updates happen in the caller's
  // callback (not synchronously in the effect body), matching the repo pattern.
  const fetchMessages = useCallback(async (): Promise<ChatMessage[] | null> => {
    try {
      const response = await fetch(`/api/events/${eventId}/messages`, { headers: { "Accept": "application/json" } });
      if (!response.ok) return null;
      const result = await response.json();
      return Array.isArray(result.messages) ? (result.messages as ChatMessage[]) : [];
    } catch {
      return null;
    }
  }, [eventId]);

  useEffect(() => {
    let active = true;
    async function load(mode: "initial" | "poll") {
      const next = await fetchMessages();
      if (!active) return;
      if (next === null) {
        // A failed poll keeps the existing thread on screen; only the initial
        // load surfaces the error+retry state.
        if (mode === "initial") setLoadState("error");
        return;
      }
      setMessages(next);
      setLoadState("ready");
    }
    void load("initial");
    const timer = setInterval(() => void load("poll"), POLL_INTERVAL_MS);
    return () => { active = false; clearInterval(timer); };
  }, [fetchMessages]);

  async function retry() {
    setLoadState("loading");
    const next = await fetchMessages();
    if (next === null) { setLoadState("error"); return; }
    setMessages(next);
    setLoadState("ready");
  }

  // Keep the newest message in view as the thread grows (newest-at-bottom). Only
  // scroll when the count actually increased, so a poll that returns no new
  // messages does not yank the viewport.
  useEffect(() => {
    if (messages.length > lastCountRef.current && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
    lastCountRef.current = messages.length;
  }, [messages]);

  // Soft-delete one of the viewer's OWN messages. On success we mark it deleted
  // locally (tombstone) so the thread doesn't reshuffle; a failure is silent-safe
  // (the next poll reflects the true state).
  async function deleteMine(message: ChatMessage) {
    if (deletingId) return;
    setDeletingId(message.id);
    try {
      const response = await fetch(`/api/events/${eventId}/messages/${message.id}`, { method: "DELETE" });
      if (response.ok) {
        setMessages((current) =>
          current.map((item) => (item.id === message.id ? { ...item, deleted: true, body: "" } : item)),
        );
      }
    } catch {
      // Leave the message as-is; the poll will reconcile.
    } finally {
      setDeletingId(null);
    }
  }

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setSendError("");
    try {
      const response = await fetch(`/api/events/${eventId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Message could not be sent.");
      setMessages((current) => [...current, result.message as ChatMessage]);
      setDraft("");
    } catch (error) {
      setSendError(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="room-chat" aria-labelledby="room-chat-title">
      <p className="panel-label">Coordinate together</p>
      <h2 id="room-chat-title">Room chat</h2>
      <p className="room-chat-lede">
        Sort the practical details here — timing, what to bring, running late. Keep it in {BRAND_NAME} and share no private
        contact details or exact home addresses.
      </p>

      <div
        ref={logRef}
        className="room-chat-log"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Event room chat messages, oldest first"
        aria-busy={loadState === "loading"}
      >
        {loadState === "loading" ? (
          <p className="room-chat-status" role="status">Loading the conversation…</p>
        ) : loadState === "error" ? (
          <div className="room-chat-retry" role="alert">
            <p>The chat could not be loaded.</p>
            <button type="button" onClick={() => void retry()}>
              Try again
            </button>
          </div>
        ) : messages.length === 0 ? (
          <p className="room-chat-empty">No messages yet — say hi 👋</p>
        ) : (
          <ol className="room-chat-messages">
            {messages.map((message) => (
              <li key={message.id} className={message.isMine ? "room-chat-message is-mine" : "room-chat-message"}>
                <div className="room-chat-message-head">
                  <strong>{message.isMine ? "You" : message.senderFirstName}</strong>
                  <time dateTime={message.createdAt}>{formatTime(message.createdAt, timeZone)}</time>
                </div>
                {message.deleted ? (
                  <p className="room-chat-message-deleted">Message deleted</p>
                ) : (
                  <p>{message.body}</p>
                )}
                {message.deleted ? null : message.isMine ? (
                  <button
                    type="button"
                    className="room-chat-message-delete"
                    onClick={() => void deleteMine(message)}
                    disabled={deletingId === message.id}
                    aria-label="Delete your message"
                  >
                    {deletingId === message.id ? "Deleting…" : "Delete"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="room-chat-report-open"
                    onClick={() => setReportFor(message)}
                    aria-label={`Report the message from ${message.senderFirstName}`}
                  >
                    Report
                  </button>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      <form className="room-chat-composer" onSubmit={send}>
        <label htmlFor="room-chat-input">Your message</label>
        <textarea
          id="room-chat-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={EVENT_MESSAGE_MAX_LENGTH}
          rows={2}
          placeholder="Running 5 minutes late — start warming up without me."
        />
        <div className="room-chat-composer-foot">
          <span aria-hidden="true">{draft.trim().length}/{EVENT_MESSAGE_MAX_LENGTH}</span>
          <button type="submit" disabled={sending || draft.trim().length === 0}>
            {sending ? "Sending…" : "Send message"}
          </button>
        </div>
        {sendError ? <p className="room-chat-error" role="alert">{sendError}</p> : null}
      </form>

      {reportFor ? (
        <ReportMessageDialog
          eventId={eventId}
          message={reportFor}
          onClose={() => setReportFor(null)}
        />
      ) : null}
    </section>
  );
}

function ReportMessageDialog({ eventId, message, onClose }: { eventId: string; message: ChatMessage; onClose: () => void }) {
  const [category, setCategory] = useState<SafetyReportCategory>("harassment");
  const [details, setDetails] = useState("");
  const [blockUser, setBlockUser] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setResult("");
    // Route to the existing moderation/safety queue. We quote the reported
    // message inside the details so the safety team has the evidence, and always
    // keep the reporter's own account minimal (no new store).
    const detailBody = `Reported message from ${message.senderFirstName}: "${message.body}"\n\n${details}`.trim();
    try {
      const response = await fetch("/api/safety/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, reportedUserId: message.senderUserId, category, details: detailBody, blockUser }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Report failed.");
      setResult(payload.message || "Report recorded.");
      if (blockUser) setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Report failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="room-chat-report" role="group" aria-label={`Report the message from ${message.senderFirstName}`}>
      <div className="room-chat-report-head">
        <strong>Report this message</strong>
        <button type="button" className="room-chat-report-close" onClick={onClose} aria-label="Close report">Close</button>
      </div>
      <blockquote>“{message.body}”</blockquote>
      <form onSubmit={submit}>
        <label>What happened?
          <select value={category} onChange={(event) => setCategory(event.target.value as SafetyReportCategory)}>
            {SAFETY_REPORT_CATEGORIES.map((item) => <option value={item} key={item}>{categoryLabels[item]}</option>)}
          </select>
        </label>
        <label>Describe what happened
          <textarea minLength={20} maxLength={2000} required rows={3} value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Add anything the safety team should know. The message above is included automatically." />
        </label>
        <label className="report-block-choice">
          <input type="checkbox" checked={blockUser} onChange={(event) => setBlockUser(event.target.checked)} />
          Also block {message.senderFirstName} immediately
        </label>
        <button type="submit" disabled={submitting}>{submitting ? "Recording…" : "Submit safety report"}</button>
      </form>
      {result ? <p className="room-chat-report-result" role="status">{result}</p> : null}
    </div>
  );
}
