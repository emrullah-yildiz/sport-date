import Link from "next/link";
import type { Metadata } from "next";

import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Safety Guidelines",
  description: `Preview-era member safety guidelines for ${BRAND_NAME}.`,
};

export default function SafetyGuidelinesPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="eyebrow">Safety Guidelines</p>
        <h1>Meet through sport, not pressure</h1>
        <p>
          These are the current member-facing expectations for the preview. They explain the product rules we are willing to stand behind now, without overstating protection.
        </p>
      </section>

      <section className="legal-grid">
        <article className="legal-card">
          <h2>Before the event</h2>
          <ul className="legal-list">
            <li>Use your real comfort boundaries, not the app&apos;s momentum, to decide whether to join.</li>
            <li>Exact meeting points stay private until acceptance. Do not ask another member to bypass that boundary.</li>
            <li>Hosts may accept or skip requests. A third skip quietly closes the request for that event.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>During the event</h2>
          <ul className="legal-list">
            <li>You can leave early, decline future contact, or stop participating without losing progress points or public status.</li>
            <li>No one should pressure another member into transport sharing, alcohol, location disclosure, or off-platform contact.</li>
            <li>The event room exists for accepted participants and hosts only. It is not a substitute for emergency services.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>If something feels wrong</h2>
          <ul className="legal-list">
            <li>Block immediately if you need distance. Blocking removes shared requests, places, room access, and exact-location access.</li>
            <li>Use the report controls to create a safety case. Reflection is not the same thing as reporting.</li>
            <li>If there is urgent danger, contact local emergency services first.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What the product does not promise</h2>
          <ul className="legal-list">
            <li>No public trust badge, identity guarantee, or background-check claim exists in this preview.</li>
            <li>The Movement Arc is private reflection only, not proof of reliability or safety.</li>
            <li>Moderation and reporting help reduce harm, but they do not eliminate all risk.</li>
          </ul>
        </article>
      </section>

      <section className="legal-disclaimer">
        <p>
          Use these guidelines together with the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and <Link href="/privacy">Privacy Notice preview</Link>.
        </p>
      </section>
    </main>
  );
}
