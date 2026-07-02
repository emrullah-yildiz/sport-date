// Single source of truth for the product brand (name + logo/wordmark).
//
// The product is named **Rally** (owner-delegated rename from "Sport Date",
// decision recorded in `CX-20260702-rebrand-to-rally-name-and-neon-logo`).
// Everything member-facing — page navs, metadata titles, the landing hero,
// auth email copy, error/404 chrome, and the favicon/app icon — reads its name
// and mark from HERE, so a future rebrand is a single edit.
//
// The logo is a static "motion mark": a compact rally-arc glyph in the neon
// green accent (`--accent`, #3BEA7E) beside a bold "Rally" wordmark in the
// primary text color (`--text`) on the anthracite theme. It is static by
// construction, so it is inherently reduced-motion safe.
//
// ─── HOW TO SWAP THE BRAND ────────────────────────────────────────────────
// To rebrand (name, wordmark, colors), edit ONLY this file:
//   1. Name / tagline  → `BRAND_NAME`, `BRAND_TAGLINE` (updates every nav,
//      title/metadata, hero, footer, auth email, error chrome, and the
//      shareable card, which all import from here).
//   2. Colors          → `BRAND_ACCENT` / `BRAND_TEXT` / `BRAND_BG` (keep in
//      sync with the design tokens in `globals.css`; the sole token owner is
//      the builder editing globals.css).
//   3. Mark geometry   → `RALLY_GLYPH_PATHS` below (the arc/return/dot). Both
//      the in-app `<RallyGlyph />` and the wordmark render from these paths.
//
// The ONE remaining manual asset is the static favicon / app icon at
// `apps/web/src/app/icon.svg`. Next.js serves it as a raw file, so it cannot
// import from this module — it hand-mirrors the same glyph paths and colors.
// When you change the mark or accent here, update `icon.svg` to match. This is
// intentionally guarded: `brand.test.tsx` asserts `icon.svg` still uses
// `BRAND_ACCENT`/`BRAND_BG` and the exact `RALLY_GLYPH_PATHS`, so a mark change
// that forgets the favicon fails CI rather than shipping a mismatched icon.
// ──────────────────────────────────────────────────────────────────────────

import type { CSSProperties } from "react";

/** The product name shown to members everywhere. Change this to rename. */
export const BRAND_NAME = "Rally" as const;

/** Short brand promise / tagline. */
export const BRAND_TAGLINE = "Meet through movement" as const;

/** Default metadata title (name + tagline). */
export const BRAND_TITLE = `${BRAND_NAME} — ${BRAND_TAGLINE}` as const;

/**
 * Compose a page `<title>` from a member-facing page label, e.g.
 * `brandTitle("Discover events")` → "Discover events — Rally".
 */
export function brandTitle(pageLabel: string): string {
  return `${pageLabel} — ${BRAND_NAME}`;
}

// Neon accent + text colors. Mirrors the design tokens in globals.css so the
// mark can also be rendered where CSS variables are unavailable (global-error,
// the generated favicon route). Keep in sync with `--accent` / `--text`.
export const BRAND_ACCENT = "#3BEA7E" as const; // neon green (--accent)
export const BRAND_TEXT = "#F1F5F3" as const; // off-white primary text (--text)
export const BRAND_BG = "#20262B" as const; // anthracite background (--bg)

/**
 * The rally-arc glyph geometry — the single source of truth for the mark's
 * shape (a 32×32 viewBox). Both `<RallyGlyph />` and the static favicon at
 * `app/icon.svg` draw these exact paths; `brand.test.tsx` asserts the favicon
 * still matches, so the mark can't drift out of sync. Change the mark here.
 */
export const RALLY_GLYPH_PATHS = {
  /** Upward rally arc: momentum / an exchange rising and returning. */
  arc: "M5 24 C 11 8, 21 8, 27 20",
  /** Return stroke: the arc coming back — a rally is two-sided. */
  returnArc: "M27 20 C 24 26, 19 27, 14 25",
  /** The meeting point — the solid neon dot at the arc's apex-lead. */
  dot: { cx: 27, cy: 10, r: 3.4 },
  strokeWidth: 3.5,
} as const;

/**
 * The rally-arc glyph — a compact upward "rally exchange" arc with a leading
 * dot, suggesting momentum and two sides meeting through movement. Neon green
 * by default; static (reduced-motion safe). Used inline in the wordmark and,
 * cropped into a badge, as the favicon/app icon.
 *
 * `color` overrides the stroke (defaults to `currentColor` so it inherits the
 * neon accent from a wrapping element); pass an explicit color where CSS vars
 * are unavailable.
 */
export function RallyGlyph({
  size = 30,
  color = "currentColor",
  title,
  style,
}: {
  size?: number;
  color?: string;
  title?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      focusable="false"
      style={style}
    >
      {/* Upward rally arc: momentum / an exchange rising and returning. */}
      <path
        d={RALLY_GLYPH_PATHS.arc}
        stroke={color}
        strokeWidth={RALLY_GLYPH_PATHS.strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      {/* Return stroke: the arc coming back — a rally is two-sided. */}
      <path
        d={RALLY_GLYPH_PATHS.returnArc}
        stroke={color}
        strokeWidth={RALLY_GLYPH_PATHS.strokeWidth}
        strokeLinecap="round"
        fill="none"
        opacity={0.55}
      />
      {/* The meeting point — a solid neon dot at the arc's apex-lead. */}
      <circle
        cx={RALLY_GLYPH_PATHS.dot.cx}
        cy={RALLY_GLYPH_PATHS.dot.cy}
        r={RALLY_GLYPH_PATHS.dot.r}
        fill={color}
      />
    </svg>
  );
}

type WordmarkVariant = "default" | "footer";

/**
 * The Rally wordmark: the neon rally-arc glyph beside the "Rally" name in
 * `--text`. Renders inside the existing `.logo` chrome (so nav focus ring,
 * 44px target, and layout are inherited) and is accessible as a single image
 * (`role="img"` + `aria-label`) with the visible word hidden from AT to avoid
 * a double read.
 *
 * This is a presentational span — wrap it in a `<Link>`/`<a>` (page navs) or
 * use it inline (footer). Pass `variant="footer"` for the non-interactive
 * footer lockup.
 */
export function Wordmark({
  size = 30,
  variant = "default",
  className,
  decorative = false,
}: {
  size?: number;
  variant?: WordmarkVariant;
  className?: string;
  /**
   * When true, the wordmark is hidden from assistive tech (`aria-hidden`) —
   * use this inside a link/element that already carries its own accessible
   * label (e.g. a nav logo link whose `aria-label` names the destination), so
   * the brand name is not announced twice.
   */
  decorative?: boolean;
}) {
  const classes = ["logo", variant === "footer" ? "logo--footer" : null, className]
    .filter(Boolean)
    .join(" ");
  return (
    <span
      className={classes}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : `${BRAND_NAME} logo`}
      aria-hidden={decorative ? true : undefined}
    >
      <span className="logo-mark logo-mark--glyph" aria-hidden="true">
        <RallyGlyph size={Math.round(size * 0.72)} color={BRAND_ACCENT} />
      </span>
      <span className="logo-word" aria-hidden="true">
        {BRAND_NAME}
      </span>
    </span>
  );
}
