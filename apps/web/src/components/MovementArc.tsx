import Link from "next/link";

import { MOVEMENT_STAGES } from "@sport-date/domain";

import MovementArcStage from "@/components/3d/MovementArcStage";
import type { ArcNode } from "@/components/3d/MovementArcScene";
import type { MemberMovementProgress } from "@/lib/progress";

export default function MovementArc({ progress }: { progress: MemberMovementProgress }) {
  // Derive the 3D milestone nodes from the SAME real data the text version
  // shows — no new notion of progress, no score/streak. A node is "reached"
  // when its threshold is met; the single "current" node is the member's stage.
  const currentSlug = progress.currentStage.slug;
  const nodes: ArcNode[] = MOVEMENT_STAGES.map((stage) => ({
    reached: progress.attendedMoves >= stage.threshold,
    current: stage.slug === currentSlug,
  }));

  // litFraction (0..1): how far along the arc glows lime — up to the current
  // marker, plus the partial progress toward the next stage. With one stage
  // (none ahead) the whole arc is lit. Mirrors stageProgressPercent exactly.
  const lastIndex = MOVEMENT_STAGES.length - 1;
  const currentIndex = MOVEMENT_STAGES.findIndex((stage) => stage.slug === currentSlug);
  const litFraction =
    lastIndex === 0
      ? 1
      : Math.min(1, (currentIndex + progress.stageProgressPercent / 100) / lastIndex);

  return (
    <section className="movement-arc" aria-labelledby="movement-arc-title">
      <header>
        <div><p className="panel-label">Your Movement Arc</p><h2 id="movement-arc-title">{progress.currentStage.label}</h2></div>
        <div className="movement-count"><strong>{progress.attendedMoves}</strong><span>self-confirmed {progress.attendedMoves === 1 ? "move" : "moves"}</span></div>
      </header>
      {/* Decorative 3D progression. Space is reserved so there's no layout
          shift while it lazy-loads; it is aria-hidden because the full progress
          (stage, count, next step, every milestone) is available as text below
          and to screen readers. When WebGL is unavailable it shows a calm CSS
          poster, and the 2D track/stage list underneath is the real fallback. */}
      <div className="movement-arc-stage" aria-hidden="true">
        <MovementArcStage nodes={nodes} litFraction={litFraction} />
      </div>
      <div className="movement-track" aria-label={`${progress.stageProgressPercent}% progress toward the next movement stage`}>
        <span style={{ width: `${progress.stageProgressPercent}%` }} />
      </div>
      <ol className="movement-stages">
        {MOVEMENT_STAGES.map((stage) => <li key={stage.slug} className={progress.attendedMoves >= stage.threshold ? "reached" : "upcoming"} aria-current={stage.slug === currentSlug ? "step" : undefined}><span>{stage.threshold}</span><strong>{stage.label}</strong></li>)}
      </ol>
      <div className="movement-story">
        <p>{progress.nextStage
          ? `${progress.movesToNextStage} more self-confirmed ${progress.movesToNextStage === 1 ? "move" : "moves"} to reach ${progress.nextStage.label}.`
          : "Your arc is open-ended now. Keep choosing movement that feels worthwhile—there is no leaderboard to chase."}</p>
        <div><span>{progress.hostedMoves} hosted</span><span>{progress.joinedMoves} joined</span></div>
      </div>
      {progress.recentMoves.length > 0 ? <div className="movement-recent">
        {progress.recentMoves.map((move) => <Link href={`/events/${move.eventId}/room`} key={move.eventId}><span>{move.sport} · {move.role}</span><strong>{move.title}</strong><small>{new Date(move.startsAt).toLocaleDateString()}</small></Link>)}
      </div> : <div className="movement-empty"><p>Your arc begins after a finished event when you privately confirm you attended.</p><Link href="/discover">Find a first move</Link></div>}
      <footer>Private by design. No streaks, public scores, or points for browsing and rejection.</footer>
    </section>
  );
}
