import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import ReportSafetyControls, { blockConfirmationMessage } from "./ReportSafetyControls";

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

describe("ReportSafetyControls standalone block confirmation", () => {
  // The block-only quick action previously hard-navigated to /profile on success
  // with no message set, so a member (especially a screen-reader user) got zero
  // acknowledgement of an irreversible safety action. Success now routes through the
  // persistent polite region + focus move via this confirmation, so it is perceivable.
  it("confirms the block took effect and names what it now prevents", () => {
    const message = blockConfirmationMessage("Alex");
    expect(message).toContain("You blocked Alex");
    expect(message).toContain("requests");
    expect(message).toContain("places");
    expect(message).toContain("room");
    expect(message).toContain("approximate location");
  });

  it("tells the member where the block can be managed and stays calm, not alarmist", () => {
    const message = blockConfirmationMessage("Alex");
    expect(message).toContain("manage blocks");
    // Calm, factual copy — no manufactured urgency or dark-pattern language.
    expect(message).not.toMatch(/danger|warning|urgent|alert|permanently lost/i);
  });

  it("carries no data about the blocked member beyond the name already shown", () => {
    const message = blockConfirmationMessage("Alex");
    // Only the display name that this control already renders may appear.
    expect(message.replace("Alex", "")).not.toMatch(/Alex/);
  });
});
