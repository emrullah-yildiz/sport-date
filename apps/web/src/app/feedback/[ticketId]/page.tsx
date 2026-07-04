import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import FeedbackThreadReply from "@/components/FeedbackThreadReply";
import { getFeedbackTicketForMember, markFeedbackTicketSeen } from "@/lib/feedback";
import { MEMBER_FEEDBACK_STATUS_INFO, MEMBER_FEEDBACK_STATUSES } from "@/lib/feedback-thread";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Your feedback" };

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Something did not work", missing_feature: "Something is missing", usability: "Something was hard to use",
  accessibility: "Accessibility", performance: "Something was slow", content: "Words or information",
  suggestion: "An idea for improvement", other: "Something else",
};

function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
}

export default async function FeedbackTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { ticketId } = await params;

  // Owner-enforced: a non-owner (or logged-out) never sees another member's
  // feedback — the lib returns null and we 404 rather than leak its existence.
  const thread = await getFeedbackTicketForMember(ticketId, user.id);
  if (!thread) notFound();

  // Opening the thread marks it seen, clearing its "heard" badge.
  await markFeedbackTicketSeen(ticketId, user.id);

  const { ticket, comments } = thread;
  const statusInfo = MEMBER_FEEDBACK_STATUS_INFO[ticket.status];
  const stepIndex = MEMBER_FEEDBACK_STATUSES.indexOf(ticket.status);
  const isClosed = ticket.status === "closed_not_planned";

  return (
    <main className="feedback-page">
      <PrimaryNav firstName={user.firstName} />
      <div className="feedback-thread-shell">
        <p className="feedback-thread-back"><Link href="/feedback">← All your feedback</Link></p>

        <header className="feedback-thread-header">
          <p className="eyebrow">{CATEGORY_LABELS[ticket.category] ?? ticket.category}</p>
          <h1>{ticket.summary}</h1>
          <div className={`feedback-status feedback-status--${ticket.status}`}>
            <span className="feedback-status-label">{statusInfo.label}</span>
            <span className="feedback-status-meaning">{statusInfo.meaning}</span>
          </div>
          {!isClosed ? (
            <ol className="feedback-status-track" aria-label="Feedback progress">
              {(["received", "in_review", "planned", "in_progress", "resolved"] as const).map((step, index) => (
                <li key={step} className={index <= stepIndex ? "is-reached" : "is-upcoming"}>
                  <span aria-hidden="true" />
                  {MEMBER_FEEDBACK_STATUS_INFO[step].label}
                </li>
              ))}
            </ol>
          ) : null}
        </header>

        <section className="feedback-thread-detail" aria-label="What you shared">
          <p className="panel-label">What you shared</p>
          <p className="feedback-thread-details-body">{ticket.details}</p>
          <dl>
            <div><dt>Page</dt><dd>{ticket.currentPath}</dd></div>
            <div><dt>Shared</dt><dd>{formatWhen(ticket.createdAt)}</dd></div>
          </dl>
        </section>

        <section className="feedback-thread" aria-label="Conversation">
          <p className="panel-label">Conversation</p>
          {comments.length === 0 ? (
            <p className="feedback-thread-empty">No replies yet. When the team responds, it&apos;ll appear here — and we&apos;ll show a badge on your feedback so you know.</p>
          ) : (
            <ol className="feedback-thread-list">
              {comments.map((comment) => (
                <li key={comment.id} className={comment.authorKind === "member" ? "feedback-comment is-mine" : "feedback-comment is-team"}>
                  <div className="feedback-comment-head">
                    <strong>{comment.authorLabel}</strong>
                    <time dateTime={comment.createdAt}>{formatWhen(comment.createdAt)}</time>
                  </div>
                  <p>{comment.body}</p>
                </li>
              ))}
            </ol>
          )}
          <FeedbackThreadReply ticketId={ticket.id} />
        </section>
      </div>
    </main>
  );
}
