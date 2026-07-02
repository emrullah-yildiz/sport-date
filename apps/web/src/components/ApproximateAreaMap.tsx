import { approximateAreaCue, type ApproximateAreaInput } from "@/lib/approximate-location";

// A self-contained, privacy-preserving spatial cue for the PUBLIC event-detail
// "Before acceptance" panel (CX-20260630-event-detail-approximate-location-no-spatial-cue).
//
// It renders a soft, stylised ZONE — a diffuse blob under a dashed ring — that reads
// unmistakably as an approximate AREA rather than a pinned point, alongside the existing
// honest text. Privacy guarantees, by construction:
//   - No external tile host / no network: this is inline SVG, drawn from tokens only. The
//     app's CSP blocks external hosts anyway; nothing here would call one.
//   - It plots NO exact venue. The only geographic input is the already-public COARSE
//     centre (0.1° grid) via `approximateAreaCue`, and even that is used solely to seed a
//     decorative in-frame placement — the graphic has no axes, scale, or coordinates a
//     viewer could read a position off of. Deliberately blurred + wide-radius so it can
//     never be reverse-engineered to a point.
//   - Progressive enhancement: the visual is decorative (`role="img"` + text-equivalent
//     `aria-label`) and is never required to complete the journey. With images/SVG off,
//     the sibling honest text still fully communicates the approximate location.
//
// It is a plain server component (no client JS): pure, static, no motion.
export default function ApproximateAreaMap({ areaLabel, city, approximateLatitude, approximateLongitude, viewerArea }: ApproximateAreaInput) {
  const cue = approximateAreaCue({ areaLabel, city, approximateLatitude, approximateLongitude, viewerArea });
  const { cx, cy } = cue.placement;

  return (
    <figure className="approx-area">
      <div className="approx-area-canvas" role="img" aria-label={cue.ariaLabel}>
        <svg viewBox="0 0 100 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="approx-zone-fill" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.42" />
              <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.16" />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {/* Faint, purely decorative "map-ish" grid so the panel reads as a place view.
              It carries no real geography — evenly spaced lines, no labels, no scale. */}
          <g className="approx-area-grid" aria-hidden="true">
            <line x1="0" y1="24" x2="100" y2="24" />
            <line x1="0" y1="48" x2="100" y2="48" />
            <line x1="25" y1="0" x2="25" y2="72" />
            <line x1="50" y1="0" x2="50" y2="72" />
            <line x1="75" y1="0" x2="75" y2="72" />
          </g>
          {/* The approximate ZONE: a soft diffuse fill (region, fading to nothing at its
              edge) under a dashed ring — visibly an area, with no centre marker/pin. */}
          <circle cx={cx} cy={cy} r="30" fill="url(#approx-zone-fill)" />
          <circle
            className="approx-area-ring"
            cx={cx}
            cy={cy}
            r="24"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="1.2"
            strokeDasharray="4 4"
            strokeOpacity="0.7"
          />
        </svg>
        <p className="approx-area-caption" aria-hidden="true">Approximate area</p>
      </div>
    </figure>
  );
}
