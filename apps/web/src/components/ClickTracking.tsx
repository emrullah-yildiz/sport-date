"use client";

import { useEffect } from "react";

import { trackClick } from "@/lib/track-click";

// Anonymous click instrumentation for SERVER-rendered pages (CX-20260706).
// Server components can't attach onClick, so this tiny client component mounts
// once per page and (a) optionally fires a single page event (e.g.
// "discover_viewed"), and (b) delegates clicks on any element carrying a
// `data-track="event_name"` attribute to the fire-and-forget beacon. The
// listener never preventDefaults, never awaits, and trackClick never throws —
// navigation is untouched whether analytics works or not. Client components
// with their own handlers call trackClick directly instead.
export default function ClickTracking({ pageEvent }: { pageEvent?: string }) {
  useEffect(() => {
    if (pageEvent) trackClick(pageEvent);
    function onClick(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest("[data-track]") : null;
      const name = target?.getAttribute("data-track");
      if (name) trackClick(name);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [pageEvent]);
  return null;
}
