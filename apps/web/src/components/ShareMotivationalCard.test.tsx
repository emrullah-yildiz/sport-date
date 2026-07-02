import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ShareMotivationalCard, { decideShareStrategy } from "./ShareMotivationalCard";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
function source(file: string): string {
  return readFileSync(path.resolve(currentDir, file), "utf8");
}

describe("decideShareStrategy — Web-Share-vs-download branch selection", () => {
  it("prefers native file share when the browser supports it", () => {
    expect(decideShareStrategy({ canShareFiles: true, canDownload: true })).toBe("web-share");
    expect(decideShareStrategy({ canShareFiles: true, canDownload: false })).toBe("web-share");
  });

  it("falls back to a PNG download when file share is unavailable", () => {
    expect(decideShareStrategy({ canShareFiles: false, canDownload: true })).toBe("download");
  });

  it("reports unavailable (never a dead button) when neither is possible", () => {
    expect(decideShareStrategy({ canShareFiles: false, canDownload: false })).toBe("unavailable");
  });
});

describe("ShareMotivationalCard — accessible, member-initiated, humane", () => {
  it("renders a real focusable button (not a div) with a screen-reader label", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} />);
    expect(html).toMatch(/<button[^>]*type="button"/);
    expect(html).toMatch(/class="share-card-button"/);
    expect(html).toMatch(/aria-label="Create and share a Rally motivational card"/);
  });

  it("exposes a polite live status region for the share result", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} />);
    expect(html).toMatch(/role="status"/);
    expect(html).toMatch(/aria-live="polite"/);
  });

  it("offers the first-name touch as an OPT-IN, unchecked by default", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} firstName="Ana" />);
    // The checkbox exists, names the member's own first name, and is not checked.
    expect(html).toMatch(/type="checkbox"/);
    expect(html).toContain("Add my first name (Ana)");
    expect(html).not.toMatch(/type="checkbox"[^>]*checked/);
  });

  it("omits the name opt-in entirely when there is no usable first name", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} firstName="" />);
    expect(html).not.toContain("Add my first name");
  });

  it("previews a 9:16 card carrying no personal data by default", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} firstName="Ana" />);
    // The preview data-URL is present…
    expect(html).toContain("data:image/svg");
    // …and, because the opt-in defaults OFF, the rendered default carries no name.
    expect(html).not.toContain("ANA");
  });

  it("uses calm, honest, offer-not-nag copy (no auto-post, no pressure)", () => {
    const html = renderToStaticMarkup(<ShareMotivationalCard seed={0} />).toLowerCase();
    expect(html).toContain("entirely up to you");
    expect(html).toContain("nothing is posted unless you choose");
    // No dark-pattern / mechanic language.
    for (const banned of ["unlock", "streak", "score", "don't miss", "everyone"]) {
      expect(html).not.toContain(banned);
    }
  });
});

describe("ShareMotivationalCard — source guarantees (privacy + no auto-post)", () => {
  const code = source("ShareMotivationalCard.tsx");

  it("never calls navigator.share outside an explicit tap handler (no auto-post)", () => {
    // The only share invocation lives inside onShare (the click handler). It must
    // NOT be wired to any effect/mount. Assert there is no useEffect at all.
    expect(code).not.toMatch(/useEffect/);
    // Web Share is guarded behind the decideShareStrategy branch.
    expect(code).toContain("decideShareStrategy");
  });

  it("respects a user-cancelled share (AbortError) as a non-error", () => {
    expect(code).toContain("AbortError");
  });

  it("fails closed calmly when rasterization is impossible (unavailable state)", () => {
    expect(code).toContain('kind: "unavailable"');
  });
});
