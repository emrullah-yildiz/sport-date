import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_ACCENT, BRAND_NAME, RallyGlyph } from "@/lib/brand";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Bucharest research preview",
  description: `A local-only preview of the ${BRAND_NAME} Bucharest research proposition.`,
  robots: { index: false, follow: false },
};

const formats = [
  {
    marker: "01",
    sport: "Run / walk",
    title: "A Tuesday with room to talk",
    detail: "45 minutes · 6-10 people · beginner-friendly",
    area: "Aviatorilor / Herastrau area",
    price: "Free format",
    tone: "lime",
  },
  {
    marker: "02",
    sport: "Indoor padel",
    title: "Four places. One shared game.",
    detail: "60-90 minutes · 4 people · beginner-friendly",
    area: "Aurel Vlaicu / Floreasca area",
    price: "Real venue price shown first",
    tone: "coral",
  },
] as const;

const principles = [
  ["Small on purpose", "Enough people for ease, few enough to notice how someone shows up."],
  ["Clear before commitment", "See the level, intention, broad area, time, and price before requesting a place."],
  ["Private until accepted", "The precise meeting point stays protected until event access is authorized."],
] as const;

export default function BucharestResearchPreview() {
  return (
    <main className={styles.page}>
      <nav className={styles.nav} aria-label="Research preview navigation">
        <Link href="/landing" className={styles.brand} aria-label={`${BRAND_NAME} home`}>
          <span aria-hidden="true"><RallyGlyph size={22} color={BRAND_ACCENT} /></span>
          {BRAND_NAME}
        </Link>
        <span className={styles.previewFlag}>Local research preview</span>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Bucharest · a question, not a launch</p>
          <h1>Could meeting someone new start <em>in motion?</em></h1>
          <p className={styles.lede}>
            We are exploring small sports sessions where the activity carries the first conversation. No profile theatre. No promise of a match. Just a clearer reason to meet.
          </p>
          <a className={styles.primaryAction} href="#research-preview">
            See the research invitation <span aria-hidden="true">↓</span>
          </a>
          <p className={styles.honestyLine}>No live service · No active event registration · No responses collected here</p>
        </div>

        <div className={styles.heroVisual} aria-label="Two sample event formats linked along Bucharest's M2 corridor">
          <div className={styles.route} aria-hidden="true"><span /><span /><span /></div>
          <p className={styles.routeLabel}>M2 north corridor hypothesis</p>
          <article className={`${styles.miniEvent} ${styles.runCard}`}>
            <span>RUN / WALK</span>
            <strong>Tue · 19:00</strong>
            <small>Aviatorilor area · 8 places</small>
          </article>
          <article className={`${styles.miniEvent} ${styles.padelCard}`}>
            <span>PADEL</span>
            <strong>Sat · 11:00</strong>
            <small>Aurel Vlaicu area · 4 places</small>
          </article>
          <p className={styles.visualNote}>The exact meeting point would remain private until acceptance.</p>
        </div>
      </section>

      <section className={styles.formats} aria-labelledby="formats-title">
        <header>
          <p className={styles.eyebrow}>Two concrete formats</p>
          <h2 id="formats-title">Not “would you use this?”<br />Which one fits your real week?</h2>
        </header>
        <div className={styles.formatGrid}>
          {formats.map((format) => (
            <article className={`${styles.formatCard} ${styles[format.tone]}`} key={format.sport}>
              <div className={styles.formatTopline}><span>{format.marker}</span><span>{format.sport}</span></div>
              <h3>{format.title}</h3>
              <p>{format.detail}</p>
              <dl>
                <div><dt>Area</dt><dd>{format.area}</dd></div>
                <div><dt>Cost</dt><dd>{format.price}</dd></div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.belief}>
        <p className={styles.beliefLead}>A profile can list your favorite sport.</p>
        <p className={styles.beliefTurn}>Movement shows how you encourage, adapt, laugh, and make room for someone else.</p>
      </section>

      <section className={styles.principles} aria-labelledby="principles-title">
        <header>
          <p className={styles.eyebrow}>What we are testing</p>
          <h2 id="principles-title">Connection needs a little structure—not more pressure.</h2>
        </header>
        <div>
          {principles.map(([title, description], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.research} id="research-preview" aria-labelledby="research-title">
        <div className={styles.researchCopy}>
          <p className={styles.eyebrow}>30-minute conversation</p>
          <h2 id="research-title">We would rather hear your objection than your applause.</h2>
          <p>For the first study, we want to learn from single adults aged 25-39 who already move socially and can realistically reach the Aviatorilor-Aurel Vlaicu corridor.</p>
          <ul>
            <li>Written notes only</li>
            <li>Skip any question</li>
            <li>No quote or identity published without separate permission</li>
          </ul>
        </div>

        <div className={styles.formPreview} aria-label="Non-functional research application preview">
          <div className={styles.notice} role="note">
            <strong>Preview only</strong>
            <span>Data collection is intentionally disabled until the research privacy boundary is approved.</span>
          </div>
          <div className={styles.fieldPreview}>
            <span>01</span><div><strong>Your realistic travel time</strong><small>Broad travel tolerance, never a home address</small></div>
          </div>
          <div className={styles.fieldPreview}>
            <span>02</span><div><strong>Movement in your last 60 days</strong><small>Recent behavior, not athletic identity</small></div>
          </div>
          <div className={styles.fieldPreview}>
            <span>03</span><div><strong>One real time and price</strong><small>A decision, not a “sounds interesting” checkbox</small></div>
          </div>
          <button type="button" disabled>Applications are not open</button>
          <p>This page sends nothing and stores nothing.</p>
        </div>
      </section>

      <footer className={styles.footer}>
        <div><strong>{BRAND_NAME}</strong><span>Meet through movement</span></div>
        <p>Research hypothesis prepared for owner review. Bucharest and these sports are not final launch commitments.</p>
      </footer>
    </main>
  );
}

