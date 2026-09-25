"use client";

/* eslint-disable @next/next/no-img-element -- local fictional concept photography, no remote image requests. */
import { useRef, useState } from "react";
import type { TouchEvent } from "react";
import { Arrow, CourtLines, SportGlyph } from "./ConceptVisuals";
import ClubhouseDiscovery from "./ClubhouseDiscovery";
import PlayMapDiscovery, { initialMapDiscovery } from "./PlayMapDiscovery";
import { destinations, type MapGame } from "./play-map-data";
import { photoSources, courtSource } from "./concept-assets";
import { cyclePhoto, events, milestones, nextRequestState, person, themes, visibleEvents } from "./concept-data";
import type { ConceptEvent, RequestState, Sport, ThemeId, ViewId } from "./concept-data";
import s from "./studio.module.css";

const sports: Sport[] = ["Tennis", "Running", "Padel"];
type Scenario = "normal" | "no-photo" | "long-name" | "empty";
type Note = { fun: string; clarity: string; comment: string };
const emptyNote: Note = { fun: "", clarity: "", comment: "" };

function PhotoCarousel({ missing = false, name = person.name }: { missing?: boolean; name?: string }) {
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<string[]>([]);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const change = (step: number) => setIndex(i => cyclePhoto(i, step, photoSources.length));
  const unavailable = missing || failed.includes(photoSources[index]);
  function touchEnd(event: TouchEvent<HTMLDivElement>) {
    if (!touch.current) return;
    const dx = event.changedTouches[0].clientX - touch.current.x;
    const dy = event.changedTouches[0].clientY - touch.current.y;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) change(dx < 0 ? 1 : -1);
    touch.current = null;
  }
  return <div className={s.photoCarousel} role="group" aria-label={`${name}'s photos`}
    onKeyDown={event => { if (!missing && ["ArrowLeft", "ArrowRight"].includes(event.key)) { event.preventDefault(); change(event.key === "ArrowLeft" ? -1 : 1); } }}
    onTouchStart={event => { touch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchEnd={touchEnd}>
    {unavailable ? <div className={s.photoFallback}><span>m.</span><p>{missing ? "A little camera shy." : "Photo unavailable"}</p></div> : <img src={photoSources[index]} alt={[`${name} on a sunny tennis court`, `${name} out for a park run`, `${name} enjoying a coffee after playing`][index]} onError={() => setFailed(values => [...values, photoSources[index]])} draggable={false} />}
    <span className={s.photoEdition}>KeepItUp • Player edition</span>
    {!missing && <><div className={s.photoControls}><button type="button" aria-label="Previous photo" onClick={() => change(-1)}><Arrow back /></button><button type="button" aria-label="Next photo" onClick={() => change(1)}><Arrow /></button></div><span className={s.photoCounter} aria-live="polite" aria-atomic="true">{index + 1} / {photoSources.length}</span></>}
  </div>;
}

function PlayerCard({ sport, setSport, scenario, expanded = false, finish = 1 }: { sport: Sport; setSport: (sport: Sport) => void; scenario: Scenario; expanded?: boolean; finish?: number }) {
  const [flipped, setFlipped] = useState(false);
  const name = scenario === "long-name" ? "Mara Alexandra" : person.name;
  const details = person.sports[sport];
  return <article className={`${s.playerCard} ${expanded ? s.expandedPlayer : ""}`} aria-label={`${name}'s player card`} data-finish={finish}>
    <div className={s.cardRim}><span>KIU / 028</span><span>{sport} series <SportGlyph sport={sport} size={16} /></span></div>
    {!flipped ? <div key="front" className={s.cardFace}>
      <PhotoCarousel name={name} missing={scenario === "no-photo"} />
      <div className={s.playerInfo}><div className={s.playerName}><h2>{name}<span>, {person.age}</span></h2><button className={s.flipButton} onClick={() => setFlipped(true)} aria-label="Flip card to interests">↻</button></div><p>{person.city} <span>·</span> Here for good company</p>
        <div className={s.cardSports} aria-label="Choose card sport">{sports.map(value => <button key={value} aria-pressed={sport === value} onClick={() => setSport(value)}>{value}</button>)}</div>
        <div className={s.attributes}><div><span>Self-described level</span><strong>{details.level}</strong><div className={s.skillSegments} aria-hidden="true">{[1, 2, 3].map(n => <i key={n} data-filled={n <= details.segments} />)}</div></div><div><span>Play rhythm</span><strong>{details.frequency}</strong><small>{details.style}</small></div></div>
      </div>
    </div> : <div key="back" className={`${s.cardFace} ${s.cardBack}`}><span className={s.backNumber}>028</span><p className={s.kicker}>The other side of {person.name}</p><h2>One more<br /><em>game?</em></h2><p className={s.bio}>{person.bio}</p><div className={s.interests}>{person.interests.map(interest => <span key={interest}>{interest}</span>)}</div><div className={s.backPrompt}><span>After the game you’ll find me…</span><p>Debating where the best flat white is.</p></div><button className={s.textButton} onClick={() => setFlipped(false)}>Back to photos <Arrow /></button></div>}
    <div className={s.cardFoot}><span>Play your own game.</span><span aria-hidden="true">✳</span></div>
  </article>;
}

function EventTicket({ event, onClick }: { event: ConceptEvent; onClick: () => void }) {
  return <button className={s.eventTicket} onClick={onClick}><div className={s.ticketIcon} data-sport={event.sport}><SportGlyph sport={event.sport} size={34} /></div><div className={s.ticketContent}><span>{event.day} · {event.time}</span><h3>{event.title}</h3><p>{event.area} <span>·</span> {event.sport}</p></div><div className={s.ticketEnd}><span>{event.places} {event.places === 1 ? "place" : "places"}</span><Arrow /></div></button>;
}

function CardsDiscovery({ items, onEvent, onProfile, sport, setSport, scenario }: { items: ConceptEvent[]; onEvent: (event: ConceptEvent) => void; onProfile: () => void; sport: Sport; setSport: (sport: Sport) => void; scenario: Scenario }) {
  return <div className={s.cardsDiscovery}><section className={s.cardsHero}><div className={s.heroCopy}><span className={s.locationLabel}><i /> Bucharest · The weekend is yours</span><h1>Find your<br /><em>next rally.</em></h1><p>Good games. New faces.<br />A reason to get out there.</p><button className={s.primary} onClick={() => document.getElementById("concept-games")?.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" })}>Find a game <Arrow /></button><div className={s.heroSignature}><span aria-hidden="true">↗</span><span>Come for the sport.<br />Stay for the people.</span></div></div><div className={s.cardStage}><div className={s.cardStageCourt}><CourtLines /></div><div className={s.underCard} /><div className={s.heroPlayer}><PlayerCard sport={sport} setSport={setSport} scenario={scenario} /></div><button className={s.stageSticker} onClick={onProfile}>Your next<br /><em>teammate.</em><Arrow /></button><span className={s.cardStageCaption}>A little skill. A lot of personality.</span></div><button className={s.mobileMeet} onClick={onProfile}><img src={photoSources[0]} alt="" /><span>Mara, 28<small>Tennis, coffee & good company</small></span><Arrow /></button></section>
    <section id="concept-games" className={s.gameSection}><div className={s.sectionHeading}><h2>On the cards.</h2><span>A small plan. A good start.</span></div>{items.length ? <div className={s.ticketGrid}>{items.map(event => <EventTicket key={event.id} event={event} onClick={() => onEvent(event)} />)}</div> : <div className={s.emptyState}><h3>No games in this view.</h3><p>Try another sport or come back for the next line-up.</p></div>}</section>
  </div>;
}

function ProfileView({ sport, setSport, scenario, theme, onEvent, finish, eventContext }: { sport: Sport; setSport: (sport: Sport) => void; scenario: Scenario; theme: ThemeId; onEvent: () => void; finish: number; eventContext: boolean }) {
  return <section className={s.profileView}><div className={s.profileCardWrap}><PlayerCard key={theme} expanded sport={sport} setSport={setSport} scenario={scenario} finish={finish} /></div><div className={s.profileIntro}><p className={s.kicker}>{theme === "clubhouse" ? "A face from the club" : theme === "map" ? "Player profile / 028" : "Meet your next teammate"}</p><h1>{theme === "clubhouse" ? <>A good game.<br /><em>Better company.</em></> : theme === "map" ? <>Your people.<br /><em>Your pace.</em></> : <>More than<br /><em>a profile.</em></>}</h1><p className={s.profileLead}>Tennis, coffee, and saying yes to a new plan.</p><div className={s.profileInterests}>{person.interests.map(interest => <span key={interest}>{interest}</span>)}</div><button className={s.primary} onClick={onEvent}>{theme === "map" ? (eventContext ? "Back to the " : "Find a ") + sport.toLowerCase() + " game" : "See the " + sport.toLowerCase() + " plan"} <Arrow /></button></div></section>;
}

function EventView({ event, status, onRequest, onProfile, onDiscover, onProgress }: { event: ConceptEvent; status: RequestState; onRequest: () => void; onProfile: () => void; onDiscover: () => void; onProgress: () => void }) {
  const stages = ["Requested", "Accepted", "Played"];
  const travel = "destinationId" in event ? event as MapGame : null;
  const destination = travel ? destinations.find(place => place.id === travel.destinationId) : null;
  const stage = ["idle", "pending", "accepted", "played"].indexOf(status) - 1;
  return <section className={s.eventView}><button className={s.backLink} onClick={onDiscover}><Arrow back /> All games</button><div className={s.eventDetailGrid}><div className={s.eventArtwork}><img src={event.sport === "Running" ? photoSources[1] : courtSource} alt={event.sport === "Running" ? "Fictional runner in a sunlit park" : "Fictional friends enjoying a sunlit racket-sport court"} /><div className={s.eventArtworkTag}><SportGlyph sport={event.sport} size={30} /><span>{event.sport}<small>{event.level}</small></span></div><span className={s.eventArtworkEdition}>Make a little room for play.</span></div><div className={s.eventDetails}><span className={s.kicker}>{event.day} club / {event.sport}</span><h1>{event.title}</h1>{travel && destination && <p className={s.travelContext}>{destination.city}, {destination.country} · {travel.date}<br />Local time · {destination.timezoneLabel} · {travel.language} · {travel.cost === "free" ? "Free" : "Shared cost"}</p>}<div className={s.eventFacts}><span>{event.day}<strong>{event.time}</strong></span><span>{event.area}<strong>{event.duration}</strong></span><span>Join the game<strong>{event.places} {event.places === 1 ? "place" : "places"} open</strong></span></div><p className={s.eventDescription}>{event.description}</p><button className={s.hostLink} onClick={onProfile}><img src={photoSources[0]} alt="" /><span>Say hello to Mara<small>{person.sports[event.sport].level} · {person.sports[event.sport].frequency}</small></span><Arrow /></button>
      {status === "idle" ? <><button className={s.primary} onClick={onRequest} disabled={event.places === 0}>{event.places === 0 ? "This game is full" : "Request to join"} <Arrow /></button><p className={s.contextNote}>{event.places === 0 ? "Try another plan with a place available." : "Mara will confirm your place."}</p></> : <div className={s.requestPanel} aria-live="polite"><span className={s.statusSymbol} aria-hidden="true">{status === "played" ? "✳" : "✓"}</span><h2>{status === "pending" ? "You’re on the list." : status === "accepted" ? "You’re in. See you there." : "That’s a good day, saved."}</h2><p>{status === "pending" ? "Request sent. Your place is waiting for Mara’s confirmation." : status === "accepted" ? "Your place is confirmed. This is a fictional preview event." : "Attendance recorded in this demo. Your private progress has a new memory."}</p><ol className={s.journeyTrack}>{stages.map((label, i) => <li key={label} data-done={i <= stage} aria-current={i === stage ? "step" : undefined}><span>{i <= stage ? "✓" : i + 1}</span>{label}</li>)}</ol><button className={s.primary} onClick={status === "played" ? onProgress : onDiscover}>{status === "played" ? "See my progress" : "Back to discovery"}<Arrow /></button></div>}
      <details className={s.eventMore}><summary>A little more about the plan <span>+</span></summary><p>{event.sport === "Running" ? "Bring water, comfortable shoes, and your own pace." : "Bring your racket if you have one, water, and your own pace."} The exact meeting point is shared after acceptance.</p><div className={s.moreActions}><button onClick={() => alert("Preview only: in the product, this opens the event report form.")}>Report this event</button><button onClick={() => alert("Preview only: in the product, this opens the block confirmation.")}>Block host</button></div></details>
    </div></div></section>;
}

function ProgressView({ theme, count, onDiscover, onFinish, finish }: { theme: ThemeId; count: number; onDiscover: () => void; onFinish: (count: number) => void; finish: number }) {
  const current = [...milestones].reverse().find(m => count >= m.count);
  return <section className={s.progressView}><div className={s.progressHeading}><span className={s.kicker}>Just for you · Your movement arc</span><h1>{theme === "clubhouse" ? <>A few good<br /><em>days, collected.</em></> : theme === "map" ? <>Look how far<br /><em>you’ve played.</em></> : <>Good games.<br /><em>Great memories.</em></>}</h1><p>{count} shared activities. {current?.title ?? "Your first move is ahead."}.</p></div><div className={s.progressCollection} data-style={theme} aria-label="Private participation milestones">{milestones.map((milestone, index) => {
    const reached = count >= milestone.count;
    return <article key={milestone.count} className={s.milestone} data-reached={reached}><div className={s.milestoneArt}><SportGlyph sport={sports[index % sports.length]} size={64} /><span>{String(milestone.count).padStart(2, "0")}</span></div><div className={s.milestoneInfo}><span>{reached ? "Collected" : `${milestone.count} activities`}</span><h2>{milestone.title}</h2><p>{theme === "cards" ? milestone.reward : theme === "clubhouse" ? ["Your first stamp", "A new ritual", "Good company", "Part of the neighbourhood"][index] : ["First destination", "A path of your own", "Finding your people", "Your local orbit"][index]}</p>{theme === "cards" && <button className={s.finishButton} disabled={!reached} aria-pressed={finish === milestone.count} onClick={() => onFinish(milestone.count)}>{reached ? `Use ${milestone.reward}` : `Unlock at ${milestone.count}`}<Arrow /></button>}</div></article>;
  })}</div><div className={s.progressFoot}><p>Built from activities you’ve attended.<br />A collection at your own pace.</p><button className={s.primary} onClick={onDiscover}>Find my next game <Arrow /></button></div></section>;
}

export default function ConceptStudio() {
  const [theme, setTheme] = useState<ThemeId>("map");
  const [view, setView] = useState<ViewId>("discover");
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [profileFromEvent, setProfileFromEvent] = useState(false);
  const [mapState, setMapState] = useState(initialMapDiscovery);
  const [filter, setFilter] = useState<Sport | "All">("All");
  const [sport, setSport] = useState<Sport>("Tennis");
  const [selectedEvent, setSelectedEvent] = useState<ConceptEvent>(events[0]);
  const [requests, setRequests] = useState<Record<string, RequestState>>({});
  const [scenario, setScenario] = useState<Scenario>("normal");
  const [milestonePreview, setMilestonePreview] = useState<number | null>(null);
  const [selectedFinish, setSelectedFinish] = useState(1);
  const [notesOpen, setNotesOpen] = useState(false);
  const [notes, setNotes] = useState<Record<ThemeId, Note>>({ cards: { ...emptyNote }, clubhouse: { ...emptyNote }, map: { ...emptyNote } });
  const contentRef = useRef<HTMLDivElement>(null);
  const status = requests[selectedEvent.id] ?? "idle";
  const progress = milestonePreview ?? 2 + Object.values(requests).filter(value => value === "played").length;
  const availableFinish = progress >= selectedFinish ? selectedFinish : 0;
  const activeTheme = themes.find(value => value.id === theme)!;
  const items = visibleEvents(filter, scenario === "empty");
  function navigate(next: ViewId) { if (next === "profile") setProfileFromEvent(view === "event"); setView(next); requestAnimationFrame(() => { contentRef.current?.focus({ preventScroll: true }); contentRef.current?.scrollIntoView({ block: "start" }); }); }
  function openEvent(event: ConceptEvent) { setSelectedEvent(event); setSport(event.sport); navigate("event"); }
  function openProfilePlan() {
    if (theme !== "map") { openEvent(events.find(event => event.sport === sport)!); return; }
    if (profileFromEvent && "destinationId" in selectedEvent && selectedEvent.destinationId === mapState.filters.destinationId && selectedEvent.sport === sport) { openEvent(selectedEvent); return; }
    setMapState(current => ({ ...current, filters: { ...current.filters, sport }, page: 0 })); navigate("discover");
  }
  function advance(action: "request" | "accept" | "attend" | "reset") { setRequests(values => ({ ...values, [selectedEvent.id]: nextRequestState(values[selectedEvent.id] ?? "idle", action) })); setMilestonePreview(null); }
  function setNote(key: keyof Note, value: string) { setNotes(all => ({ ...all, [theme]: { ...all[theme], [key]: value } })); }
  function downloadNotes() {
    const text = themes.map(value => `${value.name}\nFun: ${notes[value.id].fun || "Not rated"}/5\nClarity: ${notes[value.id].clarity || "Not rated"}/5\n${notes[value.id].comment || "No notes"}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([`KeepItUp concept review — local notes\n\n${text}`], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = "keepitup-concept-review.txt"; link.click(); URL.revokeObjectURL(url);
  }
  return <div className={s.studio}>
    <header className={s.studioHeader}><div className={s.studioLabel}><span className={s.studioMark}>k.</span><div>KeepItUp<span>Design playground</span></div></div><div className={s.themeTabs} role="group" aria-label="Design theme">{themes.map(value => <button key={value.id} aria-pressed={theme === value.id} onClick={() => setTheme(value.id)}><span>{value.number}</span>{value.name}</button>)}</div><button className={s.notesButton} onClick={() => setNotesOpen(value => !value)} aria-expanded={notesOpen}>Review notes <span>↗</span></button></header>
    <div className={s.studioToolbar}><span className={s.previewLabel}><i /> Fictional people & activities · Local preview</span><div className={s.deviceButtons} role="group" aria-label="Preview device"><button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>Desktop</button><button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>Mobile</button></div><label className={s.scenarioLabel}>Try a state<select aria-label="Preview state" value={scenario} onChange={event => setScenario(event.target.value as Scenario)}><option value="normal">Default</option><option value="no-photo">No photo</option><option value="long-name">Long name</option><option value="empty">No events</option></select></label></div>
    {notesOpen && <section className={s.reviewPanel} aria-label="Concept review notes"><div><h2>{activeTheme.name}</h2><p>Can you find a game, read a player card, and understand what happens after requesting?</p></div>{(["fun", "clarity"] as const).map(key => <label key={key}>{key === "fun" ? "Feels fun" : "Easy to understand"}<select value={notes[theme][key]} onChange={event => setNote(key, event.target.value)}><option value="">Not rated</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} / 5</option>)}</select></label>)}<label>What would you change?<textarea maxLength={2000} value={notes[theme].comment} onChange={event => setNote("comment", event.target.value)} placeholder="Your notes stay in this tab." /></label><button onClick={downloadNotes}>Download all notes <Arrow /></button></section>}
    <div className={`${s.deviceFrame} ${device === "mobile" ? s.mobileFrame : ""}`}><div ref={contentRef} tabIndex={-1} className={s.surface} data-theme={theme} data-view={view}>
      <nav className={s.productNav} aria-label="Concept navigation"><button className={s.wordmark} onClick={() => navigate("discover")}>keepitup<span aria-hidden="true">↗</span></button><div>{(["discover", "profile", "progress"] as const).map(value => <button key={value} aria-current={view === value ? "page" : undefined} onClick={() => navigate(value)}>{value === "discover" ? "Find a game" : value === "profile" ? "Player card" : "My progress"}</button>)}</div><button className={s.navAvatar} onClick={() => navigate("profile")} aria-label="Open Mara’s player card"><img src={photoSources[0]} alt="" /></button></nav>
      {view === "discover" && theme !== "map" && <div className={s.discoveryFilters}><span>What’s your game?</span><div role="group" aria-label="Filter activities">{(["All", ...sports] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value !== "All" && <SportGlyph sport={value} size={17} />}{value === "All" ? "Anything goes" : value}</button>)}</div></div>}
      <main>{view === "discover" ? theme === "cards" ? <CardsDiscovery items={items} onEvent={openEvent} onProfile={() => navigate("profile")} sport={sport} setSport={setSport} scenario={scenario} /> : theme === "clubhouse" ? <ClubhouseDiscovery events={items} onEvent={openEvent} onProfile={() => navigate("profile")} onProgress={() => navigate("progress")} /> : <PlayMapDiscovery empty={scenario === "empty"} state={mapState} onChange={setMapState} onEvent={openEvent} onProfile={() => navigate("profile")} onProgress={() => navigate("progress")} /> : view === "profile" ? <ProfileView eventContext={profileFromEvent && selectedEvent.sport === sport} finish={availableFinish} theme={theme} sport={sport} setSport={setSport} scenario={scenario} onEvent={openProfilePlan} /> : view === "event" ? <EventView event={selectedEvent} status={status} onRequest={() => advance("request")} onProfile={() => navigate("profile")} onDiscover={() => navigate("discover")} onProgress={() => navigate("progress")} /> : <ProgressView theme={theme} count={progress} finish={availableFinish} onFinish={count => { setSelectedFinish(count); navigate("profile"); }} onDiscover={() => navigate("discover")} />}</main>
      <footer className={s.productFooter}><span>More good company. Less small talk.</span><span>KeepItUp © Concept edition</span></footer>
    </div></div>
    <div className={s.previewControls}><span><strong>{activeTheme.number} / {activeTheme.name}</strong> {activeTheme.description}</span>{view === "event" && <div className={s.simulator} aria-label="Journey simulation"><span>Preview next state</span><button disabled={status !== "pending"} onClick={() => advance("accept")}>Host accepts</button><button disabled={status !== "accepted"} onClick={() => advance("attend")}>Event attended</button><button onClick={() => advance("reset")}>Reset</button></div>}{view === "progress" && <label className={s.milestoneSelect}>Preview milestone<select aria-label="Preview milestone" value={milestonePreview ?? "journey"} onChange={event => setMilestonePreview(event.target.value === "journey" ? null : Number(event.target.value))}><option value="journey">From demo journey</option>{[0, 1, 3, 6, 10].map(n => <option key={n} value={n}>{n} activities</option>)}</select></label>}</div>
  </div>;
}
