import { readFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_TITLE,
  BRAND_ACCENT,
  BRAND_BG,
  BRAND_TEXT,
  RALLY_GLYPH_PATHS,
  RallyGlyph,
  Wordmark,
  brandTitle,
} from "@/lib/brand";

// This suite guards the single-source-of-truth mechanism (CX-20260701-brand-
// asset-swap-mechanism): the brand module is the ONE place the product name,
// wordmark, colors, and mark geometry live, and every renderer (the in-app
// glyph/wordmark, the shareable card, and the static favicon) must consume it.
// These are intentionally NOT tautologies: each asserts a *consumer* stays in
// sync with the source, so a change in one place that forgets another fails CI.

describe("brand module — the single source of truth", () => {
  it("exports the current (unchanged) brand identity", () => {
    // Post KeepItUp rename: assert the centralized values are exactly today's
    // brand so a refactor can't silently alter what members see.
    expect(BRAND_NAME).toBe("KeepItUp");
    expect(BRAND_TAGLINE).toBe("Meet through movement");
    expect(BRAND_TITLE).toBe("KeepItUp — Meet through movement");
  });

  it("derives every page title from the one name via brandTitle()", () => {
    expect(brandTitle("Discover events")).toBe("Discover events — KeepItUp");
    // Whatever the name is, the composed title ends in it — not a hard-coded string.
    expect(brandTitle("X").endsWith(`— ${BRAND_NAME}`)).toBe(true);
  });

  it("exposes the brand palette as constants (mirrors the CSS tokens)", () => {
    for (const color of [BRAND_ACCENT, BRAND_BG, BRAND_TEXT]) {
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("carries no stale pre-rebrand name anywhere in the module surface", () => {
    const source = readFileSync(brandModulePath(), "utf8");
    // Only the historical rename note may mention the old name; the exported
    // identity must never render it.
    expect(BRAND_NAME).not.toMatch(/sport ?date/i);
    expect(BRAND_TITLE).not.toMatch(/sport ?date/i);
    // Guard against re-introducing the old literal as an *exported* string.
    expect(source).not.toMatch(/export const BRAND_NAME = "Sport Date"/);
  });
});

describe("in-app mark + wordmark render from the shared geometry", () => {
  it("RallyGlyph draws the exact RALLY_GLYPH_PATHS (mark is sourced once)", () => {
    const svg = renderToStaticMarkup(<RallyGlyph color={BRAND_ACCENT} />);
    expect(svg).toContain(RALLY_GLYPH_PATHS.arc);
    expect(svg).toContain(RALLY_GLYPH_PATHS.returnArc);
    expect(svg).toContain(`cx="${RALLY_GLYPH_PATHS.dot.cx}"`);
    expect(svg).toContain(`cy="${RALLY_GLYPH_PATHS.dot.cy}"`);
    expect(svg).toContain(BRAND_ACCENT);
  });

  it("Wordmark shows the centralized BRAND_NAME beside the mark", () => {
    const svg = renderToStaticMarkup(<Wordmark />);
    expect(svg).toContain(BRAND_NAME);
    // The mark ships with the wordmark (neon accent glyph).
    expect(svg).toContain(BRAND_ACCENT);
    // Renders inside the shared `.logo` chrome so nav focus/44px/layout are inherited.
    expect(svg).toContain('class="logo');
  });

  it("Wordmark is one accessible image by default, silent when decorative", () => {
    const labelled = renderToStaticMarkup(<Wordmark />);
    expect(labelled).toContain(`aria-label="${BRAND_NAME} logo"`);
    const decorative = renderToStaticMarkup(<Wordmark decorative />);
    expect(decorative).toContain("aria-hidden");
    expect(decorative).not.toContain("aria-label=");
  });
});

describe("favicon (app/icon.svg) — the ONE manual asset stays in sync", () => {
  // The favicon can't import from the module (Next serves it as a raw file), so
  // it hand-mirrors the mark. This proves the documented swap point is real:
  // change the mark/colors in brand.tsx and forget icon.svg → this test fails.
  const favicon = readFileSync(iconSvgPath(), "utf8");

  it("uses the brand background + accent (no drifted colors)", () => {
    expect(favicon).toContain(BRAND_BG);
    expect(favicon).toContain(BRAND_ACCENT);
  });

  it("draws the exact shared glyph paths and dot", () => {
    expect(favicon).toContain(RALLY_GLYPH_PATHS.arc);
    expect(favicon).toContain(RALLY_GLYPH_PATHS.returnArc);
    expect(favicon).toContain(`cx="${RALLY_GLYPH_PATHS.dot.cx}"`);
    expect(favicon).toContain(`cy="${RALLY_GLYPH_PATHS.dot.cy}"`);
    expect(favicon).toContain(`r="${RALLY_GLYPH_PATHS.dot.r}"`);
  });

  it("labels itself with the centralized brand name", () => {
    expect(favicon).toContain(`aria-label="${BRAND_NAME}"`);
  });
});

function iconSvgPath(): string {
  return path.resolve(__dirname, "..", "app", "icon.svg");
}

function brandModulePath(): string {
  return path.resolve(__dirname, "brand.tsx");
}
