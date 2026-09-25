"use client";
import { useRef, useState, type FormEvent } from "react";
import { Arrow, SportGlyph } from "../concepts/ConceptVisuals";
import type { Sport } from "../concepts/concept-data";
import { destinations } from "../concepts/play-map-data";
import { gameDraftErrors, type GameDraft } from "./preview-model";
import s from "./website.module.css";

export default function CreateGame({ draft, onChange, onCreate, onCancel }: {
  draft: GameDraft; onChange: (draft: GameDraft) => void; onCreate: () => void; onCancel: () => void;
}) {
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const title = useRef<HTMLHeadingElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const destination = destinations.find(place => place.id === draft.destinationId)!;
  function change(patch: Partial<GameDraft>) { onChange({ ...draft, ...patch }); setErrors({}); }
  function move(next: number) { setStep(next); setErrors({}); requestAnimationFrame(() => title.current?.focus()); }
  function submit(event: FormEvent) {
    event.preventDefault(); const issues = gameDraftErrors(draft, step); setErrors(issues);
    if (Object.keys(issues).length) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()); return; }
    if (step < 2) move(step + 1); else onCreate();
  }
  const field = (name: keyof GameDraft) => ({ "aria-invalid": Boolean(errors[name]), "aria-describedby": errors[name] ? "create-error-" + name : undefined });
  const error = (name: keyof GameDraft) => errors[name] ? <span className={s.error} id={"create-error-" + name} role="alert">{errors[name]}</span> : null;
  return <section className={s.formPage}>
    <button className={s.back} onClick={() => step > 0 ? move(step - 1) : onCancel()}><Arrow back /> Back</button>
    <div className={s.formCard}><ol className={s.steps} aria-label="Create-game progress">{["The game", "Time & place", "Ready"].map((label, i) => <li key={label} aria-current={step === i ? "step" : undefined}><span>{i < step ? "✓" : i + 1}</span>{label}</li>)}</ol>
      <h1 ref={title} tabIndex={-1}>{["Make a little room for play.", "When and where?", "Your game, ready to go."][step]}</h1><p className={s.subtle}>{["Start with a sport and a simple plan.", "Choose a place people can get to.", "One last look. Then let people join."][step]}</p>
      <form ref={form} onSubmit={submit} noValidate className={s.form}>
        {step === 0 && <><fieldset className={s.sportChoices}><legend>Sport</legend>{(["Tennis", "Running", "Padel"] as Sport[]).map(sport => <button key={sport} type="button" aria-pressed={draft.sport === sport} onClick={() => change({ sport })}><SportGlyph sport={sport} size={22} />{sport}</button>)}</fieldset>
          <label>Game name<input value={draft.title} maxLength={80} onChange={event => change({ title: event.target.value })} {...field("title")} />{error("title")}</label>
          <label>Who can play?<select value={draft.level} onChange={event => change({ level: event.target.value as GameDraft["level"] })}><option value="all">All levels welcome</option><option value="beginner">Beginner friendly</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></label></>}
        {step === 1 && <><label>City<select value={draft.destinationId} onChange={event => { const next = destinations.find(place => place.id === event.target.value)!; change({ destinationId: next.id, areaId: next.areas[0].id }); }}>{destinations.map(place => <option key={place.id} value={place.id}>{place.city}, {place.country}</option>)}</select></label>
          <label>Area<select value={draft.areaId} onChange={event => change({ areaId: event.target.value })} {...field("areaId")}>{destination.areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}</select>{error("areaId")}</label>
          <div className={s.twoFields}><label>Date<input type="date" min="2026-09-25" value={draft.date} onChange={event => change({ date: event.target.value })} {...field("date")} />{error("date")}</label><label>Start time<input type="time" value={draft.time} onChange={event => change({ time: event.target.value })} {...field("time")} />{error("time")}</label></div>
          <p className={s.hint}>Local time in {destination.city}.</p>
          <label>Open places<input type="number" inputMode="numeric" min={1} max={12} value={draft.places} onChange={event => change({ places: event.target.value })} {...field("places")} />{error("places")}</label>
          <label>Meeting point<input value={draft.meetingPoint} maxLength={120} onChange={event => change({ meetingPoint: event.target.value })} {...field("meetingPoint")} />{error("meetingPoint")}<small>Only accepted players see this. Use a fictional place.</small></label></>}
        {step === 2 && <><div className={s.reviewTicket}><SportGlyph sport={draft.sport} size={38} /><h2>{draft.title}</h2><p>{draft.sport} · {draft.level === "all" ? "All levels welcome" : draft.level}</p><dl><div><dt>When</dt><dd>{draft.date} · {draft.time}</dd></div><div><dt>Where</dt><dd>{destination.city} · {destination.areas.find(area => area.id === draft.areaId)?.name}</dd></div><div><dt>Places</dt><dd>{draft.places} open · Free · 60 minutes</dd></div><div><dt>Meeting point</dt><dd>{draft.meetingPoint}<small>Visible after you accept a player.</small></dd></div></dl><button className={s.textButton} type="button" onClick={() => move(0)}>Edit game</button></div><p className={s.hint}>Players request a place. You decide who joins.</p>{Object.values(errors).map(message => <p key={message} role="alert" className={s.error}>{message}</p>)}</>}
        <button className={s.primary} type="submit">{step === 2 ? "Create game" : "Continue"}<Arrow /></button>
      </form>
    </div>
  </section>;
}
