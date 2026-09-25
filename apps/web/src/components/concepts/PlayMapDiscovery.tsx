"use client";

/* eslint-disable @next/next/no-img-element -- Local concept artwork uses ordinary images for the responsive design preview. */
import { useState } from "react";
import { photoSources } from "./concept-assets";
import type { DiscoveryProps } from "./concept-data";
import { Arrow, CourtLines, SportGlyph } from "./ConceptVisuals";
import s from "./play-map.module.css";

function MapIcon() {
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="m2 4 5-2 6 2 5-2v14l-5 2-6-2-5 2V4ZM7 2v14M13 4v14" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" /></svg>;
}
function ListIcon() {
  return <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true"><path d="M7 5h11M7 10h11M7 15h11M2 5h1M2 10h1M2 15h1" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>;
}

export default function PlayMapDiscovery({ events, onEvent, onProfile, onProgress }: DiscoveryProps) {
  const [view, setView] = useState<"map" | "list">("map");
  return <div className={s.page}>
    <header className={s.header}>
      <div><p className={s.eyebrow}><span /> YOUR CITY. YOUR PLAYGROUND.</p><h1>Where are we<br /><span>playing next?</span></h1><p className={s.intro}>Pick a plan. Find your people. Get out there.</p></div>
      <button className={s.profile} type="button" onClick={onProfile}><img src={photoSources[0]} alt="Mara holding her tennis racket" /><span>Mara<span>View player card <Arrow /></span></span></button>
    </header>

    <section className={s.playground} aria-labelledby="map-plans-heading">
      <header className={s.toolbar}><div><span className={s.orbit} aria-hidden="true">↗</span><h2 id="map-plans-heading">Open for play <small>Bucharest · This weekend</small></h2></div><div className={s.viewToggle} role="group" aria-label="Activity view"><button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}><MapIcon /> Map</button><button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}><ListIcon /> List</button></div></header>
      {!events.length ? <div className={s.empty}><span aria-hidden="true">↗</span><h3>A new route awaits.</h3><p>No plans in this selection. Try another sport.</p></div> : view === "map" ? <div className={s.mapCanvas}>
        <div className={s.grid} aria-hidden="true" />
        <svg className={s.routes} viewBox="0 0 1000 530" preserveAspectRatio="none" fill="none" aria-hidden="true"><path className={s.routeShadow} d="M120 130C240 35 400 38 510 146S640 280 790 148C950 5 1034 375 812 388S625 545 441 407 116 448 144 300 396 238 477 318" /><path className={s.routeLine} d="M120 130C240 35 400 38 510 146S640 280 790 148C950 5 1034 375 812 388S625 545 441 407 116 448 144 300 396 238 477 318" /><circle cx="511" cy="146" r="6" /><circle cx="790" cy="148" r="6" /><circle cx="440" cy="407" r="6" /></svg>
        <div className={`${s.littleCourt} ${s.courtOne}`} aria-hidden="true"><CourtLines /></div>
        <div className={`${s.littleCourt} ${s.courtTwo}`} aria-hidden="true"><CourtLines /></div>
        <div className={s.runningTrack} aria-hidden="true"><span /><span /><span /></div>
        <span className={s.mapStar} aria-hidden="true">✳</span><span className={s.mapPlus} aria-hidden="true">+</span>
        <div className={s.startMark} aria-hidden="true"><span />YOU ARE HERE<small>Somewhere between maybe and let’s go.</small></div>
        <ul className={s.destinations}>{events.map(event => <li key={event.id} className={s[`node${event.sport}`]}><button type="button" className={`${s.destination} ${s[`sport${event.sport}`]}`} onClick={() => onEvent(event)}><span className={s.nodePin}><SportGlyph sport={event.sport} size={24} /></span><span className={s.destinationTop}><span>{event.sport}</span><span>{event.places} {event.places === 1 ? "place" : "places"}</span></span><span className={s.destinationTitle}>{event.title}</span><span className={s.destinationDetails}>{event.day} · {event.time}<span>{event.area}</span></span><span className={s.nodeArrow}><Arrow /></span></button></li>)}</ul>
        <span className={s.mapCaption}>A playground of plans, not a street map.</span><span className={s.mapCoordinate} aria-hidden="true">PLAY / 001</span>
      </div> : <ul className={s.eventList}>{events.map(event => <li key={event.id}><button type="button" className={`${s.listEvent} ${s[`sport${event.sport}`]}`} onClick={() => onEvent(event)}><span className={s.listGlyph}><SportGlyph sport={event.sport} size={31} /></span><span className={s.listInfo}><span>{event.sport} · {event.level}</span><span className={s.listTitle}>{event.title}</span><span className={s.listArea}>{event.area} · {event.duration}</span></span><span className={s.listTime}>{event.day}<span>{event.time}</span></span><span className={s.listPlaces}>{event.places} {event.places === 1 ? "place" : "places"}<Arrow /></span></button></li>)}</ul>}
    </section>

    <button className={s.quest} type="button" onClick={onProgress}><span className={s.questIcon} aria-hidden="true"><SportGlyph sport="Running" size={32} /></span><span className={s.questCopy}><span className={s.eyebrow}>SIDE QUEST: SHOW UP</span><span>Your story starts with a first move.</span></span><span className={s.questPath} aria-hidden="true"><i /><span /><i /><span /><i /><span /><i /></span><span className={s.questAction}>Your movement arc <Arrow /></span></button>
    <footer className={s.footer}><span>LESS SCROLL. MORE PLAY.</span><span>Make a little room for something good. <span aria-hidden="true">↗</span></span></footer>
  </div>;
}
