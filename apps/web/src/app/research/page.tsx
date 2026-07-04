import type { Metadata } from "next";
import Link from "next/link";

import ResearchSurvey from "@/components/ResearchSurvey";
import { BRAND_NAME, SUPPORT_EMAIL, Wordmark } from "@/lib/brand";
import { RESEARCH_SURVEY_INTRO } from "@/lib/research-survey";

// Public, anonymous, self-hosted market-research survey
// (CX-20260704-research-self-hosted-market-survey). Works logged out, mobile
// first, no cookies required. Visibly a research study, not a sign-up: the
// kit's intro notice renders verbatim before the questions, and the on-page
// privacy notice states what is collected, why, retention, and the deletion
// contact. No traction claims, no participant counts.

export const metadata: Metadata = {
  title: "Research survey — how adults meet through activity",
  description:
    "A short, anonymous research survey about how adults currently find people to be active with. Not a sign-up — skip any question.",
};

export default function ResearchSurveyPage() {
  return (
    <main className="research-page">
      <header className="navbar">
        <div className="nav-container">
          <Link className="logo" href="/" aria-label={`${BRAND_NAME} home`}>
            <Wordmark decorative />
          </Link>
          <span className="research-flag">Research study</span>
        </div>
      </header>

      <div className="landing-shell research-shell">
        <section className="research-intro">
          <p className="eyebrow">About 2 minutes · Anonymous</p>
          <h1>How adults meet through activity today</h1>
          {/* The kit's intro notice, verbatim — shown before any question. */}
          <blockquote className="research-notice">{RESEARCH_SURVEY_INTRO}</blockquote>
        </section>

        <ResearchSurvey />

        <section className="research-privacy" aria-labelledby="research-privacy-heading">
          <h2 id="research-privacy-heading">Privacy, plainly</h2>
          <ul>
            <li>
              <strong>What we collect:</strong> only the answers you choose to give. No account,
              no cookies required, and no IP address or device fingerprint is stored with your
              answers.
            </li>
            <li>
              <strong>Why:</strong> product research by {BRAND_NAME} into how adults find people
              to be active with. Responses are reviewed for product research only — never
              published individually, and never quoted as demand or traction.
            </li>
            <li>
              <strong>Contact details:</strong> optional, asked separately at the end with its own
              consent checkbox, stored apart from your answers so the two can&rsquo;t be linked, used
              only to schedule the research conversation, and deleted once the study is scheduled
              or complete.
            </li>
            <li>
              <strong>Questions or deletion:</strong> email{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> any time. See also our{" "}
              <Link href="/privacy">Privacy Notice</Link>.
            </li>
          </ul>
        </section>
      </div>
    </main>
  );
}
