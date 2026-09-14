"use client";

import { Children, useState, type ReactNode } from "react";
import styles from "./discovery.module.css";

/** Only server-rendered public invitation markup crosses this boundary, never event records. */
export default function EventStage({ children }: { children: ReactNode }) {
  const cards = Children.toArray(children);
  const [index, setIndex] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const current = Math.min(index, Math.max(0, cards.length - 1));
  if (!cards.length) return null;
  return (
    <div className={styles.stage}>
      <div className={styles.stageToolbar}>
        <p role="status" aria-live="polite" aria-atomic="true">{showAll ? `${cards.length} invitations` : `Invitation ${current + 1} of ${cards.length}`}</p>
        <button type="button" aria-pressed={showAll} onClick={() => setShowAll(!showAll)}>{showAll ? "One at a time" : "See all"}</button>
      </div>
      <div className={showAll ? styles.grid : styles.focused} id="invitation-stage">
        {showAll ? cards : <div key={current} className={styles.enter}>{cards[current]}</div>}
      </div>
      {!showAll && cards.length > 1 ? <nav className={styles.browseControls} aria-label="Browse invitations">
        <button type="button" aria-controls="invitation-stage" disabled={current === 0} onClick={() => setIndex(current - 1)}>← Previous</button>
        <span>{current === cards.length - 1 ? "You're all caught up" : "Find your kind of plan"}</span>
        <button type="button" aria-controls="invitation-stage" disabled={current === cards.length - 1} onClick={() => setIndex(current + 1)}>Next →</button>
      </nav> : null}
    </div>
  );
}
