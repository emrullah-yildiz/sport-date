import type { Metadata } from "next";
import Link from "next/link";

import { sportEmoji } from "@/lib/sports";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Sport Date — Meet through movement",
  description:
    "Meet compatible people through small, local sports — from running and padel to chess. Request a place, and let a real game carry the first encounter. Adults only, Europe first.",
};

const steps = [
  {
    number: "STEP 01",
    title: "Build your profile",
    description:
      "Pick the sports you play, your level, and whether you're open to dating, friendship, or just a good group to move with.",
  },
  {
    number: "STEP 02",
    title: "Discover activities nearby",
    description:
      "Browse small local events with the level, time, approximate area, and intentions clear — before you commit, and without exact addresses on display.",
  },
  {
    number: "STEP 03",
    title: "Request a place & meet",
    description:
      "Send a request to the host. Once they accept, the private meeting details unlock, and the shared activity does the work of breaking the ice.",
  },
];

// Curated subset shown on marketing. Emoji come from the shared sport map
// (`@/lib/sports`) so the landing and the sign-up picker can never drift.
const sports = [
  "Running",
  "Tennis",
  "Padel",
  "Football",
  "Basketball",
  "Bouldering",
  "Yoga",
  "Cycling",
  "Swimming",
  "Table Tennis",
  "Badminton",
  "Chess",
].map((name) => ({ name, emoji: sportEmoji(name) }));

const safety = [
  {
    badge: "18+",
    title: "Adults only",
    description: "The product is built exclusively for adults. No minors, by design.",
  },
  {
    badge: "AREA",
    title: "Approximate until accepted",
    description:
      "Discovery shows only an approximate area. Precise meeting details stay hidden until a host accepts your request.",
  },
  {
    badge: "CTRL",
    title: "Block & report built in",
    description:
      "Blocking and reporting are part of the baseline, with a moderation queue behind them — not an afterthought bolted on later.",
  },
  {
    badge: "EU",
    title: "Privacy-first, Europe first",
    description:
      "We launch in one dense European city first, with privacy and safety shaping the product from day one rather than after the fact.",
  },
];

