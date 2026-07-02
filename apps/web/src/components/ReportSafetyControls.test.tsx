import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ReportSafetyControls from "./ReportSafetyControls";

function render() {
  return renderToStaticMarkup(
    <ReportSafetyControls eventId="event-1" subjectUserId="user-2" subjectName="Alex" />,
  );
}

describe("ReportSafetyControls submit-result announcement", () => {
  it("mounts a persistent polite status region before any submit", () => {
    const html = render();
    // Present (and empty) at idle so a later content change is announced,
    // rather than the paragraph appearing already-populated.
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("mounts a persistent assertive region so a failed report is announced firmly", () => {
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("keeps the emergency reminder reachable alongside the live regions", () => {
    const html = render();
    expect(html).toContain("contact local emergency services");
  });

  it("exposes the in-flight state programmatically via aria-busy on submit", () => {
    const html = render();
    expect(html).toContain("aria-busy");
  });
});
