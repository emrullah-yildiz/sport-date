"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import type { Sport } from "../concepts/concept-data";
import { AUTH_LEVELS, AUTH_SPORTS, exampleAuthDraft, newAuthDraft, validateDemoSignIn, validateSignup, validateSignupStep, type AuthDraft, type AuthErrors } from "./auth-rules";
import styles from "./auth.module.css";

export type DemoProfile = { name: string; email: string; sport: Sport; level: string };
export type PreviewAuthProps = {
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
  onComplete: (profile: DemoProfile) => void;
  onCancel: () => void;
  context?: string;
};

const steps = ["Account", "You", "Your game", "Ready"];
const headings = ["Let’s get you playing.", "A face behind the game.", "What’s your game?", "You’re nearly in."];

export function PreviewAuth({ mode, onModeChange, onComplete, onCancel, context }: PreviewAuthProps) {
  const [draft, setDraft] = useState<AuthDraft>(newAuthDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<AuthErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const signingUp = mode === "signup";

  function update<K extends keyof AuthDraft>(key: K, value: AuthDraft[K]) {
    setDraft(current => ({ ...current, [key]: value }));
    setErrors(current => ({ ...current, [key]: undefined }));
  }

  function changeStep(next: number) {
    setStep(next);
    setErrors({});
    requestAnimationFrame(() => titleRef.current?.focus());
  }

  function showErrors(nextErrors: AuthErrors) {
    setErrors(nextErrors);
    requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = signingUp ? (step === 3 ? validateSignup(draft) : validateSignupStep(draft, step)) : validateDemoSignIn(draft.email, draft.password);
    if (Object.keys(nextErrors).length) {
      showErrors(nextErrors);
      return;
    }
    if (signingUp && step < 3) {
      changeStep(step + 1);
      return;
    }
    // The preview never passes a password or date of birth to its caller.
    onComplete(signingUp ? { name: draft.name.trim(), email: draft.email.trim().toLowerCase(), sport: draft.sport, level: draft.level } : { name: "Alex", email: "alex@example.test", sport: "Tennis", level: "Intermediate" });
  }

  function errorFor(field: keyof AuthDraft) {
    return errors[field] ? <span className={styles.error} role="alert" id={`${id}-${field}-error`}>{errors[field]}</span> : null;
  }

  const fieldState = (field: keyof AuthDraft) => ({ "aria-invalid": Boolean(errors[field]), "aria-describedby": errors[field] ? `${id}-${field}-error` : undefined });

  return <section className={styles.auth} aria-labelledby={`${id}-title`}>
    <div className={styles.topline}>
      <button type="button" className={styles.back} onClick={() => signingUp && step > 0 ? changeStep(step - 1) : onCancel()}><span aria-hidden="true">←</span> Back</button>
      <span className={styles.demo}>Demo account</span>
    </div>

    <div className={styles.panel}>
      {signingUp && <ol className={styles.steps} aria-label="Sign-up progress">{steps.map((label, index) => <li key={label} aria-current={index === step ? "step" : undefined} data-complete={index < step}><span>{index < step ? "✓" : index + 1}</span>{label}</li>)}</ol>}
      <h1 ref={titleRef} tabIndex={-1} id={`${id}-title`}>{signingUp ? headings[step] : "Good to see you."}</h1>
      <p className={styles.subtitle}>{signingUp ? ["A few details. Then find your people.", "Your name is all other players see here.", "A starting point. You can play anything.", "Your next game is waiting."][step] : "Sign in and pick up your next game."}</p>
      {context && <p className={styles.context}><span aria-hidden="true">↗</span> {context}</p>}

      <form ref={formRef} onSubmit={submit} noValidate autoComplete="off" className={styles.form}>
        {(!signingUp || step === 0) && <>
          <button type="button" className={styles.fill} onClick={() => { setDraft(exampleAuthDraft()); setErrors({}); }}>Use demo details <span aria-hidden="true">↗</span></button>
          <p className={styles.hint}>Fictional details only. Nothing is sent or saved.</p>
          <label className={styles.field} htmlFor={`${id}-email`}>Email
            <input id={`${id}-email`} type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} value={draft.email} onChange={event => update("email", event.target.value)} placeholder="alex@example.test" {...fieldState("email")} />
            {errorFor("email")}
          </label>
          <label className={styles.field} htmlFor={`${id}-password`}>Password
            <span className={styles.password}><input id={`${id}-password`} type={showPassword ? "text" : "password"} autoComplete="new-password" value={draft.password} onChange={event => update("password", event.target.value)} placeholder={signingUp ? "At least 10 characters" : "Use the demo details above"} {...fieldState("password")} /><button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button></span>
            {errorFor("password")}
          </label>
        </>}

        {signingUp && step === 1 && <>
          <label className={styles.field} htmlFor={`${id}-name`}>First name
            <input id={`${id}-name`} value={draft.name} maxLength={60} onChange={event => update("name", event.target.value)} placeholder="Alex" {...fieldState("name")} />
            {errorFor("name")}
          </label>
          <label className={styles.field} htmlFor={`${id}-birthDate`}>Date of birth
            <input id={`${id}-birthDate`} type="date" value={draft.birthDate} onChange={event => update("birthDate", event.target.value)} max="2008-09-25" {...fieldState("birthDate")} />
            {errorFor("birthDate")}
            <span className={styles.hint}>18+. Use a fictional date in this preview.</span>
          </label>
        </>}

        {signingUp && step === 2 && <>
          <fieldset className={styles.choices}><legend>Pick a favourite</legend><div>{AUTH_SPORTS.map(sport => <label key={sport}><input type="radio" name={`${id}-sport`} value={sport} checked={draft.sport === sport} onChange={() => update("sport", sport)} {...fieldState("sport")} /><span>{sport === "Tennis" ? "◉" : sport === "Running" ? "↗" : "⊞"} {sport}</span></label>)}</div>{errorFor("sport")}</fieldset>
          <fieldset className={styles.choices}><legend>Your level</legend><div>{AUTH_LEVELS.map(level => <label key={level}><input type="radio" name={`${id}-level`} value={level} checked={draft.level === level} onChange={() => update("level", level)} {...fieldState("level")} /><span>{level}</span></label>)}</div>{errorFor("level")}</fieldset>
          <p className={styles.hint}>Self-described. There’s no test.</p>
        </>}

        {signingUp && step === 3 && <>
          <div className={styles.player}><span className={styles.avatar} aria-hidden="true">{draft.name.trim().slice(0, 1).toUpperCase() || "A"}</span><div><h2>{draft.name.trim()}</h2><p>{draft.sport} · {draft.level}</p></div><button type="button" onClick={() => changeStep(1)} className={styles.edit}>Edit</button></div>
          <label className={styles.check}><input type="checkbox" checked={draft.adultConfirmed} onChange={event => update("adultConfirmed", event.target.checked)} {...fieldState("adultConfirmed")} /><span>I’m 18 or older.</span></label>
          {errorFor("adultConfirmed")}
          <label className={styles.check}><input type="checkbox" checked={draft.demoNoticeAccepted} onChange={event => update("demoNoticeAccepted", event.target.checked)} {...fieldState("demoNoticeAccepted")} /><span>I understand the demo terms and privacy notice.</span></label>
          {errorFor("demoNoticeAccepted")}
          <details className={styles.notice}><summary>Demo terms &amp; privacy</summary><p>This is a fictional walkthrough. No real account is created, no information is sent or saved, and no agreement to a real service is made.</p></details>
        </>}

        <button className={styles.primary} type="submit">{signingUp ? step === 3 ? "Create demo account" : "Continue" : "Sign in to demo"}<span aria-hidden="true">→</span></button>
      </form>

      <p className={styles.switch}>{signingUp ? "Already a player?" : "New here?"} <button type="button" onClick={() => { setErrors({}); setStep(0); onModeChange(signingUp ? "signin" : "signup"); }}>{signingUp ? "Sign in" : "Create an account"}</button></p>
    </div>
  </section>;
}

export default PreviewAuth;
