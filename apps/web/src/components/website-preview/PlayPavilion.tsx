"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import type { Sport } from "../concepts/concept-data";
import type { PavilionController, PavilionSport } from "./pavilion-scene";
import s from "./pavilion.module.css";

const mediaQuery = "(prefers-reduced-motion: reduce)";
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(mediaQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}
const getMotion = () => window.matchMedia(mediaQuery).matches;
const serverMotion = () => true;

export function usePavilionReducedMotion() {
  return useSyncExternalStore(subscribeMotion, getMotion, serverMotion);
}

type Point = [number, number, number];
const project = ([x, y, z]: Point) => [450 + (x * 0.77 - z * 0.64) * 57, 348 + (x * 0.32 + z * 0.39 - y * 0.86) * 57];
const path = (points: Point[], close = true) => points.map((point, i) => `${i ? "L" : "M"}${project(point).map(n => n.toFixed(2)).join(",")}`).join(" ") + (close ? "Z" : "");
const ellipse = (rx: number, rz: number, y: number) => path(Array.from({ length: 100 }, (_, i) => [Math.cos(i / 100 * Math.PI * 2) * rx, y, Math.sin(i / 100 * Math.PI * 2) * rz] as Point));

function StaticPavilion({ sport }: { sport: PavilionSport }) {
  const id = useId().replace(/:/g, "");
  const running = sport === "Running";
  const lift = running ? 0.18 : sport === "Tennis" ? 3.45 : sport === "Padel" ? 2.5 : 2.8;
  const rx = running ? 5.35 : 5;
  const rz = running ? 3.2 : 3.5;
  function ribbon(start: number, end: number, underside = false) {
    const edge = (outer: number, reverse: boolean) => Array.from({ length: 81 }, (_, i) => {
      const t = start + (end - start) * (reverse ? 80 - i : i) / 80;
      const rise = Math.pow(Math.max(0, -Math.sin(t)), 1.45);
      const width = 0.36 + rise * 0.57;
      return [(rx + outer * width) * Math.cos(t), 0.18 + lift * rise + outer * rise * 0.17 - (underside && reverse ? 0.15 : 0), (rz + outer * width) * Math.sin(t)] as Point;
    });
    return path([...edge(1, false), ...edge(underside ? 1 : -1, true)]);
  }
  const courtLines: [number, number, number, number][] = [
    [-2.56, -1.5, 2.56, -1.5], [-2.56, 1.5, 2.56, 1.5], [-2.56, -1.5, -2.56, 1.5], [2.56, -1.5, 2.56, 1.5],
    [-2.56, -1.13, 2.56, -1.13], [-2.56, 1.13, 2.56, 1.13], [-1.15, -1.13, -1.15, 1.13], [1.15, -1.13, 1.15, 1.13], [-1.15, 0, 1.15, 0],
  ];
  function person(x: number, z: number, color: string, key: string) {
    const [cx, cy] = project([x, 0.05, z]);
    return <g key={key} transform={`translate(${cx} ${cy})`}><ellipse cy="3" rx="8" ry="3" fill="#254b4b" opacity=".1" /><rect x="-5" y="-21" width="10" height="22" rx="5" fill={color} /><circle cy="-27" r="5" fill="#fffdfa" /></g>;
  }
  return <svg className={s.fallback} data-pavilion-fallback="true" viewBox="0 0 900 650" aria-hidden="true">
    <defs>
      <linearGradient id={`${id}-pearl`} x1="0" y1="0" x2="0.7" y2="1"><stop stopColor="#fff" /><stop offset=".6" stopColor="#f6f7f2" /><stop offset="1" stopColor="#cddbd7" /></linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="#b8c9c5" /><stop offset="1" stopColor="#eef1ed" /></linearGradient>
      <radialGradient id={`${id}-shadow`}><stop stopColor="#78938b" stopOpacity=".19" /><stop offset="1" stopColor="#78938b" stopOpacity="0" /></radialGradient>
      <linearGradient id={`${id}-court`}><stop stopColor="#a0d9ce" /><stop offset="1" stopColor="#83c2b9" /></linearGradient>
    </defs>
    <ellipse cx="452" cy="426" rx="363" ry="143" fill={`url(#${id}-shadow)`} />
    <path d={ellipse(5.62, 4.1, -0.35)} fill="#d9e2dc" />
    <path d={ellipse(5.62, 4.1, -0.19)} fill={`url(#${id}-pearl)`} stroke="#e5ebe5" strokeWidth="1" />
    <path d={ellipse(4.5, 2.89, -0.025)} fill="none" stroke="#c5d7d0" strokeWidth="1" />
    <path d={ellipse(4.28, 2.68, 0)} fill="none" stroke="#9cbdb3" strokeWidth="3" />
    <path d={ribbon(Math.PI, Math.PI * 2, true)} fill={`url(#${id}-edge)`} />
    <path d={ribbon(Math.PI, Math.PI * 2)} fill={`url(#${id}-pearl)`} stroke="#ebefea" strokeWidth=".75" />
    {!running && <g>
      <path d={path([[-2.9, -0.055, -1.77], [2.9, -0.055, -1.77], [2.9, -0.055, 1.77], [-2.9, -0.055, 1.77]])} fill={`url(#${id}-court)`} stroke="#b9ded3" strokeLinejoin="round" strokeWidth="4" />
      {courtLines.map(([x1, z1, x2, z2], i) => <path key={i} d={path([[x1, 0, z1], [x2, 0, z2]], false)} stroke="#fffdfa" strokeWidth="1.4" />)}
      <path d={path([[0, 0, -1.72], [0, 0.58, -1.72], [0, 0.58, 1.72], [0, 0, 1.72]])} fill="#3e6865" opacity=".25" stroke="#3e6865" strokeWidth="1.5" />
      <path d={path([[0, 0.6, -1.72], [0, 0.6, 1.72]], false)} stroke="#fff" strokeWidth="2.5" />
      {person(-1.95, 0.48, "#f78068", "one")}{person(1.95, -0.4, "#8789c6", "two")}
      <circle cx={project([0.95, 0.9, -0.1])[0]} cy={project([0.95, 0.9, -0.1])[1]} r="7" fill="#fc7960" />
      {sport === "Padel" && <g fill="#b4e8df" fillOpacity=".2" stroke="#98bfb7" strokeWidth="1">
        <path d={path([[-2.94, 0, -1.8], [-2.94, 1.18, -1.8], [-2.94, 1.18, 1.8], [-2.94, 0, 1.8]])} />
        <path d={path([[2.94, 0, -1.8], [2.94, 1.18, -1.8], [2.94, 1.18, 1.8], [2.94, 0, 1.8]])} />
        <path d={path([[-2.94, 0, 1.8], [-2.94, 0.85, 1.8], [2.94, 0.85, 1.8], [2.94, 0, 1.8]])} />
      </g>}
    </g>}
    {(running || sport === "All") && [0.5, 0.78, 1.06].map((t, i) => person(Math.cos(t) * 4.28, Math.sin(t) * 2.68, ["#fc7960", "#8789c6", "#405b5b"][i], `runner-${i}`))}
    <path d={ribbon(0, Math.PI, true)} fill={`url(#${id}-edge)`} />
    <path d={ribbon(0, Math.PI)} fill={`url(#${id}-pearl)`} stroke="#eef1eb" strokeWidth=".75" />
  </svg>;
}

