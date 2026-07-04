import Link from "next/link";

/**
 * The public, static safety guidance ("How safety works here") plus the honest
 * not-an-emergency-responder line. This is the general, member-facing safety
 * posture the landing page, footer, and Trust page advertise as the reference a
 * cautious adult can read BEFORE signing up — so it carries NO member data, no
 * personal case content, and no auth dependency. It is safe to render for
 * signed-out visitors and signed-in members alike.
 *
 * The personal report / case tracker (which contains a member's own cases) is a
 * separate, authenticated concern and deliberately lives OUTSIDE this component
 * (see `/safety`).
 *
 * Presentational and static, so it is inherently reduced-motion safe. Styling,
 * focus rings, 44px targets, and AA contrast come from the shared
 * `.safety-guidelines` / `.safety-emergency-card` tokens in globals.css.
 */
export default function SafetyGuidelines() {
  return (
    <>
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
          <summary>What this is for — and what it isn&apos;t</summary>
          <ul>
            <li>Meeting is organised around a real shared activity. This is for dating, friendship, or community through the game — it is not a hookup app.</li>
            <li>Events must not be organised for sexual purposes, and no one should use an event, profile, or chat for sexual solicitation.</li>
            <li>Dating here means meeting a person, not arranging sex — wanting a romantic connection is welcome; a sexual-encounter listing is not.</li>
            <li>See something set up for sexual intent? Report it (&ldquo;Sexual or inappropriate intent&rdquo;) and moderators can hide or remove it.</li>
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
    </>
  );
}
