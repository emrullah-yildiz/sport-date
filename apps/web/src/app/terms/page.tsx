import Link from "next/link";
import type { Metadata } from "next";

import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms Preview",
  description: `Preview-era product terms and member expectations for ${BRAND_NAME}.`,
};

export default function TermsPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="eyebrow">Terms preview</p>
        <h1>Use expectations before launch</h1>
        <p>
          This is not the final contract. It is the current truthful product boundary for the open beta until launch-country legal review is complete.
        </p>
      </section>

      <section className="legal-grid">
        <article className="legal-card">
          <h2>Who this preview is for</h2>
          <ul className="legal-list">
            <li>Adults only. Members must be 18 or older.</li>
            <li>The current experience is an open beta — no invite or payment is required, and any eligible adult can create a profile, worldwide. It is still an early product, not a finished service.</li>
            <li>Profiles, events, and exact meeting details remain intentionally limited while launch controls are still being completed.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What members can and cannot do</h2>
          <ul className="legal-list">
            <li>Use the service to create a profile, host or join sports events, and reflect privately after real events.</li>
            <li>Do not impersonate, harass, threaten, pressure, stalk, or bypass another member&apos;s block.</li>
            <li>Do not publish or redistribute exact meeting points outside accepted event access.</li>
            <li>Do not use the product for minors, commercial spam, scraping, or unsafe meetups outside the product rules.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>Access and account status</h2>
          <ul className="legal-list">
            <li>Accounts can be limited, locked, or removed for safety, moderation, legal, or integrity reasons.</li>
            <li>Email verification confirms inbox access only. It is not identity, age, or safety verification.</li>
            <li>Blocking and reporting are product controls, not guarantees that no harmful behavior will occur.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>Open beta boundaries</h2>
          <ul className="legal-list">
            <li>No promise of uninterrupted availability, launch timing, or market coverage is made in this preview.</li>
            <li>Gamification remains private and bounded. There are no public scores, streaks, or rewards for rejection or screen time.</li>
            <li>Final enforceable terms, governing law, complaint routes, and country-specific notices still require legal review.</li>
          </ul>
        </article>
      </section>

      <section className="legal-disclaimer">
        <p>
          Read the current <Link href="/trust">Trust preview</Link>, <Link href="/privacy">Privacy Notice preview</Link>, and the <Link href="/safety#guidelines">safety guidance</Link> alongside this page.
        </p>
        <p>
          Questions about these terms? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
