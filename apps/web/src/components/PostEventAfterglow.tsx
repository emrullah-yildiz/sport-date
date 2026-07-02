// A warm, host-toned "afterglow" moment shown once an event has ended, above the
// optional reflection form. It acknowledges the shared activity with dignity and
// offers a calm, clearly-optional forward path (reflect below, discover another
// event, host one). Deliberately anti-manipulative: no streaks, no scores, no
// popularity/attractiveness metric, no counters-as-pressure, no fake urgency or
// guilt. It is a static server component — no client JS for the content, so it
// works with no-JS and needs no reduced-motion fallback beyond the CSS entrance
// (which is disabled under prefers-reduced-motion). The only client touch is a
// brief, decorative neon MomentGlow celebrating that a real meeting happened;
// it is aria-hidden, non-blocking, and has a static reduced-motion fallback.
import Link from "next/link";

import MomentGlow from "@/components/MomentGlow";

const REFLECTION_ANCHOR = "event-reflection-title";

export default function PostEventAfterglow({
  isHost,
  hasReflected,
}: {
  isHost: boolean;
  hasReflected: boolean;
}) {
  const heading = isHost ? "You made this happen" : "Glad you got out and moved";
  const lede = isHost
    ? "You gave people a real reason to show up and share an hour of movement. However it went, hosting is generous — thank you for making the plan real."
    : "You showed up and did something real together. That is the whole point, and no number could measure it. Hope it felt good to move.";

  return (
    <section className="post-event-afterglow" aria-labelledby="afterglow-title">
      <MomentGlow tone="go" />
      <div className="post-event-afterglow-copy">
        <p className="panel-label">A warm ending</p>
        <h2 id="afterglow-title">{heading}</h2>
        <p>{lede}</p>
        <p className="post-event-afterglow-reflect-note">
          {hasReflected
            ? "Thanks for the private note below — you can update it any time, or just head off."
            : "If you feel like it, there is an optional private reflection below. It is entirely up to you — nothing changes if you skip it."}
        </p>
      </div>
      <div className="post-event-afterglow-paths">
        {hasReflected ? null : (
          <a className="post-event-afterglow-reflect" href={`#${REFLECTION_ANCHOR}`}>
            Reflect below <span aria-hidden="true">↓</span>
          </a>
        )}
        <Link className="post-event-afterglow-discover" href="/discover">
          Find another game
        </Link>
        <Link className="post-event-afterglow-host" href="/events/new">
          Host one yourself
        </Link>
      </div>
    </section>
  );
}
