"use client";

/* eslint-disable @next/next/no-img-element -- Local fictional concept images. */
import { useEffect, useRef, useState } from "react";
import PreviewLanding from "./PreviewLanding";
import PreviewAuth, { type DemoProfile } from "./PreviewAuth";
import CreateGame from "./CreateGame";
import PlayMapDiscovery, { initialMapDiscovery } from "../concepts/PlayMapDiscovery";
import { destinations, mapGames, type MapGame } from "../concepts/play-map-data";
import { Arrow, SportGlyph } from "../concepts/ConceptVisuals";
import { courtSource, photoSources } from "../concepts/concept-assets";
import { cyclePhoto, person } from "../concepts/concept-data";
import { draftToGame, initialGameDraft, joinOutcome, maySeeMeetingPoint, type PreviewRequest } from "./preview-model";
import { patchLandingFilters } from "./landing-filter";
import s from "./website.module.css";

type View = "home" | "discover" | "signin" | "signup" | "create" | "event" | "my-games" | "profile" | "account";
type Intent = { action: "join"; gameId: string } | { action: "create" | "my-games" } | null;
const views: View[] = ["home", "discover", "signin", "signup", "create", "event", "my-games", "profile", "account"];
function shortDate(date: string) { return new Date(date + "T12:00:00Z").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }); }

