import { ImageResponse } from "next/og";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { BRAND_ACCENT, BRAND_BG, BRAND_NAME, BRAND_TEXT, RALLY_GLYPH_PATHS } from "@/lib/brand";
import { eventPosterViewFromInvite, POSTER_FILE_NAME, POSTER_HEIGHT, POSTER_WIDTH } from "@/lib/event-poster";
import { getPublicEventInvite } from "@/lib/events";

// GET /e/{id}/poster — the shareable 1080×1350 event poster PNG
// (CX-20260705-event-poster-share). A host taps "Share" and this image rides
// the native share sheet (or a download) into Instagram/WhatsApp/X.
//
// PRIVACY: the poster renders ONLY the `EventPosterView` derived from
// `getPublicEventInvite` — the same allowlisted payload as the public page and
// OG card. No venue, address, postal code, coordinate, person, or host free
// text can appear here (see event-poster.ts + ./route.test.tsx). An unknown /
// draft / cancelled / completed event returns a plain 404 with no image and no
// data — never a placeholder that would confirm the id.
//
// RENDERER: Next's built-in ImageResponse (Satori) — the same engine as the
// proven `/e/{id}` opengraph-image, deliberately chosen over piping an SVG
// through sharp: Satori bundles its own font, so the poster renders identically
// on serverless (where librsvg/sharp text rendering depends on system fonts
// that the runtime does not ship), and sharp is not a declared dependency of
// this app (only a hoisted optional dependency of next). The sport emoji is
// rendered via Satori's twemoji grapheme source (fetched + cached per instance).
//
// Brand: anthracite #20262B, neon green #3BEA7E, off-white #F1F5F3, and the
// rally-arc mark from RALLY_GLYPH_PATHS — mirroring the public pages and the
// OG card. Satori ships a single regular-weight font, so hierarchy comes from
// size, colour, and spacing.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MUTED = "#A7B4B0";
const SURFACE = "#272E34";
const LINE = "#3A444C";

// The rally-arc mark as an inline SVG data URI — same single source of truth as
// the wordmark and the OG card, so the poster can never drift from the brand.
const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="${RALLY_GLYPH_PATHS.arc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none"/><path d="${RALLY_GLYPH_PATHS.returnArc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none" opacity="0.55"/><circle cx="${RALLY_GLYPH_PATHS.dot.cx}" cy="${RALLY_GLYPH_PATHS.dot.cy}" r="${RALLY_GLYPH_PATHS.dot.r}" fill="${BRAND_ACCENT}"/></svg>`;
const GLYPH_SRC = `data:image/svg+xml,${encodeURIComponent(GLYPH_SVG)}`;

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const invite = await getPublicEventInvite(eventId);
  // Safe 404: no placeholder poster that would confirm the id, no data.
  if (!invite) return new Response("Not found", { status: 404 });

  const poster = eventPosterViewFromInvite(invite, resolveAuthEmailOrigin());
  // `?download=1` → attachment disposition, so the fallback "Download poster"
  // control saves the file even where the anchor `download` hint is ignored.
  const download = new URL(request.url).searchParams.get("download") === "1";

  const facts = [
    { label: poster.whenLine, highlight: true },
    { label: poster.durationLine, highlight: false },
    { label: poster.availabilityLine, highlight: false },
  ].filter((fact) => fact.label);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 76px 64px",
          backgroundColor: BRAND_BG,
          backgroundImage: `radial-gradient(circle at 85% 6%, rgba(59, 234, 126, 0.18), rgba(59, 234, 126, 0) 52%)`,
          color: BRAND_TEXT,
          fontSize: 30,
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 72,
                height: 72,
                borderRadius: 20,
                backgroundColor: SURFACE,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori canvas, not the DOM */}
              <img src={GLYPH_SRC} width={50} height={50} alt="" />
            </div>
            <div style={{ display: "flex", fontSize: 46, letterSpacing: -1, color: BRAND_TEXT }}>{BRAND_NAME}</div>
          </div>
          <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, color: BRAND_ACCENT }}>YOU&rsquo;RE INVITED</div>
        </div>

        {/* The invitation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 220,
              height: 220,
              borderRadius: 56,
              backgroundColor: SURFACE,
              border: `1px solid ${LINE}`,
              fontSize: 128,
            }}
          >
            {poster.emoji}
          </div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 5, color: BRAND_ACCENT }}>{poster.eyebrow}</div>
          <div style={{ display: "flex", fontSize: poster.headline.length > 34 ? 74 : 92, lineHeight: 1.06, color: BRAND_TEXT }}>
            {poster.headline}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6 }}>
            {facts.map((fact) => (
              <div
                key={fact.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "16px 30px",
                  borderRadius: 999,
                  fontSize: 33,
                  backgroundColor: fact.highlight ? BRAND_ACCENT : SURFACE,
                  color: fact.highlight ? BRAND_BG : BRAND_TEXT,
                  border: fact.highlight ? "1px solid transparent" : `1px solid ${LINE}`,
                }}
              >
                {fact.label}
              </div>
            ))}
          </div>
        </div>

        {/* Honest privacy footer + the link home */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 27, lineHeight: 1.4, color: MUTED }}>{poster.privacyLine}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: BRAND_ACCENT }} />
            <div style={{ display: "flex", fontSize: 32, color: BRAND_ACCENT }}>{poster.linkLabel}</div>
            <div style={{ display: "flex", fontSize: 27, color: MUTED }}>· the link in this post gets you in</div>
          </div>
        </div>
      </div>
    ),
    {
      width: POSTER_WIDTH,
      height: POSTER_HEIGHT,
      emoji: "twemoji",
      headers: {
        // Availability on the poster changes as places fill, so cache only briefly.
        "Cache-Control": "public, max-age=300",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${POSTER_FILE_NAME}"`,
      },
    },
  );
}
