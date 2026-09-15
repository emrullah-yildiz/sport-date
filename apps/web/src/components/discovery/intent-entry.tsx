import Link from "next/link";
import { DISCOVERY_TIME_CHOICES, discoveryIntentHref, discoveryPreservedFilters, type DiscoveryIntentDays, type DiscoveryIntentQuery } from "./intent-links";
import { formatDiscoveryDay } from "@/lib/discovery-date";
import styles from "./intent.module.css";

/** Server-rendered time shortcuts. No availability or attendance claims. */
export default function DiscoveryIntentEntry({ query, withinDays, onDate }: {
  query: DiscoveryIntentQuery;
  withinDays: DiscoveryIntentDays;
  onDate?: string | null;
}) {
  const invalidDate = Boolean(query.date && !onDate);
  const preserved = discoveryPreservedFilters(query);
  return <section className={styles.intent} aria-labelledby="discovery-intent-title">
    <div className={styles.heading}>
      <h2 id="discovery-intent-title">When can you play?</h2>
    </div>
    <form action="/discover" method="get" className={styles.dateForm}>
      {Array.from(preserved.entries()).map(([name, value], index) => <input key={`${name}-${index}`} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="days" value={withinDays} />
      <label htmlFor="free-date">I’m free on<input id="free-date" name="date" type="date" defaultValue={onDate ?? ""} key={onDate ?? "all"} required aria-describedby="date-help" /></label>
      <button type="submit">Find events</button>
      {onDate ? <Link href={discoveryIntentHref(query, withinDays)}>Clear date</Link> : null}
    </form>
    {invalidDate ? <p role="status" className={styles.dateHelp}>That date was not recognised. Choose a valid calendar date; showing the next {withinDays === 1 ? "24 hours" : `${withinDays} days`} for now.</p> : null}
    <p id="date-help" className={styles.dateHelp}>{onDate ? `Events starting on ${formatDiscoveryDay(onDate)}. ` : "Choose a date, or browse the next few days. "}Dates follow each event’s local time.</p>
    <nav className={styles.choices} aria-label="Choose when to play">
      {DISCOVERY_TIME_CHOICES.map(({ days, label }) => <Link
        key={days}
        href={discoveryIntentHref(query, days)}
        aria-current={!onDate && withinDays === days ? "page" : undefined}
        className={!onDate && withinDays === days ? styles.selected : styles.choice}
      >{label}<span aria-hidden="true">{!onDate && withinDays === days ? "✓" : "↗"}</span></Link>)}
    </nav>
  </section>;
}
