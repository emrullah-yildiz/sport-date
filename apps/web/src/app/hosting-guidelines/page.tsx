import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hosting Guidelines - Sport Date",
  description: "Preview-era host expectations and boundaries for Sport Date.",
};

export default function HostingGuidelinesPage() {
  return (
    <main className="legal-page">
      <section className="legal-hero">
        <p className="eyebrow">Hosting Guidelines</p>
        <h1>Hosting is real responsibility, not a trust badge</h1>
        <p>
          These guidelines explain what Sport Date currently expects from a host in the preview. They are designed to make events clearer, calmer, and safer without implying that host status is certification, employment, or emergency support.
        </p>
      </section>

      <section className="legal-grid">
        <article className="legal-card">
          <h2>What a host should make clear</h2>
          <ul className="legal-list">
            <li>Publish a real format with a clear start, end, level, language, capacity, and expected cost.</li>
            <li>Write the description so a cautious newcomer can tell whether the pace and mood fit.</li>
            <li>Keep the exact meeting point inside accepted-member access only.</li>
            <li>Cancel or update the invitation if the format, venue, or timing materially changes.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What host status does not mean</h2>
          <ul className="legal-list">
            <li>Host status is not identity verification, safety certification, or professional coaching authority.</li>
            <li>A host is not a moderator, employee, emergency responder, or guarantee that harm cannot happen.</li>
            <li>Email verification and profile completion do not prove host trustworthiness.</li>
            <li>The product does not currently issue public host badges or reliability scores.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>How to host without pressure</h2>
          <ul className="legal-list">
            <li>Welcome the advertised level without shaming slower, newer, or less confident participants.</li>
            <li>Do not pressure anyone into private transport, alcohol, off-platform contact, or romantic attention.</li>
            <li>Use accept and skip decisions to protect fit, not to create public ranking or humiliation.</li>
            <li>Respect that people may leave early, cancel, block, or report without retaliation.</li>
          </ul>
        </article>

        <article className="legal-card">
          <h2>What to do when something goes wrong</h2>
          <ul className="legal-list">
            <li>If the event is no longer viable, cancel early so people are not travelling to uncertainty.</li>
            <li>If a member behaves badly, use in-product safety controls and preserve the facts rather than improvising punishment.</li>
            <li>If there is urgent danger, contact local emergency services first.</li>
            <li>Do not move safety complaints into casual chat or promise outcomes the moderation process cannot yet guarantee.</li>
          </ul>
        </article>
      </section>

      <section className="legal-disclaimer">
        <p>
          Read these guidelines together with the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and <Link href="/safety-guidelines">Safety Guidelines</Link>.
        </p>
      </section>
    </main>
  );
}
