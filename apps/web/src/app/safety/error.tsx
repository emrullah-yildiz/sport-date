"use client";

// Scoped route-segment error boundary for the Safety center (`/safety`).
//
// Without this, a transient failure of `getMemberSafetyCases` in the `/safety`
// server component falls all the way through to the app-wide `global-error.tsx`,
// which REPLACES the root layout and discards everything the Safety center
// renders — including the static, data-independent safety guidance and its
// "contact local emergency services" reminder, which did not fail and need no
// data. This boundary keeps the failure in-segment: the member stays on a calm,
// on-brand Safety-center page that still carries the emergency line and the full
// safety guidance, plus a "Try again" retry.
//
// Mirrors `hosting/error.tsx`: a Client Component receiving `{ error,
// unstable_retry }`. NOTHING internal (message, stack, `digest`, SQL, or column
// names) is shown to the member — only a redacted, human message.

import { useEffect } from "react";

import PrimaryNav from "@/components/PrimaryNav";
import SafetyGuidelines from "@/components/SafetyGuidelines";

export default function SafetyCenterError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // This boundary wraps the authenticated case tracker, so the member is
    // signed in. Log for our own telemetry; nothing from `error` is rendered.
    console.error(error);
  }, [error]);

  return (
    <main className="safety-center-page">
      <PrimaryNav current="safety" />

      <header className="safety-center-header">
        <p className="eyebrow">Safety center</p>
        <h1>We couldn&apos;t load your reports.</h1>
        <p>This is a problem on our side, not anything you did — your reports are safe, just briefly out of reach. Try again in a moment. The safety guidance below still works, and reporting or blocking stays available from an event, request, or authorized event room.</p>
      </header>

      <section className="safety-case-list" aria-label="Safety reports">
        <article className="safety-case-empty" role="alert">
          <h2>Your report tracker is temporarily unavailable</h2>
          <p>We hit a snag loading the reports you submitted. Nothing has changed about them — this is only about showing them here right now.</p>
          <p>If you came to prepare for a meeting rather than to track a report, the safety guidance below is fully available.</p>
          <p className="safety-case-empty-note">If anyone is in immediate danger, contact local emergency services first — this service is not an emergency responder.</p>
          <div className="safety-guidance-pointer-actions">
            <button type="button" className="btn btn--accent" onClick={() => unstable_retry()}>Try again</button>
            <a href="#guidelines" className="safety-guidance-link">Read how to meet safely</a>
          </div>
        </article>
      </section>

      <SafetyGuidelines />
    </main>
  );
}
