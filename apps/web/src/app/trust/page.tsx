import Link from "next/link";
import type { Metadata } from "next";

import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Trust Preview",
  description: `Public-facing trust and safety boundaries for the ${BRAND_NAME} preview.`,
};

export default function TrustPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="eyebrow">Trust preview</p>
        <h1>Trust has to be visible in product behavior, not just in brand language</h1>
        <p>
          {BRAND_NAME} is designed for real-world meetings, so this page explains the current trust boundary in plain language. It describes what the preview does now, what remains intentionally unavailable, and what still requires launch-country legal and operational review.
        </p>
      </section>

      <section className="legal-grid">
        <article className="legal-card">
          <h2>What the product protects by default</h2>
          <ul className="legal-list">
            <li>Exact meeting details stay hidden until a host accepts a request.</li>
            <li>Adults only. The preview is built for members who are 18 or older.</li>
            <li>Blocking immediately removes shared requests, places, room access, and exact-location access.</li>
            <li>Reporting exists as a dedicated safety path, separate from feedback or private reflection.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What we do not claim</h2>
          <ul className="legal-list">
            <li>Email verification means inbox control only. It is not identity, age, or background verification.</li>
            <li>No public trust score, verified-community badge, or host guarantee exists in this preview.</li>
            <li>The Movement Arc is private reflection, not public proof that another member is safe or reliable.</li>
            <li>Moderation and reporting reduce harm; they do not remove all real-world risk.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>Design choices that stay intentionally constrained</h2>
          <ul className="legal-list">
            <li>No open member-to-member chat launches before blocking, reporting, moderation evidence, and response operations are ready.</li>
            <li>No public popularity rankings, streaks, or rewards exist for rejection, screen time, or pressure.</li>
            <li>Hosts can accept or skip requests, and a third skip quietly closes the request for that event.</li>
            <li>Discovery shows approximate area and fit, not unnecessary precise location exposure.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What still requires real-world readiness before launch</h2>
          <ul className="legal-list">
            <li>Final launch-country legal review, including Europe-specific privacy, consumer, and platform obligations.</li>
            <li>Operational moderation staffing, escalation coverage, and response-time claims.</li>
            <li>Any future identity, age, payment, or host-verification programs that would need separate proof and controls.</li>
            <li>Public safety or trust marketing language beyond what the product can actually demonstrate.</li>
          </ul>
        </article>
      </section>

      <section className="legal-disclaimer trust-disclaimer">
        <p>
          For the current member-facing boundary, also read the <Link href="/terms">Terms preview</Link>, <Link href="/privacy">Privacy Notice preview</Link>, and <Link href="/safety-guidelines">Safety Guidelines</Link>.
        </p>
        <p>
          If you are evaluating the product for launch, partnerships, hosts, or member communications, this page is the shortest honest summary of the current trust posture.
        </p>
      </section>
    </main>
  );
}
