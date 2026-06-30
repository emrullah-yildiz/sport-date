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
import { Component, type ReactNode, useSyncExternalStore } from "react";

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

// Hydration-safe "are we on the client yet?" — false on the server and first
// paint, true after hydration, with no in-effect setState cascade.
const subscribeNoop = () => () => {};
function useMounted(): boolean {
  return useSyncExternalStore(subscribeNoop, () => true, () => false);
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

let webglCache: boolean | undefined;
function useWebGL(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => {
      if (webglCache === undefined) webglCache = supportsWebGL();
      return webglCache;
    },
    () => false,
  );
}

function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export default function MovementFieldHero() {
  // Start with the poster so SSR markup matches the first client paint and the
  // hero space is reserved (no layout shift). We upgrade to WebGL after mount.
  const mounted = useMounted();
  const webgl = useWebGL();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const compact = useMediaQuery("(max-width: 640px)");

  if (!mounted || !webgl) {
    return <StaticPoster />;
  }

  return (
    <CanvasErrorBoundary fallback={<StaticPoster />}>
      <MovementField reducedMotion={reducedMotion} isCompact={compact} />
    </CanvasErrorBoundary>
  );
}
