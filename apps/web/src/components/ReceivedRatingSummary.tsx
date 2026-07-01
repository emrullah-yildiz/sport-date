import Link from "next/link";

import { PEER_FEEDBACK_AGGREGATE_MIN_COUNT, PEER_FEEDBACK_STARS_MAX, type PeerRatingAggregate } from "@sport-date/domain";

// The recipient's OWN meetup-experience rating, shown as an aggregate average only.
//
// This is the ONLY place a member ever sees their received stars, and it is
// deliberately recipient-only: it is rendered on the member's own /profile, never on
// a member-to-member or public profile, and it NEVER reveals who rated them or any
// individual star. Below the ≥3 threshold it shows a calm "not enough ratings yet"
// state with no partial number — so a single revenge rating can neither define nor
// out anyone. The double-blind reveal that decides which ratings count is enforced
// server-side (getReceivedRatingAggregate); this component only presents the result.
export default function ReceivedRatingSummary({ aggregate }: { aggregate: PeerRatingAggregate }) {
  const enough = aggregate.state === "available";
  return (
    <section className="received-rating" aria-labelledby="received-rating-title">
      <p className="panel-label">Earned trust</p>
      <h2 id="received-rating-title">How your meetups land</h2>
      <p>
        After you meet someone through Sport Date, they can leave a private 1&ndash;5 star note on the
        <strong> experience of meeting up</strong> &mdash; reliability, respect, and how the shared activity went.
        This is never about looks or desirability, and it is only ever shown here, to you, as an average.
      </p>
      {enough ? (
        <div className="received-rating-figure">
          <p
            className="received-rating-average"
            aria-label={`Your average experience rating is ${aggregate.average.toFixed(1)} out of ${PEER_FEEDBACK_STARS_MAX} stars, across ${aggregate.ratingCount} ratings.`}
          >
            <span className="received-rating-number" aria-hidden="true">{aggregate.average.toFixed(1)}</span>
            <span className="received-rating-scale" aria-hidden="true">/ {PEER_FEEDBACK_STARS_MAX}</span>
          </p>
          <p className="received-rating-count">Averaged across {aggregate.ratingCount} ratings from different meetups. Individual ratings and who left them are never shown.</p>
        </div>
      ) : (
        <div className="received-rating-empty">
          <p role="status">Not enough ratings yet.</p>
          <p>
            Once at least {PEER_FEEDBACK_AGGREGATE_MIN_COUNT} people you&rsquo;ve met have left a star, you&rsquo;ll see your
            average here. Until then nothing is shown &mdash; a single rating can never be traced back or stand alone.
          </p>
          <Link href="/discover" className="received-rating-action">Find a game to play <span aria-hidden="true">→</span></Link>
        </div>
      )}
      <small>Only you can see this. It is never shown on your profile to others, in discovery, or anywhere public.</small>
    </section>
  );
}
