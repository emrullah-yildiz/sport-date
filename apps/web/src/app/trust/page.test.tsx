import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import TrustPage from "./page";

// The trust page is a plain server component with no async work; render its
// element tree to static markup and assert the member-visible trust copy.
function render() {
  return renderToStaticMarkup(<TrustPage />);
}

/**
 * Tripwire for CX-20260704-worldwide-usable-europe-first-approach.
 *
 * The trust page carries the reusable "Where can I use KeepItUp?" answer: usable
 * worldwide, Europe-first as our privacy/safety APPROACH (not a geo limit), events
 * are user-organized, availability depends on hosts.
 */
describe("TrustPage — where can I use KeepItUp", () => {
  it("answers with the worldwide-usable, GDPR-for-everyone framing", () => {
    const html = render();

    expect(html).toContain("Where can I use KeepItUp?");
    expect(html).toContain("can be used worldwide to organize and join sports events");
    expect(html).toContain("participation is not geographically restricted");
    // Europe-first is preserved as the standard/approach, explicitly not a location limit.
    expect(html).toContain("GDPR-grade privacy, safety standards, and community care");
    expect(html).not.toMatch(/Europe[- ]first/i);
    expect(html).toContain("wherever you play");
    // No overclaim of operating everywhere: events are member-organized.
    expect(html).toContain("Events are organized by members");
    expect(html).toContain("Local availability depends on hosts");
  });

  it("does not state or imply KeepItUp is usable only in Europe", () => {
    const html = render();

    expect(html).not.toMatch(/only in Europe/i);
    expect(html).not.toContain("first events in Europe");
  });
});
