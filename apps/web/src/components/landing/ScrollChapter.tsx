"use client";

import { useEffect, useRef, type ReactNode } from "react";
import s from "./ScrollChapter.module.css";

const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** One native-scroll chapter. Tall content remains in normal flow; focus reveals every control. */
export default function ScrollChapter({ name, label, opening = false, children }: {
  name: string; label: string; opening?: boolean; children: ReactNode;
}) {
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = root.current;
    const content = stage.current;
    if (!node || !content) return;
    const preference = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 620px)");
    let frame = 0;
    const paint = () => {
      frame = 0;
      const enabled = preference.matches;
      const fits = content.scrollHeight <= window.innerHeight;
      node.dataset.chapterMotion = String(enabled);
      node.dataset.pinned = String(enabled && fits);
      const rect = node.getBoundingClientRect();
      const progress = clamp(-rect.top / Math.max(1, rect.height - window.innerHeight));
      // Unpinned mobile content assembles during entry, before it passes the reader.
      const entry = enabled && fits ? progress : clamp((window.innerHeight - rect.top) / (window.innerHeight * .7));
      const reveal = (start: number, end: number) => !enabled || node.matches(":focus-within") || opening ? 1 : clamp((entry - start) / (end - start));
      node.style.setProperty("--chapter-progress", progress.toFixed(4));
      node.style.setProperty("--assemble-one", reveal(-.1, .16).toFixed(4));
      node.style.setProperty("--assemble-two", reveal(.08, .38).toFixed(4));
      node.style.setProperty("--assemble-three", reveal(.3, .58).toFixed(4));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint); };
    const observer = new ResizeObserver(schedule);
    observer.observe(content);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    node.addEventListener("focusin", schedule);
    node.addEventListener("focusout", schedule);
    preference.addEventListener("change", schedule);
    paint();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      node.removeEventListener("focusin", schedule);
      node.removeEventListener("focusout", schedule);
      preference.removeEventListener("change", schedule);
    };
  }, [opening]);
  return <div ref={root} className={s.chapter} data-scroll-chapter={name} data-opening={opening}>
    <div ref={stage} className={s.stage} data-chapter-stage>
      {!opening && <div className={s.thread} aria-hidden="true"><span>{label}</span><svg viewBox="0 0 800 60" preserveAspectRatio="none"><path pathLength="1" d="M0 30C180 30 170 5 290 20S480 58 580 30S710 30 800 30" /></svg><i /></div>}
      {children}
    </div>
  </div>;
}
