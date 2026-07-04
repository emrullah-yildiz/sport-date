"use client";

import { useState } from "react";

import { FEEDBACK_COMMENT_MAX_LENGTH } from "@/lib/feedback-thread";

type Comment = { id: string; authorKind: "member" | "team"; authorLabel: string; body: string; createdAt: string };

// The submitter's reply box on their own feedback thread (CX-20260704). Appends
// the member's new reply to the rendered thread on success; a send failure keeps
// the draft so nothing is lost. Reduced-motion safe (no animation).
export default function FeedbackThreadReply({ ticketId }: { ticketId: string }) {
  const [added, setAdded] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(`/api/feedback/${ticketId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const result = (await response.json().catch(() => ({}))) as { comment?: Comment; error?: string };
      if (!response.ok || !result.comment) throw new Error(result.error || "Your reply could not be sent.");
      setAdded((current) => [...current, result.comment!]);
      setDraft("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your reply could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="feedback-thread-reply">
      {added.length > 0 ? (
        <ol className="feedback-thread-added" aria-label="Your new replies">
          {added.map((comment) => (
            <li key={comment.id} className="feedback-comment is-mine">
              <div className="feedback-comment-head">
                <strong>You</strong>
                <time dateTime={comment.createdAt}>just now</time>
              </div>
              <p>{comment.body}</p>
            </li>
          ))}
        </ol>
      ) : null}
      <form onSubmit={submit}>
        <label htmlFor="feedback-reply-input">Add a reply</label>
        <textarea
          id="feedback-reply-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={FEEDBACK_COMMENT_MAX_LENGTH}
          rows={3}
          placeholder="Add anything that helps — an example, a follow-up, or a thanks."
        />
        <div className="feedback-thread-reply-foot">
          <span aria-hidden="true">{draft.trim().length}/{FEEDBACK_COMMENT_MAX_LENGTH}</span>
          <button type="submit" disabled={sending || draft.trim().length === 0}>
            {sending ? "Sending…" : "Send reply"}
          </button>
        </div>
        {error ? <p className="feedback-thread-reply-error" role="alert">{error}</p> : null}
      </form>
    </div>
  );
}
