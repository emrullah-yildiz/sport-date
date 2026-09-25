import { describe, expect, it } from "vitest";
import { awardSportPower, getSportPower, type SportPowerEvent, type SportPowerFeedback } from "./sport-power";

const event: SportPowerEvent = {
  id: "rally", sport: "Tennis", completed: true,
  attendees: ["alex", "mara", "sam"].map(id => ({ id, accepted: true, attended: true })),
};
const feedback: SportPowerFeedback = {
  eventId: "rally", fromUserId: "mara", toUserId: "alex", positive: true,
  blocked: false, released: true, finalized: true,
};

describe("local sport power qualification", () => {
  it("awards one point in the completed event's sport without storing feedback details", () => {
    const result = awardSportPower([], event, feedback);
    expect(result.awarded).toBe(true);
    expect(result.awards).toEqual([{ eventId: "rally", recipientId: "alex", sport: "Tennis" }]);
    expect(getSportPower(result.awards, "alex")).toEqual({ Tennis: 1, Running: 0, Padel: 0 });
    expect(getSportPower(result.awards, "mara")).toEqual({ Tennis: 0, Running: 0, Padel: 0 });
  });

  it.each([
    { released: false }, { finalized: false }, { blocked: true },
    { fromUserId: "alex" }, { fromUserId: "stranger" }, { toUserId: "stranger" },
    { eventId: "different-game" },
  ])("does not award ineligible feedback %j", patch => {
    const result = awardSportPower([], event, { ...feedback, ...patch });
    expect(result).toEqual({ awards: [], awarded: false, reason: "ineligible" });
  });

  it("does not reward an uncompleted game or either person's unqualified attendance", () => {
    expect(awardSportPower([], { ...event, completed: false }, feedback).awarded).toBe(false);
    for (const id of ["alex", "mara"]) {
      for (const gate of ["accepted", "attended"] as const) {
        const attendees = event.attendees.map(person => person.id === id ? { ...person, [gate]: false } : person);
        expect(awardSportPower([], { ...event, attendees }, feedback).awarded).toBe(false);
      }
    }
  });

  it("does not turn a neutral signal into a point", () => {
    expect(awardSportPower([], event, { ...feedback, positive: false })).toEqual({ awards: [], awarded: false, reason: "not-positive" });
  });

  it("cannot farm points by resubmitting, editing a signal, or adding another positive peer", () => {
    const first = awardSportPower([], event, feedback);
    const again = awardSportPower(first.awards, event, feedback);
    const anotherPeer = awardSportPower(again.awards, event, { ...feedback, fromUserId: "sam" });
    expect(again.reason).toBe("duplicate");
    expect(anotherPeer.reason).toBe("duplicate");
    expect(anotherPeer.awards).toBe(first.awards);
    const neutral = awardSportPower(first.awards, event, { ...feedback, positive: false });
    expect(awardSportPower(neutral.awards, event, feedback).reason).toBe("duplicate");
    expect(getSportPower([...first.awards, ...first.awards], "alex").Tennis).toBe(1);
  });

  it("counts later qualified games separately and only for their sport and recipient", () => {
    const first = awardSportPower([], event, feedback);
    const run = awardSportPower(first.awards, { ...event, id: "run", sport: "Running" }, { ...feedback, eventId: "run" });
    const mara = awardSportPower(run.awards, event, { ...feedback, fromUserId: "alex", toUserId: "mara" });
    expect(getSportPower(mara.awards, "alex")).toEqual({ Tennis: 1, Running: 1, Padel: 0 });
    expect(getSportPower(mara.awards, "mara")).toEqual({ Tennis: 1, Running: 0, Padel: 0 });
  });
});
