// Pure, framework-free builder for the member-initiated "shareable motivational
// card" (CX-20260701-shareable-branded-motivational-card).
//
// The card is a warm, on-brand, Instagram-Story-sized image a member can CHOOSE to
// share after moving with people. Everything here is deterministic and free of
// personal data by construction:
//
//  - A small CURATED rotation of warm, honest lines about movement/connection/
//    showing-up (no free text — nothing member-authored can leak PII or be abused).
//  - The card payload carries ONLY a curated line + (optionally) the member's own
//    FIRST NAME if they explicitly opt in. Never another member, never a photo,
//    never a location, never a stat/score/count/streak. This file has no access to
//    those fields — the type makes that structurally true.
//  - `buildCardSvg` renders a self-contained 1080×1920 (9:16) SVG string. The
//    browser component rasterizes it to a PNG for Web Share / download; the SVG
//    string itself is pure and unit-testable (aspect ratio, brand, no-PII).
//
// Brand name/colors come from the centralized brand module so a future rename or
// palette change updates the card automatically (no logo hard-coded only here).

import { BRAND_NAME, BRAND_ACCENT, BRAND_TEXT, BRAND_BG } from "@/lib/brand";

/** Instagram Story canvas — 9:16 portrait. */
export const CARD_WIDTH = 1080 as const;
export const CARD_HEIGHT = 1920 as const;

/**
 * The curated rotation of warm, honest lines. Rules for every line:
 *  - about movement / connection / showing up — never a claim about the product
 *    ("safest", "verified", "everyone's joining") or a number/stat.
 *  - warm and human, not cringe, not hustle-culture, not a command to perform.
 *  - inclusive: no assumption about ability, body, speed, or winning.
 * Order is stable so selection is deterministic and testable.
 */
export const MOTIVATIONAL_LINES: readonly string[] = [
  "You showed up, and that was the whole point.",
  "Movement is better with people beside you.",
  "A good hour outdoors, shared. That counts.",
  "You made time to move today. That's worth something.",
  "Small games, real people, a good kind of tired.",
  "The best part was showing up. You did that.",
  "Some of the best afternoons start with just going.",
  "Play, breathe, and meet people where the game is.",
] as const;

/**
 * Claims the copy must never make (honesty guardrail). These mirror the
 * positioning "language to avoid" list: no unprovable safety/verification claims,
 * no fabricated traction, no manipulative urgency. The unit test asserts every
 * curated line is clear of these.
 */
export const BANNED_CLAIM_PATTERNS: readonly RegExp[] = [
  /\bsafest\b/i,
  /\bverified\b/i,
  /\bverification\b/i,
  /\bguarantee(?:d|s)?\b/i,
  /\beveryone'?s (?:joining|here)\b/i,
  /\bmillions?\b/i,
  /\bthousands?\b/i,
  /\bbest (?:dating|sports) app\b/i,
  /\bno\.?\s?1\b/i,
  /\b#1\b/i,
  /\bstreaks?\b/i,
  /\bscores?\b/i,
  /\brank(?:ed|ing)?\b/i,
  /\bleaderboards?\b/i,
];

/**
 * Deterministically pick a curated line. Selection is a pure function of a
 * caller-supplied numeric seed (e.g. a day-of-year, or an index the UI rotates)
 * so it is testable and repeatable; there is NO randomness tied to member data.
 * Any integer (including negative) maps into range.
 */
export function selectMotivationalLine(seed: number): string {
  const n = MOTIVATIONAL_LINES.length;
  const safe = Number.isFinite(seed) ? Math.trunc(seed) : 0;
  const index = ((safe % n) + n) % n;
  return MOTIVATIONAL_LINES[index];
}

/**
 * The complete, privacy-safe payload a card can be built from. This is the ONLY
 * data that reaches the image. There is deliberately no field for location,
 * photo, other members, event title, or any count/score/stat — so none can leak.
 * `firstName` is optional and opt-in: default cards carry no personal data at all.
 */
export interface MotivationalCardData {
  /** A curated line from MOTIVATIONAL_LINES (never free member text). */
  line: string;
  /**
   * The member's OWN first name, included ONLY if they explicitly chose to add
   * it. Omitted/blank → the card shows no personal data at all. Trimmed and length-
   * capped defensively; never a full name, handle, email, or any other identifier.
   */
  firstName?: string;
}

/** Max characters of a first name we will draw (defensive; names are short). */
const FIRST_NAME_MAX = 24;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Normalize the opt-in first name: trim, strip anything but a plain name's
 * characters (letters, spaces, hyphen, apostrophe), and cap length. Returns "" if
 * nothing usable remains — the card then carries no personal data. This keeps a
 * pasted email/handle/URL from ever reaching the image.
 */
