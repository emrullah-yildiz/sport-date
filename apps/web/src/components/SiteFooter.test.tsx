import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SiteFooter from "./SiteFooter";

function render() {
  return renderToStaticMarkup(<SiteFooter />);
}

/**
 * Tripwire for CX-20260704-worldwide-usable-europe-first-approach.
 *
 * The shared member-surface footer tagline must not imply KeepItUp is Europe-only.
 * It carries the worldwide-open, GDPR-for-everyone tagline (owner rule 2026-07-06: no "Europe-first" anywhere).
 */
describe("SiteFooter tagline messaging", () => {
  it("uses the worldwide-open, GDPR-for-everyone tagline", () => {
    const html = render();

    expect(html).toContain("open worldwide · GDPR-grade privacy for everyone");
    expect(html).not.toContain("first events in Europe");
  });
});
