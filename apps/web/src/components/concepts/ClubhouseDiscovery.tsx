"use client";

/* eslint-disable @next/next/no-img-element -- Local concept artwork uses ordinary images for the responsive design preview. */
import { photoSources } from "./concept-assets";
import type { DiscoveryProps } from "./concept-data";
import { Arrow, CourtLines, SportGlyph } from "./ConceptVisuals";
import s from "./clubhouse.module.css";

function LittleSpark({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 80 80" fill="none" aria-hidden="true"><path d="m40 3 5 23 20-14-12 22 24 6-24 6 12 22-20-14-5 23-5-23-20 14 12-22-24-6 24-6-12-22 20 14Z" fill="currentColor" /></svg>;
}

export default function ClubhouseDiscovery({ events, onEvent, onProfile, onProgress }: DiscoveryProps) {
  return <div className={s.page}>
    <section className={s.hero} aria-labelledby="clubhouse-heading">
      <div className={s.heroCopy}>
        <p className={s.kicker}><span /> THE WEEKEND EDITION</p>
        <h1 id="clubhouse-heading">Good plans.<br /><em>New faces.</em></h1>
        <p className={s.intro}>A little sport, a new face.<br />Something to look forward to.</p>
        <a className={s.primary} href="#clubhouse-plans">Find your weekend <Arrow /></a>
        <div className={s.handwritten} aria-hidden="true">
          <svg viewBox="0 0 115 42" fill="none"><path d="M4 33C39 40 71 39 95 13M80 15l18-9-2 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
          <span>Come as you are.</span>
        </div>
      </div>
      <div className={s.editorial}>
        <span className={s.verticalCaption} aria-hidden="true">LESS SMALL TALK. MORE GOOD DAYS.</span>
        <button className={s.portrait} type="button" onClick={onProfile} aria-label="Meet Mara, 28. Open her player profile.">
          <div className={s.photoWindow}><img src={photoSources[2] ?? photoSources[0]} alt="Mara enjoying a coffee after a game" /></div>
          <span className={s.portraitCaption}><span>Mara, 28 <small>Tennis, then coffee.</small></span><span className={s.portraitArrow}><Arrow /></span></span>
        </button>
        <div className={s.note} aria-hidden="true"><span>WEEKEND RULE No. 1</span><p>More rallies.<br /><em>Fewer maybes.</em></p><LittleSpark /></div>
        <span className={s.sticker} aria-hidden="true">GOOD<br />SPORTS<br /><small>GOOD PEOPLE</small></span>
      </div>
    </section>

    <section id="clubhouse-plans" className={s.plans} aria-labelledby="clubhouse-plans-heading">
      <header className={s.sectionHeader}><div><p className={s.kicker}>A FEW GOOD REASONS TO GET OUT</p><h2 id="clubhouse-plans-heading">Put a little play in your diary.</h2></div><span className={s.edition}>Bucharest <span>↗</span></span></header>
      {events.length ? <ul className={s.tickets}>{events.map((event, index) => <li key={event.id}>
        <button className={`${s.ticket} ${s[`ticket${event.sport}`]}`} type="button" onClick={() => onEvent(event)}>
          <span className={s.ticketArt} aria-hidden="true"><span className={s.ticketSport}>{event.sport}</span><span className={s.ticketNumber}>0{index + 1}</span><SportGlyph sport={event.sport} size={76} /><CourtLines className={s.ticketCourt} /></span>
          <span className={s.ticketBody}><span className={s.ticketTime}>{event.day} <span>·</span> {event.time}</span><span className={s.ticketTitle}>{event.title}</span><span className={s.ticketArea}>{event.area} <span>·</span> {event.level}</span></span>
          <span className={s.ticketStub}><span>{event.places} {event.places === 1 ? "place" : "places"} at the table</span><span className={s.ticketLink}>Take a look <Arrow /></span></span>
        </button>
      </li>)}</ul> : <div className={s.empty}><LittleSpark /><h3>A little room in the diary.</h3><p>No plans in this selection. Try another sport.</p></div>}
    </section>

    <button className={s.progress} type="button" onClick={onProgress}>
      <span className={s.stamp} aria-hidden="true"><LittleSpark /><span>PLAY<br />A LITTLE</span></span>
      <span className={s.progressCopy}><span className={s.kicker}>YOUR LITTLE BOOK OF GOOD DAYS</span><span className={s.progressTitle}>Every good ritual starts somewhere.</span></span>
      <span className={s.progressLink}>Your movement arc <Arrow /></span>
    </button>
    <footer className={s.footer}><span>Some plans are better together.</span><LittleSpark /><span>See you out there.</span></footer>
  </div>;
}
