import Link from "next/link";
import { redirect } from "next/navigation";

import AccountMenu from "@/components/AccountMenu";
import SafetyAppealForm from "@/components/SafetyAppealForm";
import { getMemberSafetyCases } from "@/lib/safety";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Safety center - Sport Date" };

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function SafetyCenterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const cases = await getMemberSafetyCases(user.id);

  return (
    <main className="safety-center-page">
      <nav className="profile-nav">
        <Link href="/discover" className="logo">Sport Date</Link>
        <div className="nav-actions">
          <Link href="/profile">Back to profile</Link>
          <AccountMenu firstName={user.firstName} />
        </div>
      </nav>
      <header className="safety-center-header">
        <p className="eyebrow">Safety center</p>
        <h1>Your reports, without the black box.</h1>
        <p>Track reports you submitted. Internal notes, another member&apos;s information, and protected evidence are never shown here.</p>
      </header>
      <section className="safety-case-list" aria-label="Submitted safety reports">
        {cases.length === 0 ? (
          <article className="safety-case-empty">
            <h2>No submitted reports</h2>
            <p>Reporting remains available from an event, request, or authorized event room.</p>
          </article>
        ) : cases.map((safetyCase) => (
            <article className="safety-case" key={safetyCase.id}>
              <header>
                <div>
                  <p className="panel-label">Case {safetyCase.id.slice(0, 8)}</p>
                  <h2>{displayLabel(safetyCase.category)}</h2>
                </div>
                <span className={`safety-case-status ${safetyCase.status}`}>{displayLabel(safetyCase.status)}</span>
              </header>
              <div className="safety-case-meta">
                <span>Submitted {new Date(safetyCase.createdAt).toLocaleDateString()}</span>
                <span>Priority: {safetyCase.priority}</span>
                {safetyCase.event ? <span>{safetyCase.event.sport}: {safetyCase.event.title}</span> : null}
              </div>
              {safetyCase.decision ? (
                <section className="safety-decision">
                  <p className="panel-label">Decision notice</p>
                  <h3>{displayLabel(safetyCase.decision.code)}</h3>
                  <p><strong>Basis:</strong> {safetyCase.decision.basis}</p>
                  <p>{safetyCase.decision.summary}</p>
                  <small>Decided {new Date(safetyCase.decision.decidedAt).toLocaleDateString()} · Appeal by {new Date(safetyCase.decision.appealDeadline).toLocaleDateString()}</small>
                </section>
              ) : <p className="safety-awaiting">No decision has been issued yet. Case routing is not itself a finding.</p>}
              {safetyCase.appeal ? (
                <section className="safety-appeal-state">
                  <strong>Appeal {displayLabel(safetyCase.appeal.status)}</strong>
                  <span>Submitted {new Date(safetyCase.appeal.createdAt).toLocaleDateString()}</span>
                  {safetyCase.appeal.outcomeSummary ? <p>{safetyCase.appeal.outcomeSummary}</p> : null}
                </section>
              ) : safetyCase.canAppeal ? <SafetyAppealForm reportId={safetyCase.id} /> : safetyCase.decision ? <p className="safety-awaiting">The appeal window is closed.</p> : null}
            </article>
        ))}
      </section>
      <aside className="safety-emergency-card">
        <strong>This service is not an emergency responder.</strong>
        <span>If anyone is in immediate danger, contact local emergency services.</span>
      </aside>
    </main>
  );
}
