import Link from "next/link";
import { notFound } from "next/navigation";

import { Wordmark } from "@/lib/brand";
import { getModerationQueue, getModeratorSession } from "@/lib/moderation";

export const metadata = { title: "Moderation queue" };

export default async function ModerationQueuePage() {
  const moderator = await getModeratorSession();
  if (!moderator) notFound();
  const cases = await getModerationQueue(moderator);

  return (
    <main className="moderation-page">
      <nav className="profile-nav">
        <Link href="/landing" className="logo" aria-label="KeepItUp home"><Wordmark decorative /></Link>
        <Link href="/profile">Leave staff area</Link>
      </nav>
      <header className="moderation-header">
        <p className="eyebrow">Restricted staff area</p>
        <h1>Triage first. Open sensitive context only with purpose.</h1>
        <p>This metadata-only queue is access logged. Opening a case creates a separate immutable access event before its narrative, identities, or evidence references are returned.</p>
      </header>
      <section className="moderation-list moderation-queue" aria-label="Moderation cases">
        {cases.length === 0 ? <article className="safety-case-empty"><h2>No cases</h2><p>The moderation queue is empty.</p></article> : cases.map((moderationCase) => (
          <article className="moderation-case" key={moderationCase.id}>
            <header>
              <div><p className="panel-label">Case {moderationCase.id.slice(0, 8)}</p><h2>{moderationCase.category.replaceAll("_", " ")}</h2></div>
              <div className="moderation-badges"><span>{moderationCase.priority}</span><span>{moderationCase.status}</span>{moderationCase.appealStatus ? <span>appeal {moderationCase.appealStatus}</span> : null}</div>
            </header>
            <footer>
              <span>Received {new Date(moderationCase.createdAt).toLocaleString()}</span>
              <Link href={`/moderation/reports/${moderationCase.id}`}>Open audited case</Link>
            </footer>
          </article>
        ))}
      </section>
    </main>
  );
}
