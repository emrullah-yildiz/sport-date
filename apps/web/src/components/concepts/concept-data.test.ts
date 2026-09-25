import { describe, expect, it } from "vitest";
import { cyclePhoto, nextRequestState } from "./concept-data";

describe("fictional request walkthrough", () => {
  it("does not confuse sending a request with acceptance or attendance", () => {
    expect(nextRequestState("idle", "request")).toBe("pending");
    expect(nextRequestState("idle", "accept")).toBe("idle");
    expect(nextRequestState("pending", "attend")).toBe("pending");
    expect(nextRequestState("pending", "accept")).toBe("accepted");
    expect(nextRequestState("accepted", "attend")).toBe("played");
  });
  it("cannot advance an attended event twice or erase it by requesting again", () => {
    expect(nextRequestState("played", "attend")).toBe("played");
    expect(nextRequestState("played", "request")).toBe("played");
    expect(nextRequestState("played", "reset")).toBe("idle");
  });
  it("cycles a photo gallery in both directions and tolerates missing photos", () => {
    expect(cyclePhoto(0, -1, 3)).toBe(2);
    expect(cyclePhoto(2, 1, 3)).toBe(0);
    expect(cyclePhoto(0, 1, 0)).toBe(0);
  });
});
