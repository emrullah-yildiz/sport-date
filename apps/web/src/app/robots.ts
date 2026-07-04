import type { MetadataRoute } from "next";

// Crawl guidance for the live brand domain: index the public marketing/legal
// surface, keep the API and member-only areas out of search results.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/profile", "/discover", "/moderation", "/feedback"],
      },
    ],
    sitemap: "https://keepitup.social/sitemap.xml",
  };
}
