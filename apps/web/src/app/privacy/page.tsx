import Link from "next/link";
import type { Metadata } from "next";

import { BRAND_NAME, SUPPORT_EMAIL } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy Notice Preview",
  description: `Preview-era privacy notice and data-rights summary for ${BRAND_NAME}.`,
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="eyebrow">Privacy Notice preview</p>
        <h1>What we collect, why, and what remains under review</h1>
        <p>
          This page summarizes the current product behavior in plain language. It is not the final launch-country privacy notice and still requires qualified legal review.
        </p>
      </section>

      <section className="legal-grid">
        <article className="legal-card">
          <h2>Data used in the preview</h2>
          <ul className="legal-list">
            <li>Profile basics such as email, age confirmation inputs, name, approximate location, languages, sports, and connection preference.</li>
            <li>Event, request, participation, room-access, and private reflection records needed to coordinate real sports meetups.</li>
            <li>Safety reports, blocks, appeals, and moderation audit records when members use safety features.</li>
            <li>Session and device metadata needed to authenticate web and mobile access.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>Current member controls</h2>
          <ul className="legal-list">
            <li>Download a machine-readable account export from the profile privacy controls.</li>
            <li>Edit core profile information directly in-product.</li>
            <li>Choose separately whether optional product and launch updates may be sent later; service and safety mail remain distinct from that preference.</li>
            <li>Request deletion, which immediately locks the profile and revokes sessions while final processing follows the applicable legal and retention review.</li>
            <li>Use blocking and reporting without giving up access to your own export rights.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>Consent and lawful-basis boundary</h2>
          <ul className="legal-list">
            <li>Accepting terms is required to use the product, but it is not blanket consent for privacy processing or marketing.</li>
            <li>Optional marketing consent is not implemented yet and must remain separate, specific, and withdrawable.</li>
            <li>Launch-country lawful bases, recipients, transfers, and retention criteria are still under review before public release.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What is still not final</h2>
          <ul className="legal-list">
            <li>Final retention periods and deletion exceptions.</li>
            <li>Formal complaint route, supervisory authority language, and country-specific contact details.</li>
            <li>Any outbound marketing, analytics, or transactional provider disclosures beyond the current preview boundary.</li>
          </ul>
        </article>
      </section>

      <section className="legal-disclaimer">
        <p>
          Deeper operational preparation exists internally, but this page is the current member-facing summary of what the preview actually does today.
        </p>
        <p>
          For current product behavior, also read the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and the <Link href="/safety#guidelines">safety guidance</Link>.
        </p>
        <p>
          Privacy questions or a data-rights request? Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </main>
  );
}
