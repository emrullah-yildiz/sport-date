"use client";

/* eslint-disable @next/next/no-img-element -- Fictional local concept photography. */
import { useRef, useState } from "react";
import { photoSources } from "./concept-assets";
import type { ConceptEvent, Sport } from "./concept-data";
import { destinations, mapGames, defaultMapFilters, filterMapGames, groupMapGames } from "./play-map-data";
import type { MapFilters } from "./play-map-data";
import { Arrow, CourtLines, SportGlyph } from "./ConceptVisuals";
import s from "./play-map.module.css";

export type MapDiscoveryState = { filters: MapFilters; view: "map" | "list"; page: number };
export const initialMapDiscovery: MapDiscoveryState = { filters: { ...defaultMapFilters }, view: "map", page: 0 };
const pageSize = 8;
const sports: (Sport | "All")[] = ["All", "Tennis", "Running", "Padel"];

export default function PlayMapDiscovery({ empty, state, onChange, onEvent, onProfile, onProgress }: {
  empty: boolean; state: MapDiscoveryState; onChange: (state: MapDiscoveryState) => void;
  onEvent: (event: ConceptEvent) => void; onProfile: () => void; onProgress: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const resultsHeading = useRef<HTMLHeadingElement>(null);
  const resultList = useRef<HTMLUListElement>(null);
  const { filters, view } = state;
  const destination = destinations.find(place => place.id === filters.destinationId) ?? destinations[0];
  const results = empty ? [] : filterMapGames(mapGames, filters);
  const clusters = groupMapGames(results, destination.id);
  const page = Math.min(state.page, Math.max(0, Math.ceil(results.length / pageSize) - 1));
  const pageGames = results.slice(page * pageSize, (page + 1) * pageSize);
  const selectedArea = destination.areas.find(area => area.id === filters.areaId);
  const invalidDates = Boolean(filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo);
  const extraCount = Number(filters.level !== "any") + Number(filters.period !== "any") + Number(filters.language !== "any") + Number(filters.areaId !== "all") + Number(filters.openOnly) + Number(filters.freeOnly);
  function update(patch: Partial<MapFilters>) { onChange({ ...state, filters: { ...filters, ...patch }, page: 0 }); }
  function clear() { onChange({ ...state, filters: { ...defaultMapFilters, destinationId: destination.id }, page: 0 }); }
  function changePage(nextPage: number) {
    onChange({ ...state, page: nextPage });
    requestAnimationFrame(() => { resultList.current?.scrollTo({ top: 0, behavior: "instant" }); resultsHeading.current?.focus({ preventScroll: true }); resultsHeading.current?.scrollIntoView({ block: "start", behavior: "instant" }); });
  }
  function selectArea(areaId: string) { update({ areaId }); document.getElementById("map-results")?.scrollIntoView({ block: "nearest", behavior: "instant" }); }
  return <div className={s.page}>
    <header className={s.header}><div><p className={s.eyebrow}><span /> YOUR NEXT PLACE TO PLAY</p><h1>Where are we<br /><span>playing next?</span></h1><p className={s.intro}>At home or away. Find a game that fits.</p></div><button className={s.profile} type="button" onClick={onProfile}><img src={photoSources[0]} alt="" /><span>Mara<small>View player card <Arrow /></small></span></button></header>

    <section className={s.search} aria-label="Find your game">
      <div className={s.primaryFilters}>
        <label className={s.destinationField}>Destination<select aria-label="Destination" value={destination.id} onChange={event => update({ destinationId: event.target.value, areaId: "all" })}>{destinations.map(place => <option key={place.id} value={place.id}>{place.city}, {place.country}</option>)}</select></label>
        <label>Arrive from<input aria-label="Arrive from" type="date" value={filters.dateFrom} onChange={event => update({ dateFrom: event.target.value })} /></label>
        <label>Leave by<input aria-label="Leave by" type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={event => update({ dateTo: event.target.value })} /></label>
      </div>
      <div className={s.filterRow}><div className={s.sports} role="group" aria-label="Filter activities">{sports.map(sport => <button key={sport} aria-pressed={filters.sport === sport} onClick={() => update({ sport })}>{sport !== "All" && <SportGlyph sport={sport} size={16} />}{sport === "All" ? "Anything goes" : sport}</button>)}</div><button className={s.moreButton} aria-expanded={moreOpen} aria-controls="map-extra-filters" onClick={() => setMoreOpen(value => !value)}>More filters{extraCount > 0 && <span>{extraCount}</span>} <span aria-hidden="true">{moreOpen ? "−" : "+"}</span></button></div>
      {moreOpen && <div id="map-extra-filters" className={s.extraFilters}>
        <label>Skill level<select aria-label="Skill level" value={filters.level} onChange={event => update({ level: event.target.value as MapFilters["level"] })}><option value="any">Any level</option><option value="beginner">Beginner friendly</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label>
        <label>Time of day<select aria-label="Time of day" value={filters.period} onChange={event => update({ period: event.target.value as MapFilters["period"] })}><option value="any">Any time</option><option value="morning">Morning · before 12</option><option value="afternoon">Afternoon · 12–17</option><option value="evening">Evening · from 17</option></select></label>
        <label>Language<select aria-label="Language" value={filters.language} onChange={event => update({ language: event.target.value as MapFilters["language"] })}><option value="any">Any language</option><option>English</option><option>Romanian</option><option>Spanish</option><option>Portuguese</option></select></label>
        <label>Area<select aria-label="Area" value={filters.areaId} onChange={event => update({ areaId: event.target.value })}><option value="all">All areas</option>{destination.areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select></label>
        <label className={s.checkbox}><input type="checkbox" checked={filters.openOnly} onChange={event => update({ openOnly: event.target.checked })} />Places available</label><label className={s.checkbox}><input type="checkbox" checked={filters.freeOnly} onChange={event => update({ freeOnly: event.target.checked })} />Free games only</label>
        <button className={s.doneButton} onClick={() => setMoreOpen(false)}>Done</button>
      </div>}
      {invalidDates && <p role="alert" className={s.dateError}>Choose an end date on or after your arrival.</p>}
      <div className={s.activeFilters} aria-label="Active filters">
        {(filters.dateFrom || filters.dateTo) && <button onClick={() => update({ dateFrom: "", dateTo: "" })}>Dates: {filters.dateFrom || "any"} → {filters.dateTo || "any"} <span>×</span></button>}
        {filters.level !== "any" && <button onClick={() => update({ level: "any" })}>{filters.level} <span>×</span></button>}
        {filters.period !== "any" && <button onClick={() => update({ period: "any" })}>{filters.period} <span>×</span></button>}
        {filters.language !== "any" && <button onClick={() => update({ language: "any" })}>{filters.language} <span>×</span></button>}
        {selectedArea && <button onClick={() => update({ areaId: "all" })}>{selectedArea.name} <span>×</span></button>}
        {filters.openOnly && <button onClick={() => update({ openOnly: false })}>Places available <span>×</span></button>}
        {filters.freeOnly && <button onClick={() => update({ freeOnly: false })}>Free games <span>×</span></button>}
      </div>
    </section>

    <section className={s.playground} aria-label="Game search results">
      <header className={s.toolbar}><div><h2 data-testid="map-result-count" data-count={results.length} aria-live="polite">{results.length} {results.length === 1 ? "game" : "games"} in {destination.city}</h2><p>{destination.country} · Times in {destination.timezoneLabel}</p></div><div className={s.viewToggle} role="group" aria-label="Activity view"><button aria-pressed={view === "map"} onClick={() => onChange({ ...state, view: "map" })}>Map</button><button aria-pressed={view === "list"} onClick={() => onChange({ ...state, view: "list" })}>List</button></div></header>
      <div className={s.sampleBar}><span>100 fictional games per city · 2–8 Oct 2026</span><button onClick={clear}>Clear filters</button></div>
      {results.length === 0 ? <div className={s.empty}><span aria-hidden="true">↗</span><h3>No games fit just yet.</h3><p>Try another date, sport or level.</p><button onClick={clear}>Reset search in {destination.city} <Arrow /></button></div> : <div className={s.workspace} data-view={view}>
        {view === "map" && <div className={s.mapPanel}>
          <div className={s.mapHeading}><span>{selectedArea ? selectedArea.name : destination.city + " · Area overview"}</span>{selectedArea ? <button onClick={() => update({ areaId: "all" })}>All areas <span aria-hidden="true">↗</span></button> : <span>Tap a count to explore</span>}</div>
          <div className={s.mapCanvas} aria-label="Schematic activity map">
            <svg className={s.routes} viewBox="0 0 600 500" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M-30 175C80 110 130 340 255 237S355 35 466 138 500 330 645 286" stroke="#a4e9dc26" strokeWidth="30" /><path d="M-30 175C80 110 130 340 255 237S355 35 466 138 500 330 645 286" stroke="#a4e9dc66" strokeWidth="1.5" strokeDasharray="5 6" /><path d="M74 480C120 425 94 380 193 314S298 319 378 369 470 410 620 400M147 0C105 95 327 72 365 200S310 370 368 520" stroke="#f3a08f25" strokeWidth="2" /></svg>
            <div className={s.courtOne} aria-hidden="true"><CourtLines /></div><div className={s.courtTwo} aria-hidden="true"><CourtLines /></div><span className={s.mapStar} aria-hidden="true">✳</span>
            {clusters.map(cluster => <button key={cluster.areaId} className={s.cluster} style={{ left: selectedArea ? "50%" : cluster.x + "%", top: selectedArea ? "46%" : cluster.y + "%" }} aria-label={cluster.name + ": " + cluster.count + " games"} aria-pressed={filters.areaId === cluster.areaId} data-area-id={cluster.areaId} data-cluster-count={cluster.count} onClick={() => selectArea(cluster.areaId)}><span className={s.clusterCount}>{cluster.count}<small>games</small></span><span className={s.clusterName}>{cluster.name}</span></button>)}
            <span className={s.mapCaption}>Broad areas · illustrated positions</span>
          </div>
        </div>}
        <div id="map-results" className={s.resultsPanel}>
          <div className={s.listHeading}><h3 ref={resultsHeading} tabIndex={-1}>{selectedArea ? "In " + selectedArea.name : "Your next game"}</h3><label>Sort<select aria-label="Sort games" value={filters.sort} onChange={event => update({ sort: event.target.value as MapFilters["sort"] })}><option value="soonest">Soonest</option><option value="availability">Most places</option></select></label></div>
          <ul ref={resultList} className={s.eventList}>{pageGames.map(event => <li key={event.id} data-game-id={event.id} data-game-date={event.date} data-game-sport={event.sport} data-game-level={event.difficulty} data-game-language={event.language} data-game-time={event.time} data-game-places={event.places} data-game-free={event.cost === "free"}><button className={s.listEvent} onClick={() => onEvent(event)}><span className={s.listGlyph} data-sport={event.sport}><SportGlyph sport={event.sport} size={23} /></span><span className={s.listInfo}><span className={s.eventMeta}>{event.sport} · {event.level}</span><strong>{event.title}</strong><span className={s.eventWhen}>{new Date(event.date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })} · {event.time}</span><span className={s.eventArea}>{event.area} · {event.language} · {event.cost === "free" ? "Free" : "Shared cost"}</span><span className={s.listPlaces}>{event.places > 0 ? event.places + (event.places === 1 ? " place open" : " places open") : "Full"}<Arrow /></span></span></button></li>)}</ul>
          <div className={s.pagination}><span>{page * pageSize + 1}–{Math.min((page + 1) * pageSize, results.length)} of {results.length}</span><div><button aria-label="Previous games" disabled={page === 0} onClick={() => changePage(page - 1)}><Arrow back /></button><button aria-label="Next games" disabled={(page + 1) * pageSize >= results.length} onClick={() => changePage(page + 1)}><Arrow /></button></div></div>
        </div>
      </div>}
    </section>
    <button className={s.quest} onClick={onProgress}><SportGlyph sport="Running" size={29} /><span>A new place. Another good memory.<small>Your private movement arc</small></span><Arrow /></button>
  </div>;
}