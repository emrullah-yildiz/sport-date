"use client";

/* eslint-disable @next/next/no-img-element -- Fictional local preview photography. */
import { photoSources } from "../concepts/concept-assets";
import { Arrow, CourtLines, SportGlyph } from "../concepts/ConceptVisuals";
import { mapGames, type MapGame } from "../concepts/play-map-data";
import s from "./landing.module.css";

const featuredGames = mapGames.filter(game => game.destinationId === "bucharest" && game.places > 0).slice(0, 3);

export default function PreviewLanding({ onDiscover, onCreate, onEvent, onJoin, joinState, games = featuredGames }: {
  onDiscover: () => void;
  onCreate: () => void;
  onEvent: (game: MapGame) => void;
  onJoin: (game: MapGame) => void;
  joinState?: (game: MapGame) => "pending" | "accepted" | "hosting" | undefined;
  games?: MapGame[];
}) {
  const heroGame = games[0];
  return <div className={s.landing}>
    <section className={s.hero} aria-labelledby="preview-landing-heading">
      <div className={s.heroCopy}>
        <p className={s.kicker}><span aria-hidden="true" /> A little sport. A good connection.</p>
        <h1 id="preview-landing-heading">Your next game.<br /><span>Your kind<br className={s.desktopBreak} /> of people.</span></h1>
        <p className={s.intro}>Find a game, meet new people, and make a good day of it. At home or away.</p>
        <div className={s.actions}><button className={s.primary} onClick={onDiscover}>Find a game <Arrow /></button><button className={s.textButton} onClick={onCreate}>Or create one <Arrow /></button></div>
        <p className={s.quiet}>Take a look around. Join when you’re ready.</p>
      </div>

      <div className={s.scene} aria-label={heroGame ? "A tennis player and an illustrated game map" : "An illustrated game map"}>
        <svg className={s.path} viewBox="0 0 600 540" fill="none" aria-hidden="true"><path d="M-8 359C76 359 41 64 210 92S534 82 549 231 344 497 632 448" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 8" /></svg>
        <div className={s.backCourt}><CourtLines /></div>
        {heroGame ? <div className={s.portrait}><img src={photoSources[0]} alt="Mara holding her tennis racket on an outdoor court" /><span className={s.photoLabel}>Mara, 28 <span>Always up for a rally.</span></span></div> : <div className={`${s.portrait} ${s.emptyPortrait}`} aria-hidden="true"><CourtLines /><span>Good company.<br />Starts with a game.</span></div>}
        <span className={s.mapDot} aria-hidden="true"><SportGlyph sport="Running" size={27} /></span>
        <span className={s.spark} aria-hidden="true">✳</span>
        <button className={s.gameTicket} onClick={() => heroGame ? onEvent(heroGame) : onDiscover()}><span className={s.ticketIcon}><SportGlyph sport={heroGame?.sport ?? "Tennis"} size={30} /></span><span>{heroGame?.title ?? "Find a game"}<small>{heroGame ? `${heroGame.day.slice(0, 3)} ${Number(heroGame.date.slice(-2))} Oct · ${heroGame.time} · ${heroGame.places} places` : "Your next plan is out there."}</small></span><Arrow /></button>
        <span className={s.sceneCaption}>A new face. Your next favourite plan.</span>
      </div>
    </section>

    <ol className={s.steps} aria-label="How it works">
      <li><span className={s.stepNumber}>01</span><div><h2>Pick a game.</h2><p>Your sport, your place, your pace.</p></div><Arrow /></li>
      <li><span className={s.stepNumber}>02</span><div><h2>Tap to join.</h2><p>Send your request in a moment.</p></div><Arrow /></li>
      <li><span className={s.stepNumber}>03</span><div><h2>Meet. Play. Repeat.</h2><p>Once the host accepts, you’re in.</p></div></li>
    </ol>

    <section className={s.games} aria-labelledby="preview-featured-heading">
      <header className={s.sectionHeading}><div><p className={s.kicker}>Room for one more</p><h2 id="preview-featured-heading">Good plans start here.</h2><p>Bucharest · 3–4 October</p></div><button className={s.textButton} onClick={onDiscover}>Explore all games <Arrow /></button></header>
      {games.length === 0 ? <div className={s.emptyGames}><p>Your next plan is out there.</p><button className={s.textButton} onClick={onDiscover}>Browse games <Arrow /></button></div> : <ul className={s.gameGrid}>{games.map(game => {
        const status = joinState?.(game);
        const joinLabel = status === "pending" ? "Requested" : status === "accepted" ? "Joined" : status === "hosting" ? "Hosting" : "Join";
        return <li key={game.id} className={s.gameCard} data-sport={game.sport}>
        <button className={s.gameDetail} onClick={() => onEvent(game)} aria-label={`View ${game.title}`}>
          <span className={s.cardTop}><span className={s.sportIcon}><SportGlyph sport={game.sport} size={28} /></span><span>{game.day.slice(0, 3)} {Number(game.date.slice(-2))} Oct<small>{game.time}</small></span><Arrow /></span>
          <span className={s.gameSport}>{game.sport} · {game.level}</span>
          <strong>{game.title}</strong>
          <span className={s.gameArea}>{game.area} · {game.cost === "free" ? "Free" : "Shared cost"}</span>
        </button>
        <div className={s.cardBottom}><span><i aria-hidden="true" />{game.places} {game.places === 1 ? "place" : "places"} open</span><button className={s.joinButton} onClick={() => onJoin(game)} disabled={Boolean(status)} aria-label={`${joinLabel}: ${game.title}`}><span aria-hidden="true">{status ? "✓" : "+"}</span> {joinLabel}</button></div>
      </li>; })}</ul>}
    </section>

    <section className={s.hostNote} aria-labelledby="preview-host-heading"><div className={s.hostSymbol} aria-hidden="true">+</div><div><h2 id="preview-host-heading">Have a game in mind?</h2><p>Make the plan. Let good company find you.</p></div><button className={s.textButton} onClick={onCreate}>Create a game <Arrow /></button></section>
  </div>;
}
