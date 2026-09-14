import Link from "next/link";
import PrimaryNav from "@/components/PrimaryNav";
import SiteFooter from "@/components/SiteFooter";
import { BRAND_NAME } from "@/lib/brand";
export const metadata = { title: "Hosting guide" };
export default function HostingGuidelinesPage() {
  return <main className="hosting-page"><PrimaryNav current="host" />
    <div className="hosting-standards"><Link href="/hosting">Back to your events</Link></div>
      <section className="hosting-standards" id="standards" aria-labelledby="hosting-standards-title">
        <div className="hosting-standards-head">
          <p className="eyebrow">Hosting standards</p>
          <h2 id="hosting-standards-title">What {BRAND_NAME} expects from a host.</h2>
          <p>Hosting is real responsibility, not a trust badge. These standards keep events clear, calm, and safe — without implying host status is certification, employment, or emergency support. Open a section to read more.</p>
        </div>

        <details className="hosting-standard">
          <summary>What a host should make clear</summary>
          <ul>
            <li>Publish a real format with a clear start, end, level, language, capacity, and expected cost.</li>
            <li>Write the description so a cautious newcomer can tell whether the pace and mood fit.</li>
            <li>Keep the exact meeting point inside accepted-member access only.</li>
            <li>Cancel or update the invitation if the format, venue, or timing materially changes.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>Events are for real activity — not sexual encounters</summary>
          <ul>
            <li>Every event is built around a genuine shared activity. {BRAND_NAME} is for dating, friendship, or community through the game — it is not a hookup app.</li>
            <li>Do not organise events for sexual purposes, and do not use an event, profile, or the room chat for sexual solicitation.</li>
            <li>Dating here means meeting a person you might click with — not arranging sex. Wanting a romantic connection is welcome; a sexual-encounter listing is not.</li>
            <li>Events or profiles set up for sexual intent can be reported (&ldquo;Sexual or inappropriate intent&rdquo;) and moderators can hide or remove them.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>What host status does not mean</summary>
          <ul>
            <li>Host status is not identity verification, safety certification, or professional coaching authority.</li>
            <li>A host is not a moderator, employee, emergency responder, or guarantee that harm cannot happen.</li>
            <li>Email verification and profile completion do not prove host trustworthiness.</li>
            <li>The product does not currently issue public host badges or reliability scores.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>How to host without pressure</summary>
          <ul>
            <li>Welcome the advertised level without shaming slower, newer, or less confident participants.</li>
            <li>Do not pressure anyone into private transport, alcohol, off-platform contact, or romantic attention.</li>
            <li>Use accept and skip decisions to protect fit, not to create public ranking or humiliation.</li>
            <li>Respect that people may leave early, cancel, block, or report without retaliation.</li>
          </ul>
        </details>

        <details className="hosting-standard">
          <summary>What to do when something goes wrong</summary>
          <ul>
            <li>If the event is no longer viable, cancel early so people are not travelling to uncertainty.</li>
            <li>If a member behaves badly, use in-product safety controls and preserve the facts rather than improvising punishment.</li>
            <li>If there is urgent danger, contact local emergency services first.</li>
            <li>Do not move safety complaints into casual chat or promise outcomes the moderation process cannot yet guarantee.</li>
          </ul>
        </details>

        <p className="hosting-standards-note">
          Read these alongside the <Link href="/trust">Trust preview</Link>, <Link href="/terms">Terms preview</Link>, and the <Link href="/safety#guidelines">safety guidance</Link>.
        </p>
      </section>
<SiteFooter /></main>;
}
