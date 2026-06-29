import Link from "next/link";

import { MOVEMENT_STAGES } from "@sport-date/domain";

import type { MemberMovementProgress } from "@/lib/progress";

export default function MovementArc({ progress }: { progress: MemberMovementProgress }) {
  return (
    <section className="movement-arc" aria-labelledby="movement-arc-title">
      <header>
        <div><p className="panel-label">Your Movement Arc</p><h2 id="movement-arc-title">{progress.currentStage.label}</h2></div>
        <div className="movement-count"><strong>{progress.attendedMoves}</strong><span>self-confirmed {progress.attendedMoves === 1 ? "move" : "moves"}</span></div>
      </header>
      <div className="movement-track" aria-label={`${progress.stageProgressPercent}% progress toward the next movement stage`}>
        <span style={{ width: `${progress.stageProgressPercent}%` }} />
      </div>
      <ol className="movement-stages">
        {MOVEMENT_STAGES.map((stage) => <li key={stage.slug} className={progress.attendedMoves >= stage.threshold ? "reached" : "upcoming"}><span>{stage.threshold}</span><strong>{stage.label}</strong></li>)}
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
