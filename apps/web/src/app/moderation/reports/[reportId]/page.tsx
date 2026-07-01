import Link from "next/link";
import { notFound } from "next/navigation";

import EvidenceReferenceForm from "@/components/EvidenceReferenceForm";
import ModerationAppealForm from "@/components/ModerationAppealForm";
import ModerationCaseForm from "@/components/ModerationCaseForm";
import { getModerationCase, getModeratorSession } from "@/lib/moderation";

export const metadata = { title: "Moderation case" };

export default async function ModerationCasePage({ params }: { params: Promise<{ reportId: string }> }) {
  const moderator = await getModeratorSession();
  if (!moderator) notFound();
  const { reportId } = await params;
  const moderationCase = await getModerationCase(reportId, moderator);
  if (!moderationCase) notFound();

  return (
    <main className="moderation-page">
      <nav className="profile-nav">
        <Link href="/moderation" className="logo">Moderation queue</Link>
        <Link href="/profile">Leave staff area</Link>
      </nav>
      <header className="moderation-header moderation-case-header">
        <p className="eyebrow">Audited case access</p>
        <h1>{moderationCase.category.replaceAll("_", " ")}</h1>
        <p>Case {moderationCase.id}. This view was recorded for case review. Exact event locations and unrelated profile fields remain excluded.</p>
      </header>
      <article className="moderation-case moderation-case-detail">
        <header>
          <div><p className="panel-label">Submitted narrative</p><h2>Member report</h2></div>
          <div className="moderation-badges"><span>{moderationCase.priority}</span><span>{moderationCase.status}</span></div>
        </header>
        <blockquote>{moderationCase.details}</blockquote>
        <dl>
          <div><dt>Reporter</dt><dd>{moderationCase.reporter ? `${moderationCase.reporter.firstName} · member ${moderationCase.reporter.id}` : "Deleted member"}</dd></div>
          <div><dt>Subject</dt><dd>{moderationCase.subject ? `${moderationCase.subject.firstName} · member ${moderationCase.subject.id}` : "Event-only or deleted member"}</dd></div>
          <div><dt>Event context</dt><dd>{moderationCase.event ? `${moderationCase.event.sport} · ${moderationCase.event.title} · ${moderationCase.event.area}, ${moderationCase.event.city}` : "Unavailable"}</dd></div>
          <div><dt>Received</dt><dd>{new Date(moderationCase.createdAt).toLocaleString()}</dd></div>
        </dl>
        <section className="evidence-reference-panel">
          <header><div><p className="panel-label">Evidence register</p><h2>References, not copied content</h2></div><span>{moderationCase.evidenceReferences.length} recorded</span></header>
          {moderationCase.evidenceReferences.length > 0 ? <div className="evidence-reference-list">
            {moderationCase.evidenceReferences.map((reference) => <article key={reference.id}>
              <div><strong>{reference.label}</strong><span>{reference.sourceType.replaceAll("_", " ")} · {reference.sensitivity}</span></div>
              <code>{reference.referenceKey}</code>
              <p>{reference.preservationPurpose}</p>
              <small>Review retention by {new Date(reference.retentionReviewAt).toLocaleDateString()}</small>
            </article>)}
          </div> : <p className="moderation-final">No evidence references recorded. Do not infer that evidence is absent; this register stores locators only.</p>}
          <EvidenceReferenceForm reportId={moderationCase.id} />
        </section>
        {moderationCase.appeal ? <section className="moderation-appeal-review">
          <p className="panel-label">Appeal {moderationCase.appeal.status}</p>
          <blockquote>{moderationCase.appeal.reason}</blockquote>
          {moderationCase.appeal.outcomeSummary ? <p>{moderationCase.appeal.outcomeSummary}</p> : null}
          {(moderationCase.appeal.status === "open" || moderationCase.appeal.status === "reviewing")
            ? moderationCase.appeal.canReview
              ? <ModerationAppealForm appealId={moderationCase.appeal.id} currentStatus={moderationCase.appeal.status} />
              : <p className="moderation-final">Separation enforced: the original decision-maker cannot review this appeal.</p>
            : null}
        </section> : null}
        {moderationCase.status === "actioned" || moderationCase.status === "dismissed"
          ? <p className="moderation-final">Final decision already issued. Changes require a future authorized review workflow.</p>
          : <ModerationCaseForm reportId={moderationCase.id} />}
      </article>
    </main>
  );
}
