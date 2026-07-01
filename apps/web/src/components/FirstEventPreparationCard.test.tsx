import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import FirstEventPreparationCard, {
  describeWelcomedLevels,
  shouldShowFirstEventPreparation,
  whatToBringFor,
} from "./FirstEventPreparationCard";

function render(overrides: Partial<Parameters<typeof FirstEventPreparationCard>[0]> = {}) {
  return renderToStaticMarkup(
    <FirstEventPreparationCard
      sport="Tennis"
      experienceLevels={["beginner", "intermediate"]}
      startsAtLabel="Friday, 10 July, 18:00"
      areaLabel="Herastrau park"
      hostFirstName="Radu"
      safetyBriefId="prearrival-brief"
      {...overrides}
    />,
  );
}

describe("shouldShowFirstEventPreparation (the gate)", () => {
  const base = { isHost: false, hasEnded: false, viewerIsFirstTimer: true, viewerRequestStatus: "accepted" };

  it("shows for an accepted first-timer whose event has not ended", () => {
    expect(shouldShowFirstEventPreparation(base)).toBe(true);
  });

  it("hides for a repeat attendee (not their first event)", () => {
    expect(shouldShowFirstEventPreparation({ ...base, viewerIsFirstTimer: false })).toBe(false);
  });

  it("hides for the host", () => {
    expect(shouldShowFirstEventPreparation({ ...base, isHost: true })).toBe(false);
  });

  it("hides once the event has ended", () => {
    expect(shouldShowFirstEventPreparation({ ...base, hasEnded: true })).toBe(false);
  });

  it("hides for a pending, declined, cancelled, or missing request", () => {
    for (const status of ["pending", "declined", "cancelled", null, undefined]) {
      expect(shouldShowFirstEventPreparation({ ...base, viewerRequestStatus: status })).toBe(false);
    }
  });
});

describe("describeWelcomedLevels", () => {
  it("describes the floor honestly when beginners are welcome", () => {
    expect(describeWelcomedLevels(["beginner", "intermediate"])).toContain("Beginners are welcome");
  });

  it("describes an intermediate floor calmly", () => {
    expect(describeWelcomedLevels(["intermediate", "advanced"])).toContain("relaxed intermediate");
  });

  it("describes an advanced-only game plainly", () => {
    expect(describeWelcomedLevels(["advanced"])).toContain("advanced-level");
  });

  it("degrades to a calm generic line when the host filled in no levels", () => {
    expect(describeWelcomedLevels([])).toContain("all levels are welcome");
    expect(describeWelcomedLevels(["something-odd"])).toContain("all levels are welcome");
  });
});

describe("whatToBringFor", () => {
  it("gives a sport-specific, non-overclaiming note when we know the sport", () => {
    expect(whatToBringFor("Tennis")).toContain("racket");
    expect(whatToBringFor("running")).toContain("running shoes");
  });

  it("falls back to a calm generic note for an unknown sport", () => {
    const note = whatToBringFor("Kabaddi");
    expect(note).toContain("Comfortable clothes");
    expect(note).toContain("ask the group");
  });

  it("never invents host-provided equipment or claims", () => {
    for (const sport of ["Tennis", "Running", "Football", "Kabaddi"]) {
      const note = whatToBringFor(sport).toLowerCase();
      expect(note).not.toContain("provided");
      expect(note).not.toContain("free rental");
    }
  });
});

describe("FirstEventPreparationCard rendering", () => {
  it("is a labelled region a screen reader can find and name", () => {
    const html = render();
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-labelledby="first-event-prep-title"');
    expect(html).toContain('id="first-event-prep-title"');
  });

  it("shows the four practical facts and a calm three-step flow", () => {
    const html = render();
    expect(html).toContain("What you&#x27;re joining");
    expect(html).toContain("When");
    expect(html).toContain("Roughly where");
    expect(html).toContain("What to bring");
    expect(html).toContain("Meet in the public spot");
    expect(html).toContain("You can leave any time");
  });

  it("shows the approximate area but never a precise venue string it was not given", () => {
    const html = render({ areaLabel: "Herastrau park" });
    expect(html).toContain("Herastrau park");
    // The precise venue/address is not a prop here — the card cannot leak it.
    expect(html).not.toContain("Court 3");
  });

  it("degrades gracefully when the host left the approximate area blank", () => {
    const html = render({ areaLabel: "   " });
    expect(html).toContain("Shown in the room below");
  });

  it("points at the on-page safety and leaving controls instead of repeating them", () => {
    const html = render({ safetyBriefId: "prearrival-brief" });
    expect(html).toContain('href="#prearrival-brief"');
  });

  it("names the host when known and stays graceful when not", () => {
    expect(render({ hostFirstName: "Radu" })).toContain("Radu");
    expect(render({ hostFirstName: "" })).toContain("the host");
  });

  it("makes no unprovable safety claims", () => {
    const html = render().toLowerCase();
    expect(html).not.toContain("verified");
    expect(html).not.toContain("guaranteed safe");
    expect(html).not.toContain("background check");
  });
});
