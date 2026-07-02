import { describe, expect, it } from "vitest";

import { BRAND_NAME } from "@/lib/brand";
import {
  CARD_WIDTH,
  CARD_HEIGHT,
  MOTIVATIONAL_LINES,
  BANNED_CLAIM_PATTERNS,
  selectMotivationalLine,
  sanitizeFirstName,
  wrapLine,
  buildCardSvg,
  auditCardCopy,
} from "@/lib/motivational-card";

describe("motivational card — curated copy is honest", () => {
  it("every curated line is free of banned/unprovable claims and mechanics", () => {
    for (const line of MOTIVATIONAL_LINES) {
      expect(auditCardCopy(line), `"${line}" contained a banned claim`).toEqual([]);
    }
  });

  it("banned patterns actually catch the claims they name (guard is not a no-op)", () => {
    expect(auditCardCopy("the safest sports app").length).toBeGreaterThan(0);
    expect(auditCardCopy("verified members only").length).toBeGreaterThan(0);
    expect(auditCardCopy("keep your streak alive").length).toBeGreaterThan(0);
    expect(auditCardCopy("your score is 4").length).toBeGreaterThan(0);
    expect(BANNED_CLAIM_PATTERNS.length).toBeGreaterThan(0);
  });

  it("no curated line embeds a number/stat/count", () => {
    for (const line of MOTIVATIONAL_LINES) {
      expect(line).not.toMatch(/\d/);
    }
  });
});

describe("motivational card — deterministic curated selection", () => {
  it("selects a real curated line for any integer seed", () => {
    for (let seed = -5; seed <= 20; seed++) {
      expect(MOTIVATIONAL_LINES).toContain(selectMotivationalLine(seed));
    }
  });

  it("is deterministic — same seed → same line", () => {
    expect(selectMotivationalLine(3)).toBe(selectMotivationalLine(3));
    expect(selectMotivationalLine(3)).toBe(selectMotivationalLine(3 + MOTIVATIONAL_LINES.length));
  });

  it("handles non-finite seeds without throwing", () => {
    expect(MOTIVATIONAL_LINES).toContain(selectMotivationalLine(Number.NaN));
    expect(MOTIVATIONAL_LINES).toContain(selectMotivationalLine(Infinity));
  });
});

describe("motivational card — first name is opt-in and sanitized (no PII leak vector)", () => {
  it("keeps a plain first name", () => {
    expect(sanitizeFirstName("Ana")).toBe("Ana");
    expect(sanitizeFirstName("  Ana-Maria ")).toBe("Ana-Maria");
    expect(sanitizeFirstName("O'Neil")).toBe("O'Neil");
  });

  it("strips emails, handles, urls, and other non-name payloads", () => {
    expect(sanitizeFirstName("ana@example.com")).toBe("anaexamplecom");
    expect(sanitizeFirstName("@ana_official")).toBe("anaofficial");
    expect(sanitizeFirstName("https://x.com/ana")).not.toContain("/");
    expect(sanitizeFirstName("")).toBe("");
    expect(sanitizeFirstName(null)).toBe("");
    expect(sanitizeFirstName(undefined)).toBe("");
  });

  it("caps length defensively", () => {
    expect(sanitizeFirstName("a".repeat(200)).length).toBeLessThanOrEqual(24);
  });
});

describe("motivational card — line wrapping stays within the frame", () => {
  it("never exceeds the max number of rows", () => {
    const rows = wrapLine("A very long motivational sentence that has quite a few words in it indeed", 20, 5);
    expect(rows.length).toBeLessThanOrEqual(5);
  });

  it("preserves the words (in order) for a normal line", () => {
    const line = MOTIVATIONAL_LINES[0];
    const rows = wrapLine(line);
    expect(rows.join(" ").replace(/\s+/g, " ")).toBe(line.replace(/\s+/g, " "));
  });
});

// Extract only the human-visible text drawn onto the card (the contents of every
// <text> element), so PII/stat assertions target the copy — not the SVG's own
// structural attributes (e.g. the xmlns URL, or "lat" inside "translate").
function visibleCardText(svg: string): string {
  return [...svg.matchAll(/<text[^>]*>([^<]*)<\/text>/g)].map((m) => m[1]).join(" ");
}

describe("motivational card SVG — correct aspect ratio, brand, and NO PII/stats", () => {
  const svg = buildCardSvg({ line: selectMotivationalLine(0) });

  it("is a 9:16 Instagram-Story canvas (1080×1920)", () => {
    expect(CARD_WIDTH / CARD_HEIGHT).toBeCloseTo(9 / 16, 5);
    expect(svg).toContain(`width="${CARD_WIDTH}"`);
    expect(svg).toContain(`height="${CARD_HEIGHT}"`);
    expect(svg).toContain(`viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"`);
  });

  it("carries the centralized brand name (updates if the brand changes)", () => {
    expect(svg).toContain(BRAND_NAME);
  });

  it("draws the rally-arc glyph + neon accent from the brand tokens", () => {
    expect(svg).toContain("#3BEA7E"); // BRAND_ACCENT
    expect(svg.toLowerCase()).toContain("<circle"); // the glyph's meeting-point dot
  });

  it("contains no personal data in the visible copy when no first name is opted in", () => {
    const text = visibleCardText(svg);
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\bhttps?:\/\//);
    // No digits in the visible copy → no count/score/coordinate.
    expect(text).not.toMatch(/\d/);
  });

  it("includes the member's OWN first name only when explicitly provided (opt-in)", () => {
    const withName = buildCardSvg({ line: selectMotivationalLine(0), firstName: "Ana" });
    expect(visibleCardText(withName)).toContain("ANA");
    // …and still no other identifier types.
    expect(visibleCardText(withName)).not.toMatch(/@/);
  });

  it("never embeds a location, event title, other member, or a count/score/stat", () => {
    // The payload type has no such fields; assert the rendered VISIBLE copy too.
    const text = visibleCardText(buildCardSvg({ line: selectMotivationalLine(2), firstName: "Ana" })).toLowerCase();
    for (const banned of ["street", "avenue", "latitude", "longitude", "score", "streak", "rank", "leaderboard"]) {
      expect(text).not.toContain(banned);
    }
    // No digits in the visible copy → no count/coordinate.
    expect(text).not.toMatch(/\d/);
  });

  it("escapes any special characters so the SVG stays well-formed", () => {
    const withApostrophe = buildCardSvg({ line: "You & the crew showed <up>", firstName: "O'Neil" });
    expect(withApostrophe).toContain("&amp;");
    expect(withApostrophe).toContain("&lt;up&gt;");
    expect(withApostrophe).toContain("O&apos;NEIL");
  });
});