export default function WebsitePreview() {
  const [view, setView] = useState<View>("home");
  const [viewer, setViewer] = useState<DemoProfile | null>(null);
  const [mapState, setMapState] = useState(initialMapDiscovery);
  const [selectedId, setSelectedId] = useState("rally");
  const [requests, setRequests] = useState<Record<string, PreviewRequest>>({});
  const [hosted, setHosted] = useState<MapGame[]>([]);
  const [nextGameId, setNextGameId] = useState(1);
  const [meetingPoints, setMeetingPoints] = useState<Record<string, string>>({});
  const [draft, setDraft] = useState(initialGameDraft);
  const [draftStarted, setDraftStarted] = useState(false);
  const [intent, setIntent] = useState<Intent>(null);
  const [returningToJoin, setReturningToJoin] = useState(false);
  const [toast, setToast] = useState("");
  const [photo, setPhoto] = useState(0);
  const [confirm, setConfirm] = useState<"withdraw" | "cancel" | null>(null);
  const [safety, setSafety] = useState<"report" | "block" | null>(null);
  const [blockedMara, setBlockedMara] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const main = useRef<HTMLElement>(null);
  const photoTouch = useRef<{ x: number; y: number } | null>(null);
  const allGames = [...hosted, ...mapGames];
  const selected = allGames.find(game => game.id === selectedId) ?? mapGames[0];
  const destination = destinations.find(place => place.id === selected.destinationId)!;
  const ownGame = hosted.some(game => game.id === selected.id);
  const status = viewer ? requests[selected.id] : undefined;
  const privateLocation = maySeeMeetingPoint(Boolean(viewer), ownGame, status);
  const privatePoint = meetingPoints[selected.id] ?? "Fictional meetup: Court A, by the blue entrance";
  const searchGames = blockedMara ? hosted : allGames;

  function focusMain() { requestAnimationFrame(() => { main.current?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: "instant" }); }); }
  function navigate(next: View, gameId = selectedId, keepNotice = false) { setView(next); setConfirm(null); setSafety(null); if (!keepNotice) setToast(""); history.pushState({ previewView: next, gameId }, "", "#" + next); focusMain(); }
  useEffect(() => {
    function back(event: PopStateEvent) { const next = (event.state?.previewView ?? location.hash.slice(1)) as View; setView(views.includes(next) ? next : "home"); if (typeof event.state?.gameId === "string") setSelectedId(event.state.gameId); setConfirm(null); setSafety(null); setToast(""); requestAnimationFrame(() => main.current?.focus()); }
    window.addEventListener("popstate", back); return () => window.removeEventListener("popstate", back);
  }, []);
  function openGame(game: MapGame) { setSelectedId(game.id); setReturningToJoin(false); navigate("event", game.id); }
  function stateFor(game: MapGame) { return hosted.some(value => value.id === game.id) ? "hosting" as const : viewer ? requests[game.id] : undefined; }
  function authenticate(mode: "signin" | "signup", next: Intent = null) { setIntent(next); navigate(mode); }
  function prepareCreate() {
    if (draftStarted) return;
    const place = destinations.find(value => value.id === mapState.filters.destinationId)!;
    setDraft(current => ({ ...current, destinationId: place.id, areaId: place.areas[0].id }));
    setDraftStarted(true);
  }
  function startCreate() { prepareCreate(); if (!viewer) authenticate("signin", { action: "create" }); else navigate("create"); }
  function showMyGames() { if (!viewer) authenticate("signin", { action: "my-games" }); else navigate("my-games"); }
  function join(game: MapGame) {
    if (blockedMara && !hosted.some(value => value.id === game.id)) return;
    const outcome = joinOutcome(Boolean(viewer), game.places, hosted.some(value => value.id === game.id), requests[game.id]);
    if (outcome === "signin") { setSelectedId(game.id); authenticate("signin", { action: "join", gameId: game.id }); return; }
    if (outcome !== "pending" || requests[game.id]) return;
    setRequests(current => ({ ...current, [game.id]: "pending" })); setReturningToJoin(false);
    setToast("Request sent. Waiting for the host.");
  }
  function signedIn(profile: DemoProfile) {
    setViewer(profile); setToast("Welcome, " + profile.name + ".");
    if (intent?.action === "join") { setSelectedId(intent.gameId); setReturningToJoin(true); navigate("event", intent.gameId); }
    else if (intent?.action === "create") navigate("create");
    else if (intent?.action === "my-games") navigate("my-games");
    else navigate("discover");
    setIntent(null);
  }
  function reset() {
    setViewer(null); setRequests({}); setHosted([]); setMeetingPoints({}); setDraft(initialGameDraft); setDraftStarted(false); setIntent(null); setReturningToJoin(false); setBlockedMara(false); setMapState(initialMapDiscovery); setToast(""); setSelectedId("rally"); navigate("home");
  }
  function create() {
    if (!viewer) { authenticate("signin", { action: "create" }); return; }
    const game = draftToGame(draft, "hosted-" + nextGameId); setNextGameId(value => value + 1);
    setHosted(current => [game, ...current]); setMeetingPoints(current => ({ ...current, [game.id]: draft.meetingPoint.trim() }));
    setSelectedId(game.id); setToast("Your game is ready. Let the good company come to you.");
    setMapState(current => ({ ...current, page: 0, filters: { ...initialMapDiscovery.filters, destinationId: game.destinationId, dateFrom: game.date, dateTo: game.date, sport: game.sport } }));
    setDraft(initialGameDraft); setDraftStarted(false); navigate("event", game.id, true);
  }
  function withdraw() { setRequests(current => { const next = { ...current }; delete next[selected.id]; return next; }); setConfirm(null); setToast("You’ve left this plan."); }
  function cancelGame() { setHosted(current => current.filter(game => game.id !== selected.id)); setMeetingPoints(current => { const next = { ...current }; delete next[selected.id]; return next; }); setToast("Game cancelled in this preview."); navigate("my-games", selected.id, true); }
  const context = intent?.action === "join" ? "Next: join " + allGames.find(game => game.id === intent.gameId)?.title : intent?.action === "create" ? "Next: create your game." : undefined;
  const protectedView = ["create", "my-games", "account"].includes(view) && !viewer;
  const shownView = protectedView ? "signin" : view;

  return <div className={s.site} data-surface={shownView === "home" ? "pavilion" : undefined}>
    <div className={s.previewBar}><span>Website preview · fictional games & accounts</span><div><a href="/concepts">Compare concepts</a><button onClick={reset}>Reset preview</button></div></div>
    <header className={s.header}><button className={s.logo} onClick={() => navigate("home")} aria-label="KeepItUp home">keepitup<span>↗</span></button><nav aria-label="Main navigation"><button aria-current={view === "discover" ? "page" : undefined} onClick={() => navigate("discover")}>Find a game</button><button aria-current={view === "create" ? "page" : undefined} onClick={startCreate}>Create a game</button><button aria-current={view === "my-games" ? "page" : undefined} onClick={showMyGames}>My games{viewer && Object.keys(requests).length > 0 && <span className={s.navCount}>{Object.keys(requests).length}</span>}</button></nav><div className={s.accountNav}>{viewer ? <button className={s.avatar} onClick={() => navigate("account")} aria-label="My profile">{viewer.name.slice(0, 1)}</button> : <><button onClick={() => authenticate("signin")}>Sign in</button><button className={s.signupLink} onClick={() => authenticate("signup")}>Sign up</button></>}</div></header>
    {toast && <div className={s.toast} role="status"><span><span aria-hidden="true">✓</span> {toast}</span>{viewer && Object.keys(requests).length > 0 && <button onClick={showMyGames}>View my games <Arrow /></button>}<button aria-label="Dismiss notification" onClick={() => setToast("")}>×</button></div>}
    <main ref={main} tabIndex={-1} className={s.main} data-preview-view={shownView}>
      {shownView === "home" && <PreviewLanding filters={mapState.filters} onFiltersChange={patch => setMapState(current => patchLandingFilters(current, patch))} games={searchGames} showPerson={!blockedMara} onDiscover={() => navigate("discover")} onCreate={startCreate} onEvent={openGame} onJoin={join} joinState={stateFor} />}
      {shownView === "discover" && <div className={s.discovery}><PlayMapDiscovery compact empty={false} state={mapState} onChange={setMapState} games={searchGames} onJoin={join} joinState={stateFor} onEvent={game => openGame(game as MapGame)} onProfile={() => navigate("profile")} onProgress={showMyGames} /></div>}
      {(shownView === "signin" || shownView === "signup") && <PreviewAuth mode={shownView} context={context} onModeChange={mode => navigate(mode)} onComplete={signedIn} onCancel={() => { setIntent(null); navigate("discover"); }} />}
      {shownView === "create" && <CreateGame draft={draft} onChange={setDraft} onCreate={create} onCancel={() => navigate("discover")} />}
      {shownView === "event" && <section className={s.eventPage}>
        <button className={s.back} onClick={() => navigate("discover")}><Arrow back /> All games</button>
        <div className={s.eventGrid}><div className={s.eventPhoto}><img src={selected.sport === "Running" ? photoSources[1] : courtSource} alt="Fictional friends out playing together" /><span><SportGlyph sport={selected.sport} size={24} />{selected.sport} · {selected.level}</span></div>
          <div className={s.eventBody}><p className={s.eyebrow}>{destination.city}, {destination.country}</p><h1>{selected.title}</h1><div className={s.facts}><span>{shortDate(selected.date)}<strong>{selected.time}</strong></span><span>{selected.area}<strong>{selected.duration}</strong></span><span>{selected.places} places<strong>{selected.cost === "free" ? "Free" : "Shared cost"}</strong></span></div><p className={s.hint}>Local time in {destination.city} · {selected.language}</p><p className={s.description}>{selected.description}</p>
            {ownGame ? <div className={s.hostLine}><span className={s.avatarSmall}>{viewer?.name.slice(0, 1)}</span><span>Hosted by you<small>Ready for some good company.</small></span></div> : <button className={s.hostLine} onClick={() => { setPhoto(0); navigate("profile"); }}><img src={photoSources[0]} alt="" /><span>Hosted by Mara<small>{person.sports[selected.sport].level} · {person.sports[selected.sport].frequency}</small></span><Arrow /></button>}
            {ownGame ? <div className={s.statusPanel}><h2>Your game is ready.</h2><p>No player requests yet.</p><button className={s.primary} onClick={showMyGames}>Go to my games <Arrow /></button></div> : blockedMara ? <p className={s.statusPanel}>This host is blocked in your preview.</p> : status ? <div className={s.statusPanel} aria-live="polite"><span className={s.statusIcon}>{status === "accepted" ? "✓" : "↗"}</span><h2>{status === "accepted" ? "You’re in." : "Request sent."}</h2><p>{status === "accepted" ? "Your place is confirmed in this demo." : "Waiting for Mara to confirm your place."}</p><button className={s.primary} onClick={showMyGames}>My games <Arrow /></button></div> : <div className={s.joinAction}>{returningToJoin && <p>You’re signed in. Ready to join this game?</p>}<button className={s.primary} onClick={() => join(selected)} disabled={selected.places < 1}><span aria-hidden="true">+</span>{selected.places < 1 ? "Game full" : returningToJoin ? "Send request" : "Join game"}</button><p className={s.hint}>The host confirms your place.</p></div>}
            {privateLocation ? <div className={s.meetingPoint} data-testid="private-meeting-point"><span>Meeting point</span><p>{privatePoint}</p></div> : <p className={s.meetingHint}>Meeting point appears after acceptance.</p>}
            {(ownGame || status) && <div className={s.leaveActions}>{confirm ? <><p>{confirm === "cancel" ? "Cancel this game?" : "Leave this plan?"}</p><button className={s.dangerButton} onClick={confirm === "cancel" ? cancelGame : withdraw}>{confirm === "cancel" ? "Yes, cancel game" : "Yes, leave"}</button><button className={s.textButton} onClick={() => setConfirm(null)}>Keep it</button></> : <button className={s.textButton} onClick={() => setConfirm(ownGame ? "cancel" : "withdraw")}>{ownGame ? "Cancel game" : status === "pending" ? "Withdraw request" : "Leave game"}</button>}</div>}
            {!ownGame && <details className={s.safetyActions}><summary>More options</summary><button onClick={() => { setSafety("report"); setReportReason(""); }}>Report game</button><button onClick={() => setSafety("block")}>Block host</button></details>}
            {safety && <div className={s.safetyPanel}>{safety === "report" ? <><label>Reason<select value={reportReason} onChange={event => setReportReason(event.target.value)}><option value="">Choose a reason</option><option>Misleading game</option><option>Inappropriate behaviour</option><option>Other concern</option></select></label><button disabled={!reportReason} onClick={() => { setSafety(null); setToast("Demo report noted locally. Nothing was sent."); }}>Record demo report</button></> : <><p>Hide Mara’s games in this preview?</p><button onClick={() => { setBlockedMara(true); setRequests({}); setSafety(null); navigate("discover"); setToast("Host blocked in this preview."); }}>Block in preview</button></>}<button onClick={() => setSafety(null)}>Cancel</button></div>}
          </div></div>
      </section>}
      {shownView === "my-games" && <section className={s.myGames}><div className={s.pageHeading}><div><p className={s.eyebrow}>Less planning. More playing.</p><h1>Your next good days.</h1></div><button className={s.secondary} onClick={startCreate}>+ Create a game</button></div>
        {hosted.length + Object.keys(requests).length === 0 ? <div className={s.emptyPlans}><SportGlyph sport="Tennis" size={52} /><h2>A game has your name on it.</h2><p>Find something you’d like to play.</p><button className={s.primary} onClick={() => navigate("discover")}>Find a game <Arrow /></button></div> : <ul className={s.planList}>{allGames.filter(game => hosted.some(own => own.id === game.id) || requests[game.id]).map(game => <li key={game.id} data-plan-id={game.id}><button onClick={() => openGame(game)}><SportGlyph sport={game.sport} size={32} /><span><small>{stateFor(game) === "hosting" ? "Hosting" : requests[game.id] === "accepted" ? "You’re in" : "Requested · waiting for host"}</small><strong>{game.title}</strong><span>{shortDate(game.date)} · {game.time} · {destinations.find(place => place.id === game.destinationId)?.city}</span></span><Arrow /></button></li>)}</ul>}
      </section>}
      {shownView === "profile" && <section className={s.playerPage}><button className={s.back} onClick={() => navigate("event")}><Arrow back /> Back to game</button><div className={s.playerGrid}><div className={s.playerPhoto} onTouchStart={event => { photoTouch.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }; }} onTouchCancel={() => { photoTouch.current = null; }} onTouchEnd={event => { if (!photoTouch.current) return; const dx = event.changedTouches[0].clientX - photoTouch.current.x; const dy = event.changedTouches[0].clientY - photoTouch.current.y; if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) setPhoto(current => cyclePhoto(current, dx < 0 ? 1 : -1, 3)); photoTouch.current = null; }} role="group" aria-label="Mara’s photos" onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); setPhoto(current => cyclePhoto(current, event.key === "ArrowRight" ? 1 : -1, 3)); } }}><img src={photoSources[photo]} alt={["Mara on a tennis court", "Mara out for a run", "Mara enjoying a coffee"][photo]} /><div><button aria-label="Previous photo" onClick={() => setPhoto(current => cyclePhoto(current, -1, 3))}><Arrow back /></button><span aria-live="polite">{photo + 1} / 3</span><button aria-label="Next photo" onClick={() => setPhoto(current => cyclePhoto(current, 1, 3))}><Arrow /></button></div></div><div><p className={s.eyebrow}>Good games. Good company.</p><h1>Mara, 28</h1><p>{person.bio}</p><div className={s.profileChips}>{person.interests.map(interest => <span key={interest}>{interest}</span>)}</div><div className={s.reviewTicket}><SportGlyph sport={selected.sport} size={30} /><h2>{selected.sport}</h2><p>{person.sports[selected.sport].level} · {person.sports[selected.sport].frequency}</p><small>Self-described</small></div><button className={s.primary} onClick={() => navigate("event")}>Back to game <Arrow /></button></div></div></section>}
      {shownView === "account" && viewer && <section className={s.formPage}><div className={s.formCard}><span className={s.accountAvatar}>{viewer.name.slice(0, 1)}</span><h1>Hi, {viewer.name}.</h1><p className={s.subtle}>{viewer.sport} · {viewer.level}</p><div className={s.reviewTicket}><h2>Your next chapter</h2><p>Pick a game. The memories come after.</p><button className={s.primary} onClick={showMyGames}>My games <Arrow /></button></div><button className={s.textButton} onClick={reset}>Sign out</button><p className={s.hint}>Signing out clears this demo session.</p></div></section>}
    </main>
    <footer className={s.footer}><span>keepitup ↗<small>A little sport. A good connection.</small></span><button onClick={() => navigate("discover")}>Find your next game <Arrow /></button><small>Concept edition · 18+</small></footer>
    {viewer && status === "pending" && view === "event" && <details className={s.simulation}><summary>Preview actions</summary><p>Try what happens when the host accepts.</p><button onClick={() => { setRequests(current => ({ ...current, [selected.id]: "accepted" })); setToast("Host acceptance simulated."); }}>Simulate host acceptance</button></details>}
  </div>;
}
