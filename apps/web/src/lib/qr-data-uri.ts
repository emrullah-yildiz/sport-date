// QR-code → SVG data URI for the event poster/story (CX-20260706-poster-share-v2).
//
// Rendered server-side inside the poster's ImageResponse as an <img> data URI —
// the same mechanism as the brand glyph — so no extra request, no client code,
// and no native dependency: `qrcode` is pure JS and its SVG renderer needs no
// canvas. SVG (not PNG) keeps the modules crisp at any poster scale.
//
// PRIVACY: callers pass the value to encode; the poster passes ONLY the public
// invite URL `{canonical}/e/{id}` (see event-poster.ts `posterInviteUrl`).

import QRCode from "qrcode";

/** Dark modules on a light tile — the scannable polarity phone cameras expect. */
export const QR_DARK = "#20262B";
export const QR_LIGHT = "#F1F5F3";

export async function qrSvgDataUri(value: string): Promise<string> {
  const svg = await QRCode.toString(value, {
    type: "svg",
    errorCorrectionLevel: "M",
    // The poster draws its own padded light tile around the code, so no quiet
    // zone here — but the tile's padding MUST stay ≥ 4 modules (it does: 28px
    // on a ~200px code).
    margin: 0,
    color: { dark: QR_DARK, light: QR_LIGHT },
  });
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
