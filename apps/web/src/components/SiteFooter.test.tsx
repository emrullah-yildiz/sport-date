import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SiteFooter from "./SiteFooter";

function render() {
  return renderToStaticMarkup(<SiteFooter />);
}

describe("SiteFooter dedicated destinations", () => {
  it("links to dedicated help and legal pages without repeated claims", () => {
    const html = render();

    expect(html).toContain('href="/privacy"');
    expect(html).toContain('href="/safety"');
    expect(html).toContain('href="/trust"');
    expect(html).not.toContain("GDPR-grade");
    expect(html).not.toContain("first events in Europe");
  });
});
