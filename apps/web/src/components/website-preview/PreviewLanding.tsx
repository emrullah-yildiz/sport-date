"use client";

/* eslint-disable @next/next/no-img-element -- Fictional local preview photography. */
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { photoSources } from "../concepts/concept-assets";
import { Arrow, SportGlyph } from "../concepts/ConceptVisuals";
import { destinations, filterMapGames, type MapFilters, type MapGame } from "../concepts/play-map-data";
import PlayPavilion, { usePavilionReducedMotion } from "./PlayPavilion";
import s from "./landing.module.css";

const sports: MapFilters["sport"][] = ["All", "Tennis", "Running", "Padel"];
const sceneCaptions = { All: "A little room for every kind of play.", Tennis: "A good rally starts with a hello.", Running: "Find your pace. Find your people.", Padel: "Four players. One very good plan." };
function gameDate(date: string) {
  return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

function StepPicture({ step }: { step: number }) {
  return <svg viewBox="0 0 160 92" fill="none" aria-hidden="true">
    {step === 0 ? <><path d="M20 70 80 84 143 51 85 36Z" fill="#dbecea" stroke="#75b9b7" /><path d="m43 66 43 9 32-18-39-9Z" stroke="#fff" strokeWidth="2" /><path d="m65 71 36-19m-41 3 41 10" stroke="#fff" strokeWidth="2" /><path d="M80 52V26" stroke="#087d84" strokeWidth="2" /><circle cx="80" cy="20" r="13" fill="#087d84" /><path d="m75 20 3 3 6-7" stroke="white" strokeWidth="2" /></> : step === 1 ? <><rect x="34" y="16" width="91" height="62" rx="12" transform="rotate(-6 34 16)" fill="white" stroke="#bdc8cc" /><path d="m51 33 25-3m-23 14 34-3m-32 13 19-2" stroke="#9eb7ba" strokeWidth="3" strokeLinecap="round" /><circle cx="117" cy="59" r="19" fill="#ef765b" /><path d="m111 59 6 5 9-12" stroke="white" strokeWidth="2.5" strokeLinecap="round" /></> : <><ellipse cx="81" cy="75" rx="55" ry="7" fill="#dfe6e6" /><circle cx="51" cy="27" r="10" fill="#ef765b" /><path d="M51 40v26m0-20L37 55m14-9 23-12" stroke="#ef765b" strokeWidth="8" strokeLinecap="round" /><circle cx="107" cy="27" r="10" fill="#087d84" /><path d="M107 40v26m0-20 14 9m-14-9L84 34" stroke="#087d84" strokeWidth="8" strokeLinecap="round" /><path d="m75 17 3 8m10-9-4 8" stroke="#9caab1" strokeWidth="2" strokeLinecap="round" /></>}
  </svg>;
}

export default function PreviewLanding({ onDiscover, onCreate, onEvent, onJoin, joinState, games, filters, onFiltersChange, showPerson }: {
  onDiscover: () => void;
  onCreate: () => void;
  onEvent: (game: MapGame) => void;
  onJoin: (game: MapGame) => void;
  joinState?: (game: MapGame) => "pending" | "accepted" | "hosting" | undefined;
  games: MapGame[];
  filters: MapFilters;
  onFiltersChange: (patch: Partial<MapFilters>) => void;
  showPerson: boolean;
}) {
  const [paused, setPaused] = useState(false);
  const [missingPhoto, setMissingPhoto] = useState(false);
  const checkPhoto = useCallback((image: HTMLImageElement | null) => {
    if (image?.complete && image.naturalWidth === 0) setMissingPhoto(true);
  }, []);
  const reducedMotion = usePavilionReducedMotion();
  const results = filterMapGames(games, filters);
  const featured = results.slice(0, 3);
  const destination = destinations.find(place => place.id === filters.destinationId) ?? destinations[0];
  const hasExtraFilters = Boolean(filters.dateFrom || filters.dateTo || filters.level !== "any" || filters.period !== "any" || filters.language !== "any" || filters.areaId !== "all" || filters.openOnly || filters.freeOnly);
  const photoIndex = filters.sport === "Running" ? 1 : filters.sport === "Padel" ? 2 : 0;
  const personVisible = showPerson && results.some(game => !game.id.startsWith("hosted-"));

  return <div className={s.landing}>
    <section className={s.hero} aria-labelledby="preview-landing-heading">
      <div className={s.heroCopy}>
        <p className={s.kicker}><span aria-hidden="true" /> A little sport. A good connection.</p>
        <h1 id="preview-landing-heading">Good company.<br /><span>Starts with<br />a game.</span></h1>
        <p className={s.intro}>Meet through the things you love to do.<br className={s.copyBreak} /> A friendly game is all it takes to start.</p>
        <div className={s.sports} role="group" aria-label="Choose a sport">{sports.map(sport => <button key={sport} type="button" aria-pressed={filters.sport === sport} onClick={() => onFiltersChange({ sport })}>{sport !== "All" && <SportGlyph sport={sport} size={17} />}{sport === "All" ? "All sports" : sport}</button>)}</div>
        <div className={s.findRow}>
          <label className={s.destination}><span>Play in</span><select aria-label="Play in" value={destination.id} onChange={event => onFiltersChange({ destinationId: event.target.value })}>{destinations.map(place => <option key={place.id} value={place.id}>{place.city}, {place.country}</option>)}</select></label>
          <button className={s.primary} onClick={onDiscover}>Find a game <Arrow /></button>
        </div>
        <p className={s.quiet}>Come solo. There’s room for you.</p>
      </div>

      <div className={s.sceneWrap}>
        <div className={s.scene}><PlayPavilion sport={filters.sport} paused={paused} /></div>
        <div className={s.sceneTop}><span className={s.sceneNumber} aria-hidden="true">0{sports.indexOf(filters.sport) + 1} / 04</span><span>Make room for play</span></div>
        {personVisible && <div className={s.personCard}>
          <div className={s.personPhoto}>{missingPhoto ? <span className={s.personInitials} role="img" aria-label="Mara">M</span> : <img ref={checkPhoto} src={photoSources[photoIndex]} alt="Mara, a fictional player in this preview" onError={() => setMissingPhoto(true)} />}</div>
          <div><span>Mara, 28 <i aria-hidden="true">↗</i></span><small>{filters.sport === "Running" ? "Here for a no-rush run." : filters.sport === "Padel" ? "Learning together." : "A rally. Then a coffee."}</small></div>
        </div>}
        <div className={s.sceneBottom}><p>{sceneCaptions[filters.sport]}</p><button type="button" className={s.pause} disabled={Boolean(reducedMotion)} aria-label={paused ? "Resume animation" : "Pause animation"} aria-pressed={paused || Boolean(reducedMotion)} onClick={() => setPaused(value => !value)}><span aria-hidden="true">{paused || reducedMotion ? "▷" : "Ⅱ"}</span><span>{reducedMotion ? "Still view" : paused ? "Resume" : "Pause"}</span></button></div>
      </div>
    </section>

    <section className={s.games} aria-labelledby="preview-featured-heading">
      <header className={s.sectionHeading}><div><p className={s.kicker}>Your next good plan</p><h2 id="preview-featured-heading">Games to get you going.</h2><p aria-live="polite" aria-atomic="true">{destination.city} · {filters.sport === "All" ? "All sports" : filters.sport} · {results.length} {results.length === 1 ? "game" : "games"}{hasExtraFilters ? " · Your filters applied" : ""}</p></div><button className={s.textButton} onClick={onDiscover}>Explore all games <Arrow /></button></header>
      {featured.length === 0 ? <div className={s.emptyGames}><SportGlyph sport={filters.sport === "All" ? "Tennis" : filters.sport} size={30} /><div><h3>No games match just yet.</h3><p>Try another sport or adjust your filters.</p></div><button className={s.textButton} onClick={onDiscover}>Review filters <Arrow /></button></div> : <ul className={s.gameList}>{featured.map(game => {
        const status = joinState?.(game);
        const full = game.places <= 0;
        const joinLabel = status === "pending" ? "Requested" : status === "accepted" ? "Joined" : status === "hosting" ? "Hosting" : full ? "Full" : "Join";
        return <li key={game.id} className={s.gameCard} data-game-id={game.id} data-game-sport={game.sport} data-game-places={game.places}>
          <button className={s.gameDetail} onClick={() => onEvent(game)} aria-label={`View ${game.title}`}><span className={s.sportIcon}><SportGlyph sport={game.sport} size={29} /></span><span className={s.gameName}><small>{game.sport} · {game.level}</small><strong>{game.title}</strong><span>{game.area} · {game.cost === "free" ? "Free" : "Shared cost"}</span></span><span className={s.gameWhen}>{gameDate(game.date)}<small>{game.time} · {game.duration}</small></span></button>
          <div className={s.cardAction}><span>{full ? "No places left" : `${game.places} ${game.places === 1 ? "place" : "places"} open`}</span><button className={s.joinButton} onClick={() => onJoin(game)} disabled={Boolean(status) || full} aria-label={`${joinLabel}: ${game.title}`}><span aria-hidden="true">{status ? "✓" : full ? "−" : "+"}</span>{joinLabel}</button></div>
        </li>;
      })}</ul>}
      <p className={s.localTime}>Times are local to {destination.city}.</p>
    </section>

    <section className={s.how} aria-label="How it works"><p className={s.kicker}>Less planning. More playing.</p><ol className={s.steps}>{[
      { title: "Choose a game.", body: "Your sport, your place, your pace." },
      { title: "Send a request.", body: "A simple + Join gets things started." },
      { title: "Meet when accepted.", body: "The host confirms. You’re ready to play." },
    ].map((step, index) => <motion.li key={step.title} initial={{ y: reducedMotion ? 0 : 16 }} whileInView={{ y: 0 }} viewport={{ once: true, amount: .4 }} transition={{ duration: reducedMotion ? 0 : .45, delay: reducedMotion ? 0 : index * .09 }}><StepPicture step={index} /><span className={s.stepNumber}>0{index + 1}</span><h2>{step.title}</h2><p>{step.body}</p></motion.li>)}</ol></section>

    <section className={s.hostNote} aria-labelledby="preview-host-heading"><div className={s.hostSymbol} aria-hidden="true">＋</div><div><p className={s.kicker}>Got a game in mind?</p><h2 id="preview-host-heading">Make the plan.<br />Bring people together.</h2></div><button className={s.hostButton} onClick={onCreate}>Create a game <Arrow /></button></section>
  </div>;
}
