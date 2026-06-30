"use client";

/**
 * MovementFieldHero — client wrapper around the decorative <MovementField/>
 * 3D scene. It owns all the "should we even render WebGL?" decisions so the
 * scene component itself stays purely about rendering:
 *
 *   - Detects `prefers-reduced-motion` and passes it down (calm static state).
 *   - Detects WebGL support; if unavailable, renders the static CSS poster
 *     instead of a blank/crashing canvas.
 *   - Detects compact viewports to render a lighter scene.
 *   - Wraps the canvas in an error boundary so a runtime WebGL failure still
 *     degrades to the poster rather than taking down the page.
 *
 * The whole wrapper is `aria-hidden` and pointer-decorative: the real hero
 * copy and CTAs live as accessible HTML beside it on the landing page.
 */

import dynamic from "next/dynamic";
import { Component, type ReactNode, useEffect, useState } from "react";

const MovementField = dynamic(() => import("./MovementField"), {
  ssr: false,
  loading: () => <StaticPoster />,
});

/** Lightweight CSS-only poster — the WebGL-unavailable / loading fallback. */
function StaticPoster() {
  return (
    <div className="movement-poster" aria-hidden="true">
      <span className="movement-poster-core" />
      <span className="movement-poster-orb movement-poster-orb--1" />
      <span className="movement-poster-orb movement-poster-orb--2" />
      <span className="movement-poster-orb movement-poster-orb--3" />
    </div>
  );
}

class CanvasErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function supportsWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

export default function MovementFieldHero() {
  // Start with the poster so SSR markup matches the first client paint and the
  // hero space is reserved (no layout shift). We upgrade to WebGL after mount.
  const [mounted, setMounted] = useState(false);
  const [webgl, setWebgl] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWebgl(supportsWebGL());

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compactQuery = window.matchMedia("(max-width: 640px)");

    const sync = () => {
      setReducedMotion(motionQuery.matches);
      setCompact(compactQuery.matches);
    };
    sync();

    motionQuery.addEventListener("change", sync);
    compactQuery.addEventListener("change", sync);
    return () => {
      motionQuery.removeEventListener("change", sync);
      compactQuery.removeEventListener("change", sync);
    };
  }, []);

  if (!mounted || !webgl) {
    return <StaticPoster />;
  }

  return (
    <CanvasErrorBoundary fallback={<StaticPoster />}>
      <MovementField reducedMotion={reducedMotion} isCompact={compact} />
    </CanvasErrorBoundary>
  );
}
