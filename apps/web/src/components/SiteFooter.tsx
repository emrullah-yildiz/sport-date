import Link from "next/link";

import { SUPPORT_EMAIL, Wordmark } from "@/lib/brand";

/**
 * Shared member-surface footer. This is the single compact home for the
 * "Legal & trust" grouping (Trust, Terms, Privacy) so those pages leave the
 * primary/member navigation but stay one click away — reachable, legible, and
 * never buried. Rendered as a `<footer>` landmark on member surfaces
 * (discover, hosting, profile, safety, …).
 *
 * Presentational and static, so it is inherently reduced-motion safe. Links
 * inherit the anthracite/neon theme (`.site-footer` styling in globals.css):
 * focus ring, 44px targets, and AA contrast are covered by the shared token
 * link styles.
 *
 * Safety guidance lives on the Safety Center (`/safety`), so the footer points
 * there rather than duplicating it. `/moderation` is staff-only and never
 * appears here. `/research/bucharest` is a research artifact (noindex) and is
 * intentionally not linked from member surfaces.
 */
export default function SiteFooter() {
  return (
    <footer className="site-footer" aria-labelledby="site-footer-legal-label">
      <div className="site-footer-shell">
        <div className="site-footer-brand">
          <Wordmark variant="footer" />
          <p>Meet through movement. Adults 18+ · first events in Europe.</p>
          <p className="site-footer-contact">
            Questions? <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          </p>
        </div>
        <nav className="site-footer-legal" aria-labelledby="site-footer-legal-label">
          <p className="site-footer-legal-label" id="site-footer-legal-label">Legal &amp; trust</p>
          <ul>
            <li><Link href="/trust">Trust preview</Link></li>
            <li><Link href="/terms">Terms preview</Link></li>
            <li><Link href="/privacy">Privacy Notice preview</Link></li>
            <li><Link href="/safety">Safety center</Link></li>
          </ul>
        </nav>
      </div>
      <p className="site-footer-note">
        This is an early preview. We don&apos;t claim identity verification or any safety
        guarantee — read the honest boundary in the Trust preview above.
      </p>
    </footer>
  );
}