/** Decorative 3D is optional. All sport selection and game actions stay in the HTML landing. */
export default function PlayPavilion({ sport, paused }: { sport: "All" | Sport; paused: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<PavilionController | null>(null);
  const latest = useRef({ sport, paused });
  const reducedMotion = usePavilionReducedMotion();
  const [state, setState] = useState<"loading" | "ready" | "fallback">("loading");
  useEffect(() => {
    latest.current = { sport, paused };
    controller.current?.setSport(sport);
    controller.current?.setPaused(paused);
  }, [sport, paused]);

  useEffect(() => {
    if (reducedMotion) return;
    let cancelled = false;
    let instance: PavilionController | null = null;
    // Import only after hydration and the motion preference is known. The SVG is already visible.
    void Promise.resolve().then(async () => {
      if (cancelled) return;
      setState("loading");
      try {
        const { createPavilion } = await import("./pavilion-scene");
        if (cancelled || !host.current) return;
        instance = createPavilion(host.current, {
          ...latest.current,
          onFailure: () => { if (!cancelled) setState("fallback"); },
        });
        controller.current = instance;
        setState("ready");
      } catch {
        instance?.dispose();
        if (!cancelled) setState("fallback");
      }
    });
    return () => {
      cancelled = true;
      instance?.dispose();
      controller.current = null;
    };
  }, [reducedMotion]);

  return <div className={s.pavilion} data-pavilion-state={reducedMotion ? "static" : state} data-sport={sport} data-paused={paused} role="img" aria-label={`A sculptural white sports pavilion, showing ${sport === "All" ? "a court and running loop" : sport.toLowerCase()}`}>
    <StaticPavilion sport={sport} />
    <div ref={host} className={s.canvas} />
  </div>;
}
