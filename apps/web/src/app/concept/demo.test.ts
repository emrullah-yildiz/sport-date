import { describe, expect, it } from "vitest";
import { meetingDetail, transition, type Stage } from "./demo";

describe("concept preview privacy and consent sequence", () => {
  it("never exposes the fictional meeting point before acceptance", () => {
    for (const stage of ["discover", "details", "requested", "review"] as Stage[]) {
      expect(meetingDetail(stage)).toBeNull();
    }
    expect(meetingDetail("accepted")).toContain("Fictional location");
  });
  it("requires explicit request and host review before simulated acceptance", () => {
    expect(transition("discover", "accept")).toBe("discover");
    expect(transition("details", "accept")).toBe("details");
    expect(transition("requested", "accept")).toBe("requested");
    let stage: Stage = "discover";
    stage = transition(stage, "details");
    stage = transition(stage, "request");
    expect(stage).toBe("requested");
    stage = transition(stage, "review");
    stage = transition(stage, "accept");
    expect(stage).toBe("accepted");
  });
  it("cancellation or selection reset removes accepted details in every stage", () => {
    for (const stage of ["discover", "details", "requested", "review", "accepted"] as Stage[]) {
      const reset = transition(stage, "reset");
      expect(reset).toBe("discover");
      expect(meetingDetail(reset)).toBeNull();
    }
  });
});
