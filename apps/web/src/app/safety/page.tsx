import Link from "next/link";

import PrimaryNav from "@/components/PrimaryNav";
import SafetyAppealForm from "@/components/SafetyAppealForm";
import SafetyGuidelines from "@/components/SafetyGuidelines";
import SiteFooter from "@/components/SiteFooter";
import { BRAND_NAME, Wordmark } from "@/lib/brand";
import { getMemberSafetyCases } from "@/lib/safety";
import { getCurrentUser } from "@/lib/session";

export const metadata = { title: "Safety center" };

function displayLabel(value: string) {
  return value.replaceAll("_", " ");
}

// A cautious adult evaluating the product must be able to READ the safety
// guidance BEFORE handing over any details — safety is legible and never gated
// (the landing/footer/Trust pages advertise this guidance as the honest
// reference). So the general, static guidance renders for EVERYONE, while the
// personal report / case tracker (a member's own cases) stays authenticated:
// a signed-out visitor is shown a calm "sign in to see your reports" prompt and
// NEVER any member data. `getCurrentUser()` returns null when signed out.
export default async function SafetyCenterPage() {
  const user = await getCurrentUser();
  const cases = user ? await getMemberSafetyCases(user.id) : [];

  return (
    <main className="safety-center-page">
      {user ? (
        <PrimaryNav firstName={user.firstName} current="safety" />
      ) : (
        <nav className="safety-guest-nav" aria-label="Primary">
          <Link href="/landing" className="logo" aria-label={`${BRAND_NAME} home`}>
            <Wordmark decorative />
          </Link>
          <div className="safety-guest-nav-actions">
            <Link href="/login" className="nav-signin">Sign in</Link>
            <Link href="/signup" className="btn btn--accent">Create a profile</Link>
          </div>
        </nav>
      )}

      <header className="safety-center-header">
        <p className="eyebrow">Safety center</p>
        {user ? (
          <>
            <h1>Your reports, without the black box.</h1>
            <p>Track reports you submitted. Internal notes, another member&apos;s information, and protected evidence are never shown here.</p>
          </>
        ) : (
          <>
            <h1>How to meet safely, in plain language.</h1>
            <p>Read the honest safety posture before you sign up — no account required. Reporting and tracking your own cases live behind sign-in, and are never shown to anyone but you.</p>
          </>
        )}
      </header>

      {user ? (
        <>
          <aside className="safety-guidance-pointer" aria-labelledby="safety-guidance-pointer-title">
            <p className="eyebrow">Meeting someone soon?</p>
            <h2 id="safety-guidance-pointer-title">Here&apos;s how to keep it safe.</h2>
            <p>The Safety center is for both halves of safety: knowing what to expect before you meet, and resolving harm if something goes wrong. If you came here to prepare rather than report, start with the guidance.</p>
            <p className="safety-guidance-pointer-actions">
              <Link href="#guidelines" className="safety-guidance-link">Read how to meet safely</Link>
              <span>Need to report or block? Those controls live on the event, request, or authorized event room.</span>
            </p>
          </aside>

          <section className="safety-case-list" aria-label="Submitted safety reports">
            {cases.length === 0 ? (
              <article className="safety-case-empty">
                <h2>No submitted reports yet</h2>
                <p>Nothing to track here — that&apos;s a good sign. This space fills in only when you file a report, so you can follow its status and any decision.</p>
                <p>Reporting stays available from an event, request, or authorized event room. If you&apos;re here to prepare for a meeting instead, read <Link href="#guidelines">how to meet safely</Link>.</p>
                <p className="safety-case-empty-note">If anyone is in immediate danger, contact local emergency services first.</p>
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
        </>
      ) : (
        <aside className="safety-guest-report-note" aria-labelledby="safety-guest-report-title">
          <p className="eyebrow">Reporting &amp; your cases</p>
          <h2 id="safety-guest-report-title">Your reports stay private to you.</h2>
          <p>Filing a report and tracking its status needs an account, so that a case is only ever visible to the member who raised it — never to a signed-out visitor. If you already have an account, <Link href="/login">sign in</Link> to see your reports.</p>
          <p className="safety-guest-report-emergency">If anyone is in immediate danger, contact local emergency services first — this service is not an emergency responder.</p>
        </aside>
      )}

      <SafetyGuidelines />

      <SiteFooter />
    </main>
  );
}