export default async function LandingPage() {
  // Auth-aware home: a valid session must never look logged-out. getCurrentUser
  // returns null when signed out, so the public marketing page is unaffected.
  // Reading the session here makes this route dynamic, which is correct for a
  // page whose CTAs depend on who is (or isn't) viewing it.
  const user = await getCurrentUser();

  return (
    <main className="landing-page">
      <header className="navbar">
        <div className="nav-container">
          <Link className="logo" href={user ? "/discover" : "/landing"}>
            <span className="logo-mark" aria-hidden="true">S</span>
            Sport Date
          </Link>
          <nav className="nav-links" aria-label="Primary">
            <a href="#how-it-works">How it works</a>
            <a href="#sports">Sports</a>
            <a href="#safety">Safety</a>
          </nav>
          <div className="landing-nav-actions">
            {user ? (
              <>
                <Link href="/profile" className="nav-signin">
                  Signed in as {user.firstName}
                </Link>
                <Link href="/discover" className="btn btn--accent">Enter Sport Date</Link>
              </>
            ) : (
              <>
                <Link href="/login" className="nav-signin">Sign in</Link>
                <Link href="/signup" className="btn btn--accent">Create a profile</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="landing-shell">
        <section className="hero-section" aria-labelledby="hero-title">
          <div className="hero-content">
            <p className="eyebrow">Meet through movement</p>
            <h1 id="hero-title" className="hero-title">
              Meet people through a real game, <span className="accent">not another profile.</span>
            </h1>
            <p className="hero-subtitle">
              Sport Date organises the first encounter around a small local sport — a run, a padel
              match, a chess game. Know the level, time, area, and intentions before you request a
              place.
            </p>
            <div className="hero-cta">
              {user ? (
                <>
                  <Link href="/discover" className="btn btn--primary btn--lg">Enter Sport Date</Link>
                  <Link href="/profile" className="btn btn--secondary btn--lg">Your profile</Link>
                </>
              ) : (
                <>
                  <Link href="/signup" className="btn btn--primary btn--lg">Create a profile</Link>
                  <a href="#how-it-works" className="btn btn--secondary btn--lg">See how it works</a>
                </>
              )}
            </div>
            <p className="microcopy">
              {user
                ? `You're signed in — pick up where you left off.`
                : "Private beta · Adults only · Europe first"}
            </p>
          </div>

          <div className="hero-visual" aria-hidden="true">
            <div className="preview-card">
              <div className="preview-head">
                <strong>Near you this week</strong>
                <span>4 events</span>
              </div>
              <div className="preview-event">
                <span className="preview-event-icon">🏃</span>
                <div>
                  <h3>Easy 5K + coffee</h3>
                  <p>Sat 09:00 · Beginner · ~Floreasca</p>
                </div>
                <span className="preview-spots">2 spots</span>
              </div>
              <div className="preview-event">
                <span className="preview-event-icon">🏓</span>
                <div>
                  <h3>4-player padel</h3>
                  <p>Tue 19:30 · Intermediate · ~Aviatorilor</p>
                </div>
                <span className="preview-spots">1 spot</span>
              </div>
              <div className="preview-event">
                <span className="preview-event-icon">♟️</span>
                <div>
                  <h3>Casual chess night</h3>
                  <p>Thu 18:00 · All levels · ~Herastrau</p>
                </div>
                <span className="preview-spots">3 spots</span>
              </div>
              <p className="preview-foot">Exact location shared after the host accepts</p>
            </div>
          </div>
        </section>
      </div>

      <section id="how-it-works" className="landing-section how-section" aria-labelledby="how-title">
        <div className="landing-shell">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 id="how-title" className="section-title">Three steps from sign-up to a real meeting.</h2>
            <p className="section-lede">
              No infinite feed, no auditioning through chat. You join something you already want to do.
            </p>
          </div>
          <div className="steps-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <p className="step-number">{step.number}</p>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <div className="landing-shell">
        <section id="sports" className="landing-section sports-section" aria-labelledby="sports-title">
          <div className="landing-shell">
            <div className="section-head">
              <p className="eyebrow" style={{ color: "var(--lime)" }}>A sport for everyone</p>
              <h2 id="sports-title" className="section-title">From a 5K to a chess board.</h2>
              <p className="section-lede">
                Every kind of sportive meet-up — physical or mind sport. If your game isn&apos;t here, host it.
              </p>
            </div>
            <ul className="sports-grid" aria-label="Supported activities">
              {sports.map((sport) => (
                <li className="sport-chip" key={sport.name}>
                  <span className="emoji" aria-hidden="true">{sport.emoji}</span>
                  <span>{sport.name}</span>
                </li>
              ))}
              <li className="sport-chip add">
                <span className="emoji" aria-hidden="true">＋</span>
                <span>Add your own</span>
              </li>
            </ul>
            <p className="sports-note">
              Chess counts — meeting over a board is as real as meeting over a run.
            </p>
          </div>
        </section>
      </div>

      <section id="safety" className="landing-section" aria-labelledby="safety-title">
        <div className="landing-shell">
          <div className="section-head">
            <p className="eyebrow">Safety is product work</p>
            <h2 id="safety-title" className="section-title">Built for meeting strangers, carefully.</h2>
            <p className="section-lede">
              Trust comes from how the product behaves, not from badges. Here is the honest posture today.
            </p>
          </div>
          <div className="safety-grid">
            {safety.map((item) => (
              <article className="safety-card" key={item.title}>
                <span className="badge">{item.badge}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
          <p className="safety-honest">
            Being honest: this is an early product. There is no open one-to-one messaging yet, and we
            don&apos;t claim identity verification or any safety guarantee. Read the full, unvarnished
            version in our <Link href="/trust">Trust statement</Link>.
          </p>
        </div>
      </section>

      <section className="final-cta" aria-labelledby="cta-title">
        <h2 id="cta-title">Stop performing. Start playing.</h2>
        <p>
          {user
            ? "Your profile is ready. Jump back into what's happening near you."
            : "Create a private beta profile, pick your sports, and help shape how adults meet through movement."}
        </p>
        {user ? (
          <Link href="/discover" className="btn btn--accent btn--lg">Enter Sport Date</Link>
        ) : (
          <Link href="/signup" className="btn btn--accent btn--lg">Create a profile</Link>
        )}
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-shell">
          <div className="landing-footer-brand">
            <span className="logo">
              <span className="logo-mark" aria-hidden="true">S</span>
              Sport Date
            </span>
            <p>Meet through movement. Adults only · Europe first.</p>
          </div>
          <nav aria-label="Legal and policy links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/safety-guidelines">Safety guidelines</Link>
            <Link href="/trust">Trust</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
