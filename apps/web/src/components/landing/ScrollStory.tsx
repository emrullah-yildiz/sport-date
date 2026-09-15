"use client";

import { useEffect, useRef } from "react";
import s from "./ScrollStory.module.css";

const chapters = [
  { label: "01 / THE POSSIBILITY", title: <>A little free time.<br /><em>A lot of possibility.</em></>, text: "Start with the day you have free. Find an activity that fits around you." },
  { label: "02 / THE PLAN", title: <>Give your day<br /><em>some play.</em></>, text: "A rally. A run. A walk. Pick your pace, or host something of your own." },
  { label: "03 / THE COMPANY", title: <>Come for the sport.<br /><em>Meet through it.</em></>, text: "Join a small group. Have something to do together. Let hello happen naturally." },
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
      const second = clamp((progress - .2) / .18);
      const third = clamp((progress - .61) / .18);
      node.style.setProperty("--story-progress", progress.toFixed(4));
      node.style.setProperty("--chapter-one", (1 - second).toFixed(4));
      node.style.setProperty("--chapter-two", (second * (1 - third)).toFixed(4));
      node.style.setProperty("--chapter-three", third.toFixed(4));
      node.style.setProperty("--court-turn", `${-24 + progress * 32}deg`);
      node.style.setProperty("--court-scale", `${.78 + progress * .28}`);
      node.style.setProperty("--calendar-y", `${-second * 130}px`);
      node.style.setProperty("--ball-x", `${-90 + progress * 170}%`);
      node.style.setProperty("--ball-y", `${40 - Math.sin(progress * Math.PI) * 170}%`);
      node.dataset.chapter = progress < .29 ? "1" : progress < .7 ? "2" : "3";
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
      <div className={s.topline}><span>MAKE ROOM FOR SOMETHING REAL</span><span aria-hidden="true">TIME WELL SPENT ↗</span></div>
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
          <div className={s.court}>
            <svg viewBox="0 0 420 530" fill="none"><rect x="24" y="24" width="372" height="482" rx="5" /><path d="M24 265H396M75 24V506M345 24V506M75 148H345M75 382H345M210 148V382" /><path className={s.net} d="M10 255H410M10 265H410M10 275H410" /></svg>
            <span className={s.courtWord}>LET’S PLAY.</span>
            <span className={`${s.person} ${s.personOne}`} /><span className={`${s.person} ${s.personTwo}`} />
            <span className={`${s.person} ${s.personThree}`} /><span className={`${s.person} ${s.personFour}`} />
          </div>
          <div className={s.calendar}><div>YOUR NEXT FREE DAY <span>↗</span></div><strong>Wide<br />open.</strong><div className={s.days}>{["M", "T", "W", "T", "F", "S", "S"].map((day, i) => <span key={i} className={i === 5 ? s.selectedDay : undefined}>{day}</span>)}</div><p>A little space for a new plan.</p></div>
          <div className={s.ball}><span /></div>
          <div className={s.companyTag}><span>YOU + GOOD COMPANY</span><strong>Better, together. ↗</strong></div>
          <span className={s.artCaption}>A LITTLE MOVEMENT CHANGES THE DAY.</span>
        </div>
      </div>
      <div className={s.bottomline}><div className={s.progress} aria-hidden="true"><span /><span /><span /></div><a href="#how-it-works">Find your next move <span aria-hidden="true">↘</span></a></div>
    </div>
  </section>;
}
