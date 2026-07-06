import { ImageResponse } from "next/og";

import { resolveAuthEmailOrigin } from "@/lib/auth-email-content";
import { BRAND_ACCENT, BRAND_BG, BRAND_NAME, BRAND_TEXT, RALLY_GLYPH_PATHS } from "@/lib/brand";
import {
  eventPosterViewFromInvite,
  posterDimensions,
  posterFileName,
  posterFormatFromParam,
  type EventPosterFormat,
  type EventPosterView,
} from "@/lib/event-poster";
import { getPublicEventInvite } from "@/lib/events";
import { qrSvgDataUri } from "@/lib/qr-data-uri";

// GET /e/{id}/poster — the shareable event poster PNG
// (CX-20260705-event-poster-share + CX-20260706-poster-share-v2):
//   - default: 1080×1350 feed post (4:5)
//   - `?format=story`: 1080×1920 story (9:16), tuned for IG/TikTok stories
// Both carry a QR code encoding ONLY the public invite URL `{canonical}/e/{id}`.
//
// ORIGIN: the link label and the QR target derive from the CONFIGURED canonical
// origin (`APP_PUBLIC_ORIGIN` et al via resolveAuthEmailOrigin — the same source
// as email/auth links). The request host is used ONLY when no canonical origin
// is configured, so a request that arrives on a *.vercel.app deployment alias
// still renders the brand domain (owner report 2026-07-06).
//
// PRIVACY: the poster renders ONLY the `EventPosterView` derived from
// `getPublicEventInvite` — the same allowlisted payload as the public page and
// OG card. No venue, address, postal code, coordinate, person, or host free
// text can appear here (see event-poster.ts + ./route.test.tsx), on either
// format, and the QR encodes nothing but the public invite URL. An unknown /
// draft / cancelled / completed event returns a plain 404 with no image and no
// data — never a placeholder that would confirm the id.
//
// RENDERER: Next's built-in ImageResponse (Satori) — the same engine as the
// proven `/e/{id}` opengraph-image, deliberately chosen over piping an SVG
// through sharp: Satori bundles its own font, so the poster renders identically
// on serverless (where librsvg/sharp text rendering depends on system fonts
// that the runtime does not ship), and sharp is not a declared dependency of
// this app (only a hoisted optional dependency of next). The sport emoji is
// rendered via Satori's twemoji grapheme source (fetched + cached per instance);
// the QR is a pure-JS SVG data URI (see qr-data-uri.ts).
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
const QR_TILE = "#F1F5F3";