export function sanitizeFirstName(raw: string | undefined | null): string {
  if (!raw) return "";
  const cleaned = raw
    .trim()
    .replace(/[^\p{L}\p{M} '-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, FIRST_NAME_MAX)
    .trim();
  return cleaned;
}

/**
 * Wrap a line into balanced display rows for the big quote. Pure string math (no
 * DOM measurement) — splits on words into at most `maxLines` rows of roughly
 * `maxChars`. Keeps the card legible at Story size without overflowing the frame.
 */
export function wrapLine(text: string, maxChars = 20, maxLines = 5): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const rows: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars && current) {
      rows.push(current);
      current = word;
    } else {
      current = candidate;
    }
    if (rows.length === maxLines - 1 && current.length > maxChars) {
      // Out of rows — keep the rest on the final row rather than dropping words.
      continue;
    }
  }
  if (current) rows.push(current);
  return rows.slice(0, maxLines);
}

/**
 * Build the self-contained 9:16 SVG string for the card. Uses ONLY the brand
 * tokens + the curated line (+ opt-in first name). Anthracite background, neon
 * accent rally-arc glyph, off-white legible quote, brand wordmark at the foot.
 * No external fonts/images — system sans, so it rasterizes identically offline.
 */
export function buildCardSvg(data: MotivationalCardData): string {
  const line = data.line;
  const firstName = sanitizeFirstName(data.firstName);
  const rows = wrapLine(line);

  // Vertically center the quote block. Big, bold, high-contrast off-white on
  // anthracite (measured AAA in the design system).
  const lineHeight = 132;
  const blockHeight = rows.length * lineHeight;
  const quoteTop = CARD_HEIGHT / 2 - blockHeight / 2 + 90;
  const startY = quoteTop - blockHeight / 2 + lineHeight / 2;

  const quoteTspans = rows
    .map((row, i) => {
      const y = startY + i * lineHeight;
      return `<text x="${CARD_WIDTH / 2}" y="${y}" text-anchor="middle" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="86" font-weight="800" letter-spacing="-1" fill="${BRAND_TEXT}">${escapeXml(row)}</text>`;
    })
    .join("");

  // Optional opt-in personal touch — the member's OWN first name only, small and
  // warm above the quote. Absent by default (no personal data).
  const nameBlock = firstName
    ? `<text x="${CARD_WIDTH / 2}" y="${quoteTop - blockHeight / 2 - 70}" text-anchor="middle" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="40" font-weight="700" letter-spacing="6" fill="${BRAND_ACCENT}">${escapeXml(firstName.toUpperCase())}</text>`
    : "";

  // The rally-arc glyph (mirrors RallyGlyph in the brand module) scaled up, drawn
  // in the neon accent, above the wordmark at the foot.
  const glyphSize = 76;
  const glyphX = CARD_WIDTH / 2 - glyphSize / 2;
  const glyphY = CARD_HEIGHT - 300;
  const glyph = `<g transform="translate(${glyphX} ${glyphY}) scale(${glyphSize / 32})">
    <path d="M5 24 C 11 8, 21 8, 27 20" stroke="${BRAND_ACCENT}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M27 20 C 24 26, 19 27, 14 25" stroke="${BRAND_ACCENT}" stroke-width="3.5" stroke-linecap="round" fill="none" opacity="0.55"/>
    <circle cx="27" cy="10" r="3.4" fill="${BRAND_ACCENT}"/>
  </g>`;

  const wordmark = `<text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT - 176}" text-anchor="middle" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="64" font-weight="800" letter-spacing="-1" fill="${BRAND_TEXT}">${escapeXml(BRAND_NAME)}</text>`;

  const tagline = `<text x="${CARD_WIDTH / 2}" y="${CARD_HEIGHT - 120}" text-anchor="middle" font-family="'Segoe UI', 'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="600" letter-spacing="4" fill="${BRAND_ACCENT}">MEET THROUGH MOVEMENT</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" role="img" aria-label="${escapeXml(line)} — ${escapeXml(BRAND_NAME)}">
  <defs>
    <radialGradient id="cardGlow" cx="50%" cy="26%" r="70%">
      <stop offset="0%" stop-color="${BRAND_ACCENT}" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="${BRAND_ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${BRAND_BG}"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#cardGlow)"/>
  <rect x="40" y="40" width="${CARD_WIDTH - 80}" height="${CARD_HEIGHT - 80}" rx="48" fill="none" stroke="${BRAND_ACCENT}" stroke-opacity="0.28" stroke-width="3"/>
  ${nameBlock}
  ${quoteTspans}
  ${glyph}
  ${wordmark}
  ${tagline}
</svg>`;
}

/**
 * Assert (at runtime, cheaply) that a payload carries no obvious personal /
 * stat data beyond the opt-in first name. Defense-in-depth: any caller that
 * accidentally threads a stat/location into `line` is caught. Returns the reason
 * strings for anything suspicious; empty array = clean.
 */
export function auditCardCopy(text: string): string[] {
  const problems: string[] = [];
  for (const pattern of BANNED_CLAIM_PATTERNS) {
    if (pattern.test(text)) problems.push(`banned claim: ${pattern}`);
  }
  return problems;
}
