"use client";

/**
 * MovementArcStage — client wrapper around the decorative <MovementArcScene/>
 * 3D progression. It owns all the "should we even render WebGL?" decisions so
 * the scene component stays purely about rendering:
 *
 *   - Detects `prefers-reduced-motion` and passes it down (calm static state).
 *   - Detects WebGL support; if unavailable, renders a static CSS poster
 *     instead of a blank/crashing canvas. (The full progress remains available
 *     as accessible text in the parent MovementArc, so no information is lost.)
 *   - Detects compact viewports to render a lighter scene.
 *   - Wraps the canvas in an error boundary so a runtime WebGL failure still
 *     degrades to the poster rather than taking down the page.
 *
 * The whole stage is decorative and marked `aria-hidden` by the parent: the
 * real stage / label / count / next-step copy live as accessible HTML beside
 * it. Space is reserved by the parent's `.movement-arc-stage` so there is no
 * layout shift while the canvas lazy-loads.
 */

import dynamic from "next/dynamic";
import { Component, type ReactNode, useSyncExternalStore } from "react";

import type { ArcNode } from "./MovementArcScene";

const MovementArcScene = dynamic(() => import("./MovementArcScene"), {
  ssr: false,
  loading: () => <StaticPoster />,
});

/** Lightweight CSS-only poster — the WebGL-unavailable / loading fallback. */
function StaticPoster() {
  return (
    <div className="movement-arc-poster" aria-hidden="true">
      <span className="movement-arc-poster-path" />
      <span className="movement-arc-poster-node movement-arc-poster-node--lit" />
      <span className="movement-arc-poster-node movement-arc-poster-node--current" />
      <span className="movement-arc-poster-node movement-arc-poster-node--dim" />
    </div>
  );
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
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

export default function MovementArcStage({
  nodes,
  litFraction,
}: {
  nodes: ArcNode[];
  litFraction: number;
}) {
  // Start with the poster so SSR markup matches the first client paint and the
  // arc space is reserved (no layout shift). We upgrade to WebGL after mount.
  const mounted = useMounted();
  const webgl = useWebGL();
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const compact = useMediaQuery("(max-width: 640px)");

  if (!mounted || !webgl) {
    return <StaticPoster />;
  }

  return (
    <CanvasErrorBoundary fallback={<StaticPoster />}>
      <MovementArcScene
        nodes={nodes}
        litFraction={litFraction}
        reducedMotion={reducedMotion}
        isCompact={compact}
      />
    </CanvasErrorBoundary>
  );
}
