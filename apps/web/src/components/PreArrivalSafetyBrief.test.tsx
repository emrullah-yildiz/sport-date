import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import PreArrivalSafetyBrief, {
  NEAR_ARRIVAL_WINDOW_MS,
  preArrivalEyebrow,
} from "./PreArrivalSafetyBrief";

const BASE = "2026-07-01T12:00:00.000Z";
const NOW = new Date(BASE).getTime();

function render() {
  return renderToStaticMarkup(
    <PreArrivalSafetyBrief
      eventId="event-1"
      startsAt={BASE}
      safetyControlsId="room-people"
      leaveControlId="room-leave"
    />,
  );
}

describe("preArrivalEyebrow", () => {
  it("frames a meeting more than a day away calmly, not urgently", () => {
    const far = new Date(NOW + NEAR_ARRIVAL_WINDOW_MS + 60_000).toISOString();
    expect(preArrivalEyebrow(far, NOW)).toBe("Meeting safely");
  });

  it("nudges gently when the meeting is within the arrival window", () => {
    const soon = new Date(NOW + 60 * 60 * 1000).toISOString();
    expect(preArrivalEyebrow(soon, NOW)).toBe("Before you head out");
  });

  it("acknowledges the day-of moment", () => {
    const started = new Date(NOW - 60_000).toISOString();
    expect(preArrivalEyebrow(started, NOW)).toBe("You're meeting today");
  });

  it("falls back safely on an unparseable date", () => {
    expect(preArrivalEyebrow("not-a-date", NOW)).toBe("Meeting safely");
  });
});

describe("PreArrivalSafetyBrief", () => {
  it("is a labelled region a screen reader can find and name", () => {
    const html = render();
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="prearrival-brief-title"');
    expect(html).toContain('id="prearrival-brief-title"');
  });

  it("surfaces the four calm safety practices", () => {
    const html = render();
    expect(html).toContain("Meet in the public spot first");
    expect(html).toContain("Tell a friend where you");
    expect(html).toContain("You can leave any time");
    expect(html).toContain("Report, block, or leave from here");
  });

  it("links to the report/block and leave controls already on the page", () => {
    const html = render();
    expect(html).toContain('href="#room-people"');
    expect(html).toContain('href="#room-leave"');
  });

  it("states the brief is always free and makes no unprovable safety claims", () => {
    const html = render().toLowerCase();
    expect(html).toContain("always-free");
    // Never claim things we cannot prove.
    expect(html).not.toContain("verified");
    expect(html).not.toContain("guaranteed safe");
  });

  it("offers a dismiss control with an accessible label", () => {
    const html = render();
    expect(html).toContain('aria-label="Dismiss the meeting-safely note"');
  });

  it("keeps emergency guidance without inventing new capabilities", () => {
    const html = render();
    expect(html).toContain("contact local emergency services");
  });
});