// The rally-arc mark as an inline SVG data URI — same single source of truth as
// the wordmark and the OG card, so the poster can never drift from the brand.
const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="${RALLY_GLYPH_PATHS.arc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none"/><path d="${RALLY_GLYPH_PATHS.returnArc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none" opacity="0.55"/><circle cx="${RALLY_GLYPH_PATHS.dot.cx}" cy="${RALLY_GLYPH_PATHS.dot.cy}" r="${RALLY_GLYPH_PATHS.dot.r}" fill="${BRAND_ACCENT}"/></svg>`;
const GLYPH_SRC = `data:image/svg+xml,${encodeURIComponent(GLYPH_SVG)}`;

/** Brand header — identical on both formats. */
function BrandRow() {
  return (
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
  );
}

/** The fact pills (when / duration / places) — shared, sized per format. */
function FactPills({ poster, fontSize }: { poster: EventPosterView; fontSize: number }) {
  const facts = [
    { label: poster.whenLine, highlight: true },
    { label: poster.durationLine, highlight: false },
    { label: poster.availabilityLine, highlight: false },
  ].filter((fact) => fact.label);
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 6 }}>
      {facts.map((fact) => (
        <div
          key={fact.label}
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 30px",
            borderRadius: 999,
            fontSize,
            backgroundColor: fact.highlight ? BRAND_ACCENT : SURFACE,
            color: fact.highlight ? BRAND_BG : BRAND_TEXT,
            border: fact.highlight ? "1px solid transparent" : `1px solid ${LINE}`,
          }}
        >
          {fact.label}
        </div>
      ))}
    </div>
  );
}

/** QR on a light tile + "Scan to join" — dark-on-light so cameras lock on fast. */
function QrTile({ qrSrc, size, labelSize }: { qrSrc: string; size: number; labelSize: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      <div
        style={{
          display: "flex",
          padding: 28,
          borderRadius: 28,
          backgroundColor: QR_TILE,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori canvas, not the DOM */}
        <img src={qrSrc} width={size} height={size} alt="" />
      </div>
      <div style={{ display: "flex", fontSize: labelSize, letterSpacing: 4, color: BRAND_ACCENT }}>SCAN TO JOIN</div>
    </div>
  );
}

/** The 4:5 feed post — v1 layout with the QR joining the footer. */
function PostLayout({ poster, qrSrc }: { poster: EventPosterView; qrSrc: string }) {
  return (
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
      <BrandRow />

      {/* The invitation */}
      <div style={{ display: "flex", flexDirection: "column", gap: 30 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            borderRadius: 52,
            backgroundColor: SURFACE,
            border: `1px solid ${LINE}`,
            fontSize: 116,
          }}
        >
          {poster.emoji}
        </div>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 5, color: BRAND_ACCENT }}>{poster.eyebrow}</div>
        <div style={{ display: "flex", fontSize: poster.headline.length > 34 ? 72 : 88, lineHeight: 1.06, color: BRAND_TEXT }}>
          {poster.headline}
        </div>
        <FactPills poster={poster} fontSize={33} />
      </div>

      {/* Honest privacy footer + the link home + the QR into the event */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 40 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 22, maxWidth: 620 }}>
          <div style={{ display: "flex", fontSize: 27, lineHeight: 1.4, color: MUTED }}>{poster.privacyLine}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: BRAND_ACCENT }} />
            <div style={{ display: "flex", fontSize: 32, color: BRAND_ACCENT }}>{poster.linkLabel}</div>
          </div>
          <div style={{ display: "flex", fontSize: 27, color: MUTED }}>the link in this post gets you in</div>
        </div>
        <QrTile qrSrc={qrSrc} size={176} labelSize={22} />
      </div>
    </div>
  );
}

/** The 9:16 story — bigger type, QR prominent, tuned for IG/TikTok stories. */
function StoryLayout({ poster, qrSrc }: { poster: EventPosterView; qrSrc: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        // Extra vertical padding keeps the content clear of story-UI overlays
        // (username chip on top, reply bar at the bottom).
        padding: "150px 76px 170px",
        backgroundColor: BRAND_BG,
        backgroundImage: `radial-gradient(circle at 85% 4%, rgba(59, 234, 126, 0.18), rgba(59, 234, 126, 0) 46%)`,
        color: BRAND_TEXT,
        fontSize: 32,
      }}
    >
      <BrandRow />

      {/* The invitation — story type runs bigger */}
      <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 232,
            height: 232,
            borderRadius: 58,
            backgroundColor: SURFACE,
            border: `1px solid ${LINE}`,
            fontSize: 134,
          }}
        >
          {poster.emoji}
        </div>
        <div style={{ display: "flex", fontSize: 33, letterSpacing: 5, color: BRAND_ACCENT }}>{poster.eyebrow}</div>
        <div style={{ display: "flex", fontSize: poster.headline.length > 34 ? 84 : 102, lineHeight: 1.06, color: BRAND_TEXT }}>
          {poster.headline}
        </div>
        <FactPills poster={poster} fontSize={37} />
      </div>

      {/* Story footer: the QR is the call to action */}
      <div style={{ display: "flex", alignItems: "center", gap: 46 }}>
        <QrTile qrSrc={qrSrc} size={252} labelSize={26} />
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, backgroundColor: BRAND_ACCENT }} />
            <div style={{ display: "flex", fontSize: 36, color: BRAND_ACCENT }}>{poster.linkLabel}</div>
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.4, color: MUTED, maxWidth: 560 }}>{poster.privacyLine}</div>
        </div>
      </div>
    </div>
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const invite = await getPublicEventInvite(eventId);
  // Safe 404: no placeholder poster that would confirm the id, no data.
  if (!invite) return new Response("Not found", { status: 404 });

  const url = new URL(request.url);
  // Canonical configured origin first; the request host ONLY as last resort —
  // never a deployment alias on the poster when the brand origin is configured.
  const origin = resolveAuthEmailOrigin() ?? url.origin;
  const poster = eventPosterViewFromInvite(invite, origin);
  const format: EventPosterFormat = posterFormatFromParam(url.searchParams.get("format"));
  // `?download=1` → attachment disposition, so the fallback download controls
  // save the file even where the anchor `download` hint is ignored.
  const download = url.searchParams.get("download") === "1";
  // The QR encodes ONLY the public invite URL — nothing else rides in it.
  const qrSrc = await qrSvgDataUri(poster.inviteUrl);

  const { width, height } = posterDimensions(format);
  return new ImageResponse(
    format === "story" ? <StoryLayout poster={poster} qrSrc={qrSrc} /> : <PostLayout poster={poster} qrSrc={qrSrc} />,
    {
      width,
      height,
      emoji: "twemoji",
      headers: {
        // Availability on the poster changes as places fill, so cache only briefly.
        "Cache-Control": "public, max-age=300",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${posterFileName(format)}"`,
      },
    },
  );
}
