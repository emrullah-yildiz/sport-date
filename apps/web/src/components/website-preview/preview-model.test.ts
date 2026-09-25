import { describe, expect, it } from "vitest";
import { draftToGame, gameDraftErrors, initialGameDraft, joinOutcome, maySeeMeetingPoint } from "./preview-model";

describe("local website journeys", () => {
  it("requires authentication, respects capacity and keeps requests pending", () => {
    expect(joinOutcome(false, 2, false)).toBe("signin");
    expect(joinOutcome(true, 2, false)).toBe("pending");
    expect(joinOutcome(true, 2, false, "pending")).toBe("pending");
    expect(joinOutcome(true, 2, false, "accepted")).toBe("accepted");
    expect(joinOutcome(true, 0, false)).toBe("full");
    expect(joinOutcome(true, 2, true)).toBe("hosting");
  });
  it("shows meeting points only to a signed-in host or accepted member", () => {
    expect(maySeeMeetingPoint(false, true, "accepted")).toBe(false);
    expect(maySeeMeetingPoint(true, false, "pending")).toBe(false);
    expect(maySeeMeetingPoint(true, false)).toBe(false);
    expect(maySeeMeetingPoint(true, false, "accepted")).toBe(true);
    expect(maySeeMeetingPoint(true, true)).toBe(true);
  });
  it("validates a complete draft and excludes the private meeting point", () => {
    expect(gameDraftErrors(initialGameDraft, 2)).toEqual({});
    const game = draftToGame(initialGameDraft, "hosted-test");
    expect(game).toMatchObject({ id: "hosted-test", places: 3, sport: "Tennis", period: "morning" });
    expect(game).not.toHaveProperty("meetingPoint");
    expect(JSON.stringify(game)).not.toContain(initialGameDraft.meetingPoint);
  });
  it("rejects invalid dates, capacity and mismatched destination/area", () => {
    const errors = gameDraftErrors({ ...initialGameDraft, date: "2026-02-30", places: "0", destinationId: "lisbon" }, 2);
    expect(errors).toHaveProperty("date"); expect(errors).toHaveProperty("places"); expect(errors).toHaveProperty("areaId");
    expect(() => draftToGame({ ...initialGameDraft, title: "" }, "bad")).toThrow();
    expect(gameDraftErrors({ ...initialGameDraft, time: "25:00", places: "1.5", meetingPoint: "" }, 1)).toMatchObject({ time: expect.any(String), places: expect.any(String), meetingPoint: expect.any(String) });
  });
});
