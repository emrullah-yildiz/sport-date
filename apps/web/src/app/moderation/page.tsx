import Link from "next/link";
import { notFound } from "next/navigation";

import ModerationCaseForm from "@/components/ModerationCaseForm";
import { getModerationQueue, getModeratorSession } from "@/lib/moderation";

export const metadata = { title: "Moderation queue - Sport Date" };

export default async function ModerationQueuePage() {
  const moderator = await getModeratorSession();
  if (!moderator) notFound();
  const cases = await getModerationQueue(moderator);

  return (
    <main className="moderation-page">
      <nav className="profile-nav">
        <Link href="/landing" className="logo">Sport Date</Link>
        <Link href="/profile">Leave staff area</Link>
      </nav>
      <header className="moderation-header">
        <p className="eyebrow">Restricted staff area</p>
        <h1>Safety cases need judgment, not velocity theatre.</h1>
        <p>Showing up to 100 cases. Exact event locations, internal evidence, and unrelated profile fields are excluded from this view.</p>
      </header>
      <section className="moderation-list" aria-label="Moderation cases">
        {cases.length === 0 ? <article className="safety-case-empty"><h2>No cases</h2><p>The moderation queue is empty.</p></article> : cases.map((moderationCase) => (
          <article className="moderation-case" key={moderationCase.id}>
            <header>
              <div><p className="panel-label">Case {moderationCase.id}</p><h2>{moderationCase.category.replaceAll("_", " ")}</h2></div>
              <div className="moderation-badges"><span>{moderationCase.priority}</span><span>{moderationCase.status}</span></div>
            </header>
            <blockquote>{moderationCase.details}</blockquote>
            <dl>
              <div><dt>Reporter</dt><dd>{moderationCase.reporter ? `${moderationCase.reporter.firstName} · member ${moderationCase.reporter.id}` : "Deleted member"}</dd></div>
              <div><dt>Subject</dt><dd>{moderationCase.subject ? `${moderationCase.subject.firstName} · member ${moderationCase.subject.id}` : "Event-only or deleted member"}</dd></div>
              <div><dt>Event context</dt><dd>{moderationCase.event ? `${moderationCase.event.sport} · ${moderationCase.event.title} · ${moderationCase.event.area}, ${moderationCase.event.city}` : "Unavailable"}</dd></div>
              <div><dt>Received</dt><dd>{new Date(moderationCase.createdAt).toLocaleString()}</dd></div>
            </dl>
            {moderationCase.status === "actioned" || moderationCase.status === "dismissed"
              ? <p className="moderation-final">Final decision already issued. Changes require a future authorized review workflow.</p>
              : <ModerationCaseForm reportId={moderationCase.id} />}
          </article>
        ))}
      </section>
    </main>
  );
}
