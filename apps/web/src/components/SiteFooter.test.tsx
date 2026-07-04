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
 * It carries the worldwide-usable, Europe-first-on-privacy reframing.
 */
describe("SiteFooter tagline messaging", () => {
  it("uses the worldwide-usable, Europe-first-on-privacy tagline", () => {
    const html = render();

    expect(html).toContain("usable worldwide, Europe-first on privacy");
    expect(html).not.toContain("first events in Europe");
  });
});
