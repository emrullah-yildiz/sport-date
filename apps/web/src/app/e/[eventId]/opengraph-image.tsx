import { ImageResponse } from "next/og";

import { BRAND_ACCENT, BRAND_BG, BRAND_NAME, BRAND_TEXT, RALLY_GLYPH_PATHS } from "@/lib/brand";
import { getPublicEventInvite } from "@/lib/events";
import { clampPublicText, describePublicInvite } from "@/lib/public-event-invite";

// Dynamic 1200×630 Open Graph / Twitter-card image for the public event invite
// (`/e/{id}` — CX-20260704-growth-shareable-event-invite-og-image). Generated with
// Next's built-in ImageResponse (Satori) — no new dependency.
//
// PRIVACY: the card renders ONLY strings derived from `getPublicEventInvite` /
// `describePublicInvite` — sport, welcomed levels, approximate area, time, honest
// places-left — the same allowlisted payload as the page. No venue, no address,
// no coordinate, no person, no host free text can appear here (see
// public-event-invite.ts and its tests). An unknown/unpublished/cancelled event
// returns a plain 404 with no image and no data.
//
// Brand: anthracite #20262B background, neon green #3BEA7E accents, off-white
// #F1F5F3 type, with the rally-arc mark drawn from the same RALLY_GLYPH_PATHS as
// the in-app wordmark. Availability wording reuses discovery's honest labels —
// no fake scarcity. Satori ships a single regular-weight default font, so the
// hierarchy comes from size, colour, and spacing rather than font weight.

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Static accessible description of what the card shows. The per-event specifics
// live in the page's og:description right next to it.
export const alt = `${BRAND_NAME} event invite — sport, level, approximate area, time and places left. Approximate area only; the exact meeting point stays private until the host accepts.`;

const MUTED = "#A7B4B0";
const SURFACE = "#272E34";
const LINE = "#3A444C";

// The rally-arc mark as an inline SVG data URI, drawn from the single source of
// truth for the glyph geometry so the card can never drift from the brand mark.
const GLYPH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="${RALLY_GLYPH_PATHS.arc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none"/><path d="${RALLY_GLYPH_PATHS.returnArc}" stroke="${BRAND_ACCENT}" stroke-width="${RALLY_GLYPH_PATHS.strokeWidth}" stroke-linecap="round" fill="none" opacity="0.55"/><circle cx="${RALLY_GLYPH_PATHS.dot.cx}" cy="${RALLY_GLYPH_PATHS.dot.cy}" r="${RALLY_GLYPH_PATHS.dot.r}" fill="${BRAND_ACCENT}"/></svg>`;
const GLYPH_SRC = `data:image/svg+xml,${encodeURIComponent(GLYPH_SVG)}`;

export default async function Image({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = await params;
  const invite = await getPublicEventInvite(eventId);
  // Safe 404: no placeholder card that would confirm the id, no data.
  if (!invite) return new Response("Not found", { status: 404 });

  const described = describePublicInvite(invite);
  const headline = clampPublicText(described.headline, 64);
  const eyebrow = clampPublicText(`${invite.sport} · ${described.levels}`, 48).toUpperCase();
  const whenLabel = described.when.day && described.when.time ? `${described.when.day} · ${described.when.time}` : "";
  const facts = [
    { label: whenLabel, highlight: true },
    { label: `${invite.durationMinutes} min`, highlight: false },
    { label: described.availability.label, highlight: false },
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
          padding: "56px 64px",
          backgroundColor: BRAND_BG,
          backgroundImage: `radial-gradient(circle at 88% 8%, rgba(59, 234, 126, 0.16), rgba(59, 234, 126, 0) 55%)`,
          color: BRAND_TEXT,
          fontSize: 28,
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 64,
                height: 64,
                borderRadius: 18,
                backgroundColor: SURFACE,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- Satori canvas, not the DOM */}
              <img src={GLYPH_SRC} width={44} height={44} alt="" />
            </div>
            <div style={{ display: "flex", fontSize: 40, letterSpacing: -1, color: BRAND_TEXT }}>{BRAND_NAME}</div>
          </div>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 6, color: BRAND_ACCENT }}>EVENT INVITE</div>
        </div>

        {/* Invitation */}
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 26, letterSpacing: 4, color: BRAND_ACCENT }}>{eyebrow}</div>
          <div style={{ display: "flex", fontSize: headline.length > 34 ? 58 : 74, lineHeight: 1.08, color: BRAND_TEXT }}>
            {headline}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 8 }}>
            {facts.map((fact) => (
              <div
                key={fact.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 24px",
                  borderRadius: 999,
                  fontSize: 27,
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

        {/* Honest privacy footer */}
        <div style={{ display: "flex", fontSize: 24, lineHeight: 1.35, color: MUTED }}>
          Approximate area only — the exact meeting point is shared after the host accepts.
        </div>
      </div>
    ),
    { ...size },
  );
}
