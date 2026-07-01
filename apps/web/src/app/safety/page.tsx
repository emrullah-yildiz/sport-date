import Link from "next/link";
import { redirect } from "next/navigation";

import PrimaryNav from "@/components/PrimaryNav";
import SafetyAppealForm from "@/components/SafetyAppealForm";
import SiteFooter from "@/components/SiteFooter";
import { getMemberSafetyCases } from "@/lib/safety";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Safety center" };

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

export default async function SafetyCenterPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const cases = await getMemberSafetyCases(user.id);

  return (
    <main className="safety-center-page">
      <PrimaryNav firstName={user.firstName} current="safety" />
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

      <section className="safety-guidelines" id="guidelines" aria-labelledby="safety-guidelines-title">
        <div className="safety-guidelines-head">
          <p className="eyebrow">How safety works here</p>
          <h2 id="safety-guidelines-title">Meet through sport, not pressure.</h2>
          <p>The member-facing expectations for the preview. They explain the product rules we stand behind now, without overstating protection. Open a section to read more.</p>
        </div>

        <details className="safety-guideline">
          <summary>Before the event</summary>
          <ul>
            <li>Use your real comfort boundaries, not the app&apos;s momentum, to decide whether to join.</li>
            <li>Exact meeting points stay private until acceptance. Do not ask another member to bypass that boundary.</li>
            <li>Hosts may accept or skip requests. A third skip quietly closes the request for that event.</li>
          </ul>
        </details>

        <details className="safety-guideline">
          <summary>During the event</summary>
          <ul>
            <li>You can leave early, decline future contact, or stop participating without losing progress points or public status.</li>
            <li>No one should pressure another member into transport sharing, alcohol, location disclosure, or off-platform contact.</li>
            <li>The event room exists for accepted participants and hosts only. It is not a substitute for emergency services.</li>
          </ul>
        </details>

        <details className="safety-guideline">
          <summary>If something feels wrong</summary>
          <ul>
            <li>Block immediately if you need distance. Blocking removes shared requests, places, room access, and exact-location access.</li>
            <li>Use the report controls to create a safety case. Reflection is not the same thing as reporting.</li>
            <li>If there is urgent danger, contact local emergency services first.</li>
          </ul>
        </details>

        <details className="safety-guideline">
          <summary>What the product does not promise</summary>
          <ul>
            <li>No public trust badge, identity guarantee, or background-check claim exists in this preview.</li>
            <li>The Movement Arc is private reflection only, not proof of reliability or safety.</li>
            <li>Moderation and reporting help reduce harm, but they do not eliminate all risk.</li>
          </ul>
        </details>

        <p className="safety-guidelines-note">
          Read these alongside the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and <Link href="/privacy">Privacy Notice preview</Link>.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
