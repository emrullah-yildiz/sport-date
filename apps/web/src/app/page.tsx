const events = [
  { sport: "Tennis", level: "Intermediate", time: "Tue · 19:00", spots: "2 spots" },
  { sport: "Morning run", level: "All levels", time: "Sat · 08:30", spots: "4 spots" },
  { sport: "Bouldering", level: "Beginner friendly", time: "Sun · 16:00", spots: "3 spots" },
];

export default function Home() {
  return (
    <main>
      <nav className="nav shell" aria-label="Primary navigation">
        <a className="brand" href="#top" aria-label="Sport Date home">
          <span className="brand-mark">S</span>
          <span>sport/date</span>
        </a>
        <div className="nav-links">
          <a href="#how-it-works">How it works</a>
          <a href="#safety">Safety</a>
          <a className="button button-small" href="#early-access">Join early access</a>
        </div>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Meet through movement</p>
          <h1>Your next great match might be on the next court.</h1>
          <p className="hero-lede">
            Find people who play like you do. Join local sports events, meet in real life,
            and let shared energy do the awkward first-message work.
          </p>
          <div className="hero-actions" id="early-access">
            <a className="button" href="mailto:hello@example.com?subject=Sport Date early access">
              Get early access <span aria-hidden="true">→</span>
            </a>
            <span className="microcopy">Adults only · Europe-first · Free during beta</span>
          </div>
        </div>

        <div className="event-stack" aria-label="Example nearby events">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="phone-card">
            <div className="phone-topline"><span>Nearby today</span><span>⌁ Bucharest</span></div>
            {events.map((event, index) => (
              <article className={`event-card event-${index + 1}`} key={event.sport}>
                <div className="event-icon" aria-hidden="true">{["↗", "≈", "◆"][index]}</div>
                <div>
                  <h2>{event.sport}</h2>
                  <p>{event.time} · {event.level}</p>
                </div>
                <span className="spots">{event.spots}</span>
              </article>
            ))}
            <button className="discover-button" type="button">Explore events</button>
          </div>
        </div>
      </section>

      <section className="steps shell" id="how-it-works">
        <div>
          <p className="eyebrow">A better way to break the ice</p>
          <h2>Less swiping. More living.</h2>
        </div>
        <ol>
          <li><span>01</span><strong>Choose your sports</strong><p>Set your level, languages, availability, and what kind of connection you want.</p></li>
          <li><span>02</span><strong>Find your event</strong><p>Discover small, local activities that fit your pace and preferences.</p></li>
          <li><span>03</span><strong>Meet safely</strong><p>Request a place, join the room, and get the exact meeting point after acceptance.</p></li>
        </ol>
      </section>

      <section className="safety shell" id="safety">
        <p className="eyebrow">Designed for real-world safety</p>
        <h2>Your private location stays private.</h2>
        <p>Discovery shows only an approximate area. Exact event details are reserved for accepted participants, with blocking and reporting always close at hand.</p>
      </section>
    </main>
  );
}
