import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import SafetyAppealForm from "./SafetyAppealForm";

function render() {
  return renderToStaticMarkup(<SafetyAppealForm reportId="report-1" />);
}

describe("SafetyAppealForm submit-result announcement", () => {
  it("mounts a persistent polite status region before any submit", () => {
    const html = render();
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  });

  it("mounts a persistent assertive region so a failed appeal is announced firmly", () => {
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-live="assertive"');
  });

  it("exposes the in-flight state programmatically via aria-busy on submit", () => {
    const html = render();
    expect(html).toContain("aria-busy");
  });
});
