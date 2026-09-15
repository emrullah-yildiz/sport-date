"use client";

import { useEffect, useRef } from "react";
import s from "./ScrollStory.module.css";

const chapters = [
  { label: "01 / A LITTLE SPACE", title: <>You have a<br /><em>free afternoon.</em></>, text: "No big plans. Just a little time you would like to make something of." },
  { label: "02 / A REASON TO GO", title: <>That afternoon<br /><em>becomes a plan.</em></>, text: "You find a game that fits your day. A comfortable pace. A reason to get out. You ask to join." },
  { label: "03 / A PLACE FOR YOU", title: <>The host says yes.<br /><em>Your group takes shape.</em></>, text: "After acceptance, the meeting details open. You have a place in a group with a plan in common." },
  { label: "04 / SOMETHING SHARED", title: <>A first rally.<br /><em>A first hello.</em></>, text: "A first rally. A shared laugh. What started as an empty afternoon becomes time spent together." },
];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/** Native scroll drives a single sticky scene; without enhancement it is a compact story. */
export default function ScrollStory() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    const node = section.current;
    if (!node || !window.matchMedia) return;
    const motion = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 620px)");
    let frame = 0;
    let listening = false;
    const paint = () => {
      frame = 0;
      const bounds = node.getBoundingClientRect();
      const progress = clamp(-bounds.top / Math.max(1, bounds.height - window.innerHeight));
      const ramp = (start: number, end: number) => clamp((progress - start) / (end - start));
      const plan = ramp(.12, .36);
      const group = ramp(.47, .70);
      const together = ramp(.73, .92);
      const second = ramp(.18, .28);
      const third = ramp(.43, .53);
      const fourth = ramp(.70, .80);
      const values: Record<string, number> = {
        "story-progress": progress,
        "chapter-one": 1 - second,
        "chapter-two": second * (1 - third),
        "chapter-three": third * (1 - fourth),
        "chapter-four": fourth,
        "plan-built": plan,
        "group-built": group,
        "together": together,
        "guest-one": ramp(.48, .55),
        "guest-two": ramp(.55, .62),
        "guest-three": ramp(.62, .69),
      };
      for (const [key, value] of Object.entries(values)) node.style.setProperty(`--${key}`, value.toFixed(4));
      node.dataset.chapter = progress < .23 ? "1" : progress < .48 ? "2" : progress < .75 ? "3" : "4";
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(paint); };
    const stop = () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.cancelAnimationFrame(frame);
      frame = 0;
      listening = false;
    };
    const configure = () => {
      stop();
      if (motion.matches) {
        node.dataset.motion = "true";
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule, { passive: true });
        listening = true;
        paint();
      } else {
        delete node.dataset.motion;
        delete node.dataset.chapter;
        node.removeAttribute("style");
      }
    };
    configure();
    motion.addEventListener("change", configure);
    return () => {
      if (listening || frame) stop();
      motion.removeEventListener("change", configure);
    };
  }, []);

  return <section ref={section} className={s.story} data-scroll-story aria-label="From free time to good company">
    <div className={s.stage} data-story-stage>
      <div className={s.topline}><span>IT STARTS WITH A LITTLE FREE TIME</span><span aria-hidden="true">ONE AFTERNOON. ONE NEW BEGINNING. ↗</span></div>
      <div className={s.scene}>
        <div className={s.copy}>
          {chapters.map((chapter, index) => <div key={chapter.label} className={s.chapter} data-story-chapter={index + 1}>
            <p className={s.label}>{chapter.label}</p>
            <h2>{chapter.title}</h2>
            <p className={s.description}>{chapter.text}</p>
          </div>)}
        </div>
        <div className={s.art} aria-hidden="true">
          <div className={s.halo} />
          <div className={s.court} data-story-piece="plan">
            <svg viewBox="0 0 420 530" fill="none"><rect pathLength="1" x="24" y="24" width="372" height="482" rx="5" /><path pathLength="1" d="M24 265H396M75 24V506M345 24V506M75 148H345M75 382H345M210 148V382" /><path pathLength="1" className={s.net} d="M10 255H410M10 265H410M10 275H410" /></svg>
            <span className={s.courtWord}>A PLACE TO MEET.</span>
            <span data-story-piece="person-one" className={`${s.person} ${s.personOne}`}><small>YOU</small></span><span data-story-piece="person-two" className={`${s.person} ${s.personTwo}`} />
            <span data-story-piece="person-three" className={`${s.person} ${s.personThree}`} /><span data-story-piece="person-four" className={`${s.person} ${s.personFour}`} />
            <svg className={s.connections} data-story-piece="connections" viewBox="0 0 420 530" fill="none"><path pathLength="1" d="M143 175Q212 155 304 149Q320 240 282 306Q206 365 110 346Q70 258 143 175Z" /></svg>
          </div>
          <div className={s.calendar} data-story-piece="date"><div>YOUR FREE AFTERNOON <span>&#8599;</span></div><strong>A little<br />space.</strong><div className={s.days}>{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <span key={i} className={i === 5 ? s.selectedDay : undefined}>{day}</span>)}</div><p>Something good could start here.</p></div>
          <div className={s.ball}><span /></div>
          <div className={s.keepsake} data-story-keepsake>
            <span className={s.keepsakeLabel}>YOUR AFTERNOON, COMING TOGETHER</span>
            <div className={s.collected}><span>A free day</span><i aria-hidden="true">+</i><span data-story-token="plan">A game</span><i aria-hidden="true">+</i><span data-story-token="group">Good company</span></div>
            <strong className={s.ending}>More than a game.</strong>
          </div>
        </div>
      </div>
      <div className={s.bottomline}><div className={s.progress} aria-hidden="true"><span /><span /><span /><span /></div><a href="#how-it-works">Start your own story <span aria-hidden="true">↘</span></a></div>
    </div>
  </section>;
}
