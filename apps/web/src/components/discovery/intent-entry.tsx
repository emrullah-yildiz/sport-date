import Link from "next/link";
import { DISCOVERY_TIME_CHOICES, discoveryIntentHref, type DiscoveryIntentDays, type DiscoveryIntentQuery } from "./intent-links";
import styles from "./intent.module.css";

/** Server-rendered time shortcuts. No availability or attendance claims. */
export default function DiscoveryIntentEntry({ query, withinDays }: {
  query: DiscoveryIntentQuery;
  withinDays: DiscoveryIntentDays;
}) {
  return <section className={styles.intent} aria-labelledby="discovery-intent-title">
    <div className={styles.heading}>
      <h2 id="discovery-intent-title">When can you play?</h2>
    </div>
    <nav className={styles.choices} aria-label="Choose when to play">
      {DISCOVERY_TIME_CHOICES.map(({ days, label }) => <Link
        key={days}
        href={discoveryIntentHref(query, days)}
        aria-current={withinDays === days ? "page" : undefined}
        className={withinDays === days ? styles.selected : styles.choice}
      >{label}<span aria-hidden="true">{withinDays === days ? "✓" : "↗"}</span></Link>)}
    </nav>
  </section>;
}
