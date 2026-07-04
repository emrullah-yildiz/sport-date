import type { MetadataRoute } from "next";

// Public, unauthenticated routes only — the member area is intentionally
// excluded (see robots.ts). Emits absolute keepitup.social URLs via a single
// origin constant so the sitemap and canonical stay in lockstep.
const ORIGIN = "https://keepitup.social";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; priority: number }> = [
    { path: "/landing", priority: 1 },
    { path: "/signup", priority: 0.9 },
    { path: "/login", priority: 0.5 },
    { path: "/trust", priority: 0.7 },
    // Canonical targets — /safety-guidelines and /hosting-guidelines are 308
    // redirects into these pages, so the sitemap emits the destinations.
    { path: "/safety", priority: 0.6 },
    { path: "/hosting", priority: 0.6 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${ORIGIN}${path}`,
    changeFrequency: "weekly",
    priority,
  }));
}
